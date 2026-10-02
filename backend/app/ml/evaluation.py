"""Evaluation metrics for BlockageClassifier and AnomalyModel."""
from __future__ import annotations
from typing import Dict, List, Optional, Any
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix,
)

from .classifier import STATE_NAMES

POC_DISCLAIMER = (
    "Model metrics are evaluated on controlled training and holdout datasets. "
    "Validate on site-specific material flows before operational deployment."
)


DEMO_CONFUSION_MATRIX = [
    [215, 30, 5, 0],
    [28, 185, 32, 5],
    [3, 35, 178, 34],
    [0, 5, 60, 185],
]
DEMO_LABELS = ["NORMAL", "PARTIAL BLOCKAGE", "DEVELOPING BLOCKAGE", "CRITICAL / BLOCKED"]


def compute_metrics_from_matrix(cm_list: List[List[int]], labels: List[str]) -> Dict[str, Any]:
    arr = np.asarray(cm_list, dtype=float)
    total = float(arr.sum())
    diag = float(np.trace(arr))
    accuracy = diag / total if total > 0 else 0.0

    n_classes = len(labels)
    recalls = []
    precs = []
    f1s = []

    for i in range(n_classes):
        r_sum = float(arr[i, :].sum())
        c_sum = float(arr[:, i].sum())
        rec = float(arr[i, i] / r_sum) if r_sum > 0 else 0.0
        prec = float(arr[i, i] / c_sum) if c_sum > 0 else 0.0
        f1 = float(2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
        recalls.append(rec)
        precs.append(prec)
        f1s.append(f1)

    return {
        "accuracy": float(accuracy),
        "precision_macro": float(np.mean(precs)),
        "recall_macro": float(np.mean(recalls)),
        "f1_macro": float(np.mean(f1s)),
        "confusion_matrix": cm_list,
        "confusion_matrix_labels": labels,
        "disclaimer": POC_DISCLAIMER,
    }


def get_demo_evaluation_metrics() -> Dict[str, Any]:
    return compute_metrics_from_matrix(DEMO_CONFUSION_MATRIX, DEMO_LABELS)


def evaluate_classifier(model: Any, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
    y_pred = model.predict(X_test)
    labels = sorted(set(y_test) | set(y_pred))
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    return {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision_macro": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "confusion_matrix": cm.tolist(),
        "confusion_matrix_labels": [STATE_NAMES.get(int(l), str(l)) for l in labels],
        "disclaimer": POC_DISCLAIMER,
    }


def evaluate_anomaly_separation(anomaly_model: Any, df: pd.DataFrame) -> Dict[str, Any]:
    scores = anomaly_model.anomaly_scores_batch(df)
    normal_scores = scores[df["state"].values == 0]
    abnormal_scores = scores[df["state"].values != 0]

    threshold = float(np.percentile(normal_scores, 95)) if len(normal_scores) else 0.5
    false_positive_rate = float(np.mean(normal_scores > threshold)) if len(normal_scores) else 0.0
    true_positive_rate = float(np.mean(abnormal_scores > threshold)) if len(abnormal_scores) else 0.0

    return {
        "normal_mean_score": float(np.mean(normal_scores)) if len(normal_scores) else 0.0,
        "abnormal_mean_score": float(np.mean(abnormal_scores)) if len(abnormal_scores) else 0.0,
        "separation": float(np.mean(abnormal_scores) - np.mean(normal_scores))
                      if len(normal_scores) and len(abnormal_scores) else 0.0,
        "threshold_p95_normal": threshold,
        "false_positive_rate_at_threshold": false_positive_rate,
        "true_positive_rate_at_threshold": true_positive_rate,
        "disclaimer": POC_DISCLAIMER,
    }


def compute_prediction_lead_time(risk_history: List[float], time_history: List[float],
                                  warning_threshold: float = 50.0,
                                  critical_threshold: float = 75.0) -> Dict[str, Any]:
    warn_t, crit_t = None, None
    for t, r in zip(time_history, risk_history):
        if warn_t is None and r >= warning_threshold:
            warn_t = t
        if crit_t is None and r >= critical_threshold:
            crit_t = t
        if warn_t is not None and crit_t is not None:
            break

    lead_time = (crit_t - warn_t) if (warn_t is not None and crit_t is not None) else None
    return {
        "warning_time": warn_t,
        "critical_time": crit_t,
        "lead_time_seconds": lead_time,
        "label": "Estimated prediction lead time",
    }
