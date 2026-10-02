"""Central AI Engine for ChuteGuard AI — Single Source of Truth."""
from __future__ import annotations
from typing import Dict, Any, Optional, List
from pathlib import Path
import time
import joblib
import numpy as np
import pandas as pd

from ..config import (
    CLASSIFIER_PATH, ANOMALY_PATH, METADATA_PATH,
    SYNTHETIC_CLASSIFIER_PATH, SYNTHETIC_ANOMALY_PATH,
)
from ..ml.features import RollingWindowBuffer, FEATURE_NAMES, extract_features
from ..ml.classifier import BlockageClassifier, STATE_NAMES
from ..ml.anomaly_model import AnomalyModel
from ..ml.fusion import compute_risk, FusionConfig
from ..ml.sensor_health import assess_sensor_health
from ..ml.sensors import distance_to_level
from ..ml.simulator import generate_training_dataset


class MLEngine:
    def __init__(self):
        self.classifier: Optional[BlockageClassifier] = None
        self.anomaly_model: Optional[AnomalyModel] = None
        self.model_metadata: Dict[str, Any] = {}
        self.model_source: str = "none"
        self.fusion_config: FusionConfig = FusionConfig()
        
        # Dedicated rolling buffers for different input streams
        self.sim_buffer = RollingWindowBuffer(window=20, enable_motor_current=True)
        self.hw_buffer = RollingWindowBuffer(window=20, enable_motor_current=True)
        
        # Calibration parameters (empty=7.0cm, full=0.5cm)
        self.empty_distance_cm: float = 7.0
        self.full_distance_cm: float = 0.5
        
        # History buffers for charts & telemetry
        self.telemetry_history: List[Dict[str, Any]] = []
        self.max_history: int = 300

        self.load_or_initialize_models()

    def load_or_initialize_models(self) -> bool:
        """Attempt to load trained models from disk; fallback to quick synthetic training."""
        # 1. Try real trained models
        if CLASSIFIER_PATH.exists() and ANOMALY_PATH.exists():
            try:
                self.classifier = joblib.load(CLASSIFIER_PATH)
                self.anomaly_model = joblib.load(ANOMALY_PATH)
                self.model_metadata = joblib.load(METADATA_PATH) if METADATA_PATH.exists() else {}
                self.model_source = "real_data_model"
                print(f"[MLEngine] Loaded real data models from {CLASSIFIER_PATH}")
                return True
            except Exception as e:
                print(f"[MLEngine] Error loading real models: {e}")

        # 2. Try synthetic trained models
        if SYNTHETIC_CLASSIFIER_PATH.exists() and SYNTHETIC_ANOMALY_PATH.exists():
            try:
                self.classifier = joblib.load(SYNTHETIC_CLASSIFIER_PATH)
                self.anomaly_model = joblib.load(SYNTHETIC_ANOMALY_PATH)
                self.model_source = "synthetic_data_model"
                print(f"[MLEngine] Loaded synthetic models from {SYNTHETIC_CLASSIFIER_PATH}")
                return True
            except Exception as e:
                print(f"[MLEngine] Error loading synthetic models: {e}")

        # 3. Fallback: train on-the-fly
        print("[MLEngine] Initializing and training baseline models on synthetic dataset...")
        df = generate_training_dataset(n_samples_per_state=300, noise_level=0.35, seed=42)
        self.anomaly_model = AnomalyModel(random_state=42).fit(df, normal_only=True)
        self.classifier = BlockageClassifier(random_state=42).fit(df)
        self.model_source = "runtime_synthetic_model"
        return True

    def set_calibration(self, empty_distance_cm: float, full_distance_cm: float):
        if empty_distance_cm <= full_distance_cm:
            raise ValueError("empty_distance_cm must be strictly greater than full_distance_cm")
        self.empty_distance_cm = float(empty_distance_cm)
        self.full_distance_cm = float(full_distance_cm)

    def set_fusion_weights(self, w_class: float, w_anom: float, w_trend: float):
        self.fusion_config = FusionConfig(
            w_classification=w_class,
            w_anomaly=w_anom,
            w_trend=w_trend
        )
        self.fusion_config.normalize()

    def process_raw_sample(self, sample: Dict[str, Any], stream: str = "simulation") -> Dict[str, Any]:
        """
        Shared unified prediction pipeline for ANY input source (Simulation, ESP32, What-If).
        """
        buf = self.sim_buffer if stream == "simulation" else self.hw_buffer

        vibration = float(sample.get("vibration", sample.get("vibration_g", 1.0)))
        load = float(sample.get("load", sample.get("load_kg", 0.05)))
        
        # Determine level: if distance_cm is provided, convert using calibration; else use level
        if "distance_cm" in sample and sample["distance_cm"] is not None:
            distance_cm = float(sample["distance_cm"])
            level = distance_to_level(distance_cm, self.empty_distance_cm, self.full_distance_cm)
        else:
            level = float(sample.get("level", sample.get("material_level", 15.0)))
            distance_cm = self.empty_distance_cm - (level / 100.0) * (self.empty_distance_cm - self.full_distance_cm)

        motor_current = sample.get("motor_current", sample.get("motor_current_a"))
        motor_cur_val = float(motor_current) if motor_current is not None and not pd.isna(motor_current) else None

        # Push to rolling window buffer
        buf.push(vibration, level, load, motor_cur_val)

        # Extract features
        feats = buf.features()

        # Machine Learning Predictions
        class_proba = self.classifier.predict_proba_row(feats) if self.classifier else {
            "NORMAL": 1.0, "PARTIAL BLOCKAGE": 0.0, "DEVELOPING BLOCKAGE": 0.0, "CRITICAL / BLOCKED": 0.0
        }
        pred_id, pred_name = self.classifier.predict_state(feats) if self.classifier else (0, "NORMAL")
        anomaly_score = self.anomaly_model.anomaly_score(feats) if self.anomaly_model else 0.0

        is_hw = (stream == "hardware")
        sensor_health = {
            "vibration": assess_sensor_health(buf.vibration, "vibration", (0.0, 10.0), is_hardware=is_hw),
            "level": assess_sensor_health(buf.level, "level", (0.0, 100.0), is_hardware=is_hw),
            "load": assess_sensor_health(buf.load, "load", (0.0, 5.0), is_hardware=is_hw),
        }
        if motor_cur_val is not None:
            sensor_health["motor_current"] = assess_sensor_health(buf.motor_current, "motor_current", (0.0, 100.0), is_hardware=is_hw)


        # Risk Fusion
        risk_result = compute_risk(class_proba, anomaly_score, feats, self.fusion_config, sensor_health)

        raw_t = sample.get("t")
        if raw_t is None:
            raw_t = sample.get("timestamp")
        t_val = float(raw_t) if raw_t is not None else time.time()

        result = {
            "t": t_val,
            "timestamp": time.time(),
            "mode": stream,
            "raw_sensors": {
                "vibration_g": vibration,
                "distance_cm": round(distance_cm, 2),
                "material_level": round(level, 1),
                "load_kg": round(load, 2),
                "ax_g": round(float(sample.get("ax_g", 0.0)), 3),
                "ay_g": round(float(sample.get("ay_g", 0.0)), 3),
                "az_g": round(float(sample.get("az_g", vibration)), 3),
                "motor_current_a": round(motor_cur_val, 2) if motor_cur_val is not None else None,
            },
            "features": feats,
            "class_probabilities": class_proba,
            "predicted_state": pred_name,
            "predicted_state_id": pred_id,
            "anomaly_score": round(anomaly_score, 4),
            "risk_result": risk_result,
            "sensor_health": sensor_health,
        }

        # Store in rolling telemetry history
        self.telemetry_history.append(result)
        if len(self.telemetry_history) > self.max_history:
            self.telemetry_history.pop(0)

        return result

    def manual_predict(self, vibration_g: float, level: float, load_kg: float,
                       motor_current_a: Optional[float] = None,
                       noise: float = 0.2,
                       faults: Optional[Dict[str, Optional[str]]] = None) -> Dict[str, Any]:
        """Perform instant what-if evaluation with synthesized local trend window."""
        rng = np.random.default_rng(42)
        window = 20
        severity = float(np.clip(level / 100.0, 0.0, 1.0))

        level_start = max(0.0, level - 8.0 * severity)
        load_start = max(0.0, load_kg - 12.0 * severity)
        vib_start = max(0.0, vibration_g - 0.5 * severity)

        lvl = np.linspace(level_start, level, window) + rng.normal(0, 0.2 + 0.5 * noise, window)
        ld = np.linspace(load_start, load_kg, window) + rng.normal(0, 0.5 + 1.5 * noise, window)
        vib = np.linspace(vib_start, vibration_g, window) + rng.normal(0, 0.03 + 0.1 * noise, window)

        lvl = np.clip(lvl, 0, 100)
        ld = np.clip(ld, 0, None)
        vib = np.clip(vib, 0, None)

        cur = None
        if motor_current_a is not None:
            cur = np.linspace(max(0.0, motor_current_a - 0.8 * severity), motor_current_a, window)
            cur += rng.normal(0, 0.05 + 0.15 * noise, window)

        feats = extract_features(vib, lvl, ld, cur)
        class_proba = self.classifier.predict_proba_row(feats) if self.classifier else {
            "NORMAL": 1.0, "PARTIAL BLOCKAGE": 0.0, "DEVELOPING BLOCKAGE": 0.0, "CRITICAL / BLOCKED": 0.0
        }
        pred_id, pred_name = self.classifier.predict_state(feats) if self.classifier else (0, "NORMAL")
        anomaly_score = self.anomaly_model.anomaly_score(feats) if self.anomaly_model else 0.0

        def get_fault_health(fault_type: Optional[str]) -> str:
            if not fault_type:
                return "HEALTHY"
            if fault_type in ("dropout", "stuck"):
                return "FAILED"
            return "DEGRADED"

        faults = faults or {}
        health = {
            "vibration": get_fault_health(faults.get("vibration")),
            "level": get_fault_health(faults.get("level")),
            "load": get_fault_health(faults.get("load")),
        }
        if motor_current_a is not None:
            health["motor_current"] = get_fault_health(faults.get("motor_current"))

        risk_result = compute_risk(class_proba, anomaly_score, feats, self.fusion_config, health)

        # Estimate distance from level
        distance_cm = self.empty_distance_cm - (level / 100.0) * (self.empty_distance_cm - self.full_distance_cm)

        return {
            "t": time.time(),
            "timestamp": time.time(),
            "mode": "manual",
            "raw_sensors": {
                "vibration_g": vibration_g,
                "distance_cm": round(distance_cm, 2),
                "material_level": round(level, 1),
                "load_kg": round(load_kg, 2),
                "ax_g": 0.0,
                "ay_g": 0.0,
                "az_g": vibration_g,
                "motor_current_a": motor_current_a,
            },
            "features": feats,
            "class_probabilities": class_proba,
            "predicted_state": pred_name,
            "predicted_state_id": pred_id,
            "anomaly_score": round(anomaly_score, 4),
            "risk_result": risk_result,
            "sensor_health": health,
        }

    def get_feature_importances(self) -> Dict[str, float]:
        if self.classifier:
            return self.classifier.feature_importances()
        return {f: 1.0 / len(FEATURE_NAMES) for f in FEATURE_NAMES}

    def reset_buffers(self):
        self.sim_buffer.clear()
        self.hw_buffer.clear()
        self.telemetry_history.clear()


# Global Singleton Instance
_ml_engine: Optional[MLEngine] = None


def get_ml_engine() -> MLEngine:
    global _ml_engine
    if _ml_engine is None:
        _ml_engine = MLEngine()
    return _ml_engine
