"""Isolation Forest Anomaly Model for ChuteGuard AI."""
from __future__ import annotations
from typing import Dict
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from .features import FEATURE_NAMES


class AnomalyModel:
    def __init__(self, n_estimators: int = 200, contamination: float = 0.08,
                 random_state: int = 42):
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=random_state,
        )
        self.scaler = StandardScaler()
        self._fitted = False
        self._score_lo = 0.0
        self._score_hi = 1.0

    def fit(self, df: pd.DataFrame, normal_only: bool = True):
        X_full = df[FEATURE_NAMES].values
        self.scaler.fit(X_full)

        train_df = df[df["state"] == 0] if normal_only and "state" in df.columns else df
        X_train = self.scaler.transform(train_df[FEATURE_NAMES].values)
        self.model.fit(X_train)

        raw_full = self.model.decision_function(self.scaler.transform(X_full))
        self._score_lo = float(np.percentile(raw_full, 1))
        self._score_hi = float(np.percentile(raw_full, 99))
        self._fitted = True
        return self

    def anomaly_score(self, feature_row: Dict[str, float]) -> float:
        if not self._fitted:
            raise RuntimeError("AnomalyModel must be fit before scoring.")
        x = np.array([[feature_row.get(f, 0.0) for f in FEATURE_NAMES]])
        x_scaled = self.scaler.transform(x)
        raw = float(self.model.decision_function(x_scaled)[0])
        span = max(1e-9, self._score_hi - self._score_lo)
        normal_ness = (raw - self._score_lo) / span
        anomaly = 1.0 - normal_ness
        return float(np.clip(anomaly, 0.0, 1.0))

    def anomaly_scores_batch(self, df: pd.DataFrame) -> np.ndarray:
        X = self.scaler.transform(df[FEATURE_NAMES].values)
        raw = self.model.decision_function(X)
        span = max(1e-9, self._score_hi - self._score_lo)
        normal_ness = (raw - self._score_lo) / span
        return np.clip(1.0 - normal_ness, 0.0, 1.0)
