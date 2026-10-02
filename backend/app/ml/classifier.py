"""Random Forest Blockage Classifier for ChuteGuard AI."""
from __future__ import annotations
from typing import Dict, Tuple, List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from .features import FEATURE_NAMES

STATE_NAMES: Dict[int, str] = {
    0: "NORMAL",
    1: "PARTIAL BLOCKAGE",
    2: "DEVELOPING BLOCKAGE",
    3: "CRITICAL / BLOCKED",
}


class BlockageClassifier:
    def __init__(self, n_estimators: int = 300, max_depth: Optional[int] = 12,
                 random_state: int = 42):
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=random_state,
            class_weight="balanced",
        )
        self._fitted = False
        self.classes_: List[int] = [0, 1, 2, 3]

    def fit(self, df: pd.DataFrame):
        X = df[FEATURE_NAMES].values
        y = df["state"].values
        self.model.fit(X, y)
        self.classes_ = list(self.model.classes_)
        self._fitted = True
        return self

    def fit_with_holdout(self, df: pd.DataFrame, test_size: float = 0.25,
                         random_state: int = 42):
        X = df[FEATURE_NAMES].values
        y = df["state"].values
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y,
        )
        self.model.fit(X_train, y_train)
        self.classes_ = list(self.model.classes_)
        self._fitted = True
        return X_test, y_test

    def predict_proba_row(self, feature_row: Dict[str, float]) -> Dict[str, float]:
        if not self._fitted:
            raise RuntimeError("BlockageClassifier must be fit before predicting.")
        x = np.array([[feature_row.get(f, 0.0) for f in FEATURE_NAMES]])
        proba = self.model.predict_proba(x)[0]
        # Return all 4 states, defaulting missing to 0.0
        result = {STATE_NAMES[c]: 0.0 for c in range(4)}
        for c, p in zip(self.model.classes_, proba):
            if int(c) in STATE_NAMES:
                result[STATE_NAMES[int(c)]] = float(p)
        return result

    def predict_state(self, feature_row: Dict[str, float]) -> Tuple[int, str]:
        x = np.array([[feature_row.get(f, 0.0) for f in FEATURE_NAMES]])
        pred = int(self.model.predict(x)[0])
        return pred, STATE_NAMES.get(pred, "UNKNOWN")

    def feature_importances(self) -> Dict[str, float]:
        if not self._fitted:
            raise RuntimeError("BlockageClassifier must be fit before requesting importances.")
        return dict(sorted(
            zip(FEATURE_NAMES, (float(v) for v in self.model.feature_importances_)),
            key=lambda kv: kv[1], reverse=True,
        ))
