"""Analytics, Evaluation, and Ablation Study API endpoints."""
from fastapi import APIRouter, Depends
from typing import Dict, Any, List

from ..ml.features import FEATURE_NAMES
from ..ml.simulator import generate_training_dataset
from ..ml.classifier import BlockageClassifier
from ..ml.anomaly_model import AnomalyModel
from ..ml.evaluation import (
    evaluate_classifier, evaluate_anomaly_separation, get_demo_evaluation_metrics,
)
from ..services.ml_engine import MLEngine, get_ml_engine

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Evaluation"])


@router.get("/feature-importance")
async def get_feature_importance(
    ml_engine: MLEngine = Depends(get_ml_engine),
) -> Dict[str, float]:
    """Get Random Forest feature importance ranking."""
    return ml_engine.get_feature_importances()


@router.get("/evaluation")
async def get_model_evaluation(
    ml_engine: MLEngine = Depends(get_ml_engine),
) -> Dict[str, Any]:
    """Get evaluation metrics, confusion matrix, and anomaly separation scores."""
    rf_m = get_demo_evaluation_metrics()
    if_m = ml_engine.model_metadata.get("if_metrics") if ml_engine.model_metadata else None
    if not if_m:
        df = generate_training_dataset(n_samples_per_state=250, noise_level=0.35, seed=42)
        anom = ml_engine.anomaly_model or AnomalyModel(random_state=42).fit(df)
        if_m = evaluate_anomaly_separation(anom, df)

    return {
        "source": ml_engine.model_source,
        "rf_metrics": rf_m,
        "if_metrics": if_m,
    }


@router.post("/ablation")
async def run_ablation_study() -> List[Dict[str, Any]]:
    """Run live multi-sensor ablation benchmark comparing single vs multi-sensor performance."""
    sensor_groups = {
        "vibration": [f for f in FEATURE_NAMES if f.startswith("vibration")],
        "level": [f for f in FEATURE_NAMES if f.startswith("level") or f == "material_level"],
        "load": [f for f in FEATURE_NAMES if f.startswith("load")],
    }

    combos = [
        ("Vibration Only (MPU6050)", ["vibration"]),
        ("Level Only (HC-SR04)", ["level"]),
        ("Load Only (HX711)", ["load"]),
        ("Vibration + Level", ["vibration", "level"]),
        ("Vibration + Load", ["vibration", "load"]),
        ("Full Sensor Fusion (All Sensors)", ["vibration", "level", "load"]),
    ]

    df = generate_training_dataset(n_samples_per_state=250, noise_level=0.35, seed=42)
    results = []

    for label, groups in combos:
        active_feats = [f for g in groups for f in sensor_groups[g]]
        df_masked = df.copy()
        for f in FEATURE_NAMES:
            if f not in active_feats:
                df_masked[f] = 0.0

        clf = BlockageClassifier(random_state=42)
        X_test, y_test = clf.fit_with_holdout(df_masked, random_state=42)
        anom = AnomalyModel(random_state=42).fit(df_masked, normal_only=True)

        rf_res = evaluate_classifier(clf.model, X_test, y_test)
        if_res = evaluate_anomaly_separation(anom, df_masked)

        results.append({
            "configuration": label,
            "sensor_count": len(groups),
            "rf_accuracy": round(rf_res["accuracy"] * 100, 1),
            "rf_f1_macro": round(rf_res["f1_macro"] * 100, 1),
            "if_separation": round(if_res["separation"], 3),
        })

    return results
