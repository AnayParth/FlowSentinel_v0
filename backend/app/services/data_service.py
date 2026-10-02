"""Dataset recording and model retraining service for ChuteGuard AI."""
from __future__ import annotations
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import numpy as np
import pandas as pd
import joblib

from ..config import (
    DATA_DIR, MODEL_DIR, RAW_DATASET_PATH,
    CLASSIFIER_PATH, ANOMALY_PATH, METADATA_PATH,
)
from ..ml.features import RollingWindowBuffer, FEATURE_NAMES
from ..ml.classifier import BlockageClassifier, STATE_NAMES
from ..ml.anomaly_model import AnomalyModel
from ..ml.evaluation import evaluate_classifier, evaluate_anomaly_separation
from .ml_engine import MLEngine, get_ml_engine

RAW_COLUMNS = [
    "session_id", "recorded_at", "t",
    "timestamp", "distance_cm", "load_kg", "ax_g", "ay_g", "az_g",
    "vibration_g", "level", "motor_current",
    "state", "state_name",
]

STATE_NAME_TO_ID = {v: k for k, v in STATE_NAMES.items()}


class DataService:
    def __init__(self, ml_engine: Optional[MLEngine] = None):
        self.ml_engine = ml_engine or get_ml_engine()
        self.recording_active: bool = False
        self.current_session_id: Optional[str] = None
        self.current_label: str = "NORMAL"
        self.session_buffer: List[Dict[str, Any]] = []

    def start_recording(self, label: str = "NORMAL") -> str:
        self.recording_active = True
        self.current_label = label
        self.current_session_id = f"{datetime.now(timezone.utc):%Y%m%dT%H%M%S}_{uuid.uuid4().hex[:6]}"
        self.session_buffer.clear()
        print(f"[DataService] Started recording session {self.current_session_id} as '{label}'")
        return self.current_session_id

    def record_sample(self, raw_sample: Dict[str, Any]):
        if not self.recording_active or not self.current_session_id:
            return

        level = raw_sample.get("material_level", raw_sample.get("level", 15.0))
        vib = raw_sample.get("vibration_g", raw_sample.get("vibration", 1.0))
        
        row = {
            "session_id": self.current_session_id,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "t": len(self.session_buffer),
            "timestamp": raw_sample.get("timestamp", raw_sample.get("t", 0.0)),
            "distance_cm": raw_sample.get("distance_cm", 0.0),
            "load_kg": raw_sample.get("load_kg", raw_sample.get("load", 0.0)),
            "ax_g": raw_sample.get("ax_g", 0.0),
            "ay_g": raw_sample.get("ay_g", 0.0),
            "az_g": raw_sample.get("az_g", 0.0),
            "vibration_g": vib,
            "level": level,
            "motor_current": raw_sample.get("motor_current_a", raw_sample.get("motor_current")),
            "state": STATE_NAME_TO_ID.get(self.current_label, 0),
            "state_name": self.current_label,
        }
        self.session_buffer.append(row)

    def stop_recording(self) -> int:
        if not self.recording_active:
            return 0

        self.recording_active = False
        count = len(self.session_buffer)
        if count > 0:
            self._save_session_buffer()
        self.session_buffer.clear()
        self.current_session_id = None
        print(f"[DataService] Stopped recording. Saved {count} samples.")
        return count

    def discard_recording(self):
        self.recording_active = False
        self.session_buffer.clear()
        self.current_session_id = None

    def _save_session_buffer(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        df_new = pd.DataFrame(self.session_buffer)
        for col in RAW_COLUMNS:
            if col not in df_new.columns:
                df_new[col] = np.nan
        df_new = df_new[RAW_COLUMNS]

        header = True
        mode = "w"
        if RAW_DATASET_PATH.exists():
            try:
                existing = pd.read_csv(RAW_DATASET_PATH)
                if list(existing.columns) == RAW_COLUMNS:
                    header = False
                    mode = "a"
            except Exception:
                header = True
                mode = "w"

        df_new.to_csv(RAW_DATASET_PATH, mode=mode, header=header, index=False)

    def get_dataset_summary(self) -> Dict[str, Any]:
        if not RAW_DATASET_PATH.exists():
            return {
                "total_samples": 0,
                "sessions": 0,
                "per_class_counts": {name: 0 for name in STATE_NAMES.values()},
                "current_buffer_count": len(self.session_buffer),
                "is_recording": self.recording_active,
                "current_label": self.current_label if self.recording_active else None,
            }

        df = pd.read_csv(RAW_DATASET_PATH)
        counts = df["state_name"].value_counts().to_dict() if len(df) else {}
        return {
            "total_samples": int(len(df)),
            "sessions": int(df["session_id"].nunique()) if len(df) else 0,
            "per_class_counts": {name: int(counts.get(name, 0)) for name in STATE_NAMES.values()},
            "current_buffer_count": len(self.session_buffer),
            "is_recording": self.recording_active,
            "current_label": self.current_label if self.recording_active else None,
        }

    def train_models_on_real_data(self, window: int = 20, enable_motor_current: bool = False,
                                  random_state: int = 42) -> Dict[str, Any]:
        if not RAW_DATASET_PATH.exists():
            raise ValueError("No recorded dataset found. Please record samples first.")

        df_raw = pd.read_csv(RAW_DATASET_PATH)
        if df_raw.empty or df_raw["state"].nunique() < 2:
            raise ValueError("Need samples for at least 2 distinct chute conditions to train.")

        # Build feature dataset
        feature_rows = []
        for _, session_df in df_raw.groupby("session_id"):
            session_df = session_df.sort_values("t")
            buf = RollingWindowBuffer(window=window, enable_motor_current=enable_motor_current)
            state = int(session_df["state"].iloc[0])
            state_name = str(session_df["state_name"].iloc[0])
            for _, row in session_df.iterrows():
                mc = row.get("motor_current")
                mc_val = None if pd.isna(mc) else float(mc)
                buf.push(row["vibration_g"], row["level"], row["load_kg"], mc_val)
                if buf.ready():
                    feats = buf.features()
                    feats["state"] = state
                    feats["state_name"] = state_name
                    feature_rows.append(feats)

        feat_df = pd.DataFrame(feature_rows)
        if feat_df.empty or feat_df["state"].nunique() < 2:
            raise ValueError("Not enough feature windows generated. Record longer sessions.")

        clf = BlockageClassifier(random_state=random_state)
        X_test, y_test = clf.fit_with_holdout(feat_df, random_state=random_state)

        has_normal = bool((feat_df["state"] == 0).any())
        anomaly_model = AnomalyModel(random_state=random_state).fit(feat_df, normal_only=has_normal)

        rf_metrics = evaluate_classifier(clf.model, X_test, y_test)
        if_metrics = evaluate_anomaly_separation(anomaly_model, feat_df)

        # Save to disk
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(clf, CLASSIFIER_PATH)
        joblib.dump(anomaly_model, ANOMALY_PATH)
        meta = {
            "rf_metrics": rf_metrics,
            "if_metrics": if_metrics,
            "n_feature_rows": int(len(feat_df)),
            "n_raw_samples": int(len(df_raw)),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "trained_on_normal_baseline": has_normal,
            "window": window,
        }
        joblib.dump(meta, METADATA_PATH)

        # Hot-reload in MLEngine
        self.ml_engine.load_or_initialize_models()

        return {
            "status": "success",
            "rf_metrics": rf_metrics,
            "if_metrics": if_metrics,
            "n_feature_rows": int(len(feat_df)),
            "n_raw_samples": int(len(df_raw)),
            "trained_at": meta["trained_at"],
        }


_data_service: Optional[DataService] = None


def get_data_service() -> DataService:
    global _data_service
    if _data_service is None:
        _data_service = DataService()
    return _data_service
