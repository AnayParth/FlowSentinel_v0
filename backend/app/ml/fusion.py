"""Risk Fusion Layer for ChuteGuard AI."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Tuple, Optional, Any
import numpy as np


@dataclass
class FusionConfig:
    w_classification: float = 0.55
    w_anomaly: float = 0.25
    w_trend: float = 0.20
    class_weights: Dict[str, float] = field(default_factory=lambda: {
        "NORMAL": 0.0,
        "PARTIAL BLOCKAGE": 0.33,
        "DEVELOPING BLOCKAGE": 0.66,
        "CRITICAL / BLOCKED": 1.0,
    })
    level_slope_saturation: float = 3.0
    load_slope_saturation: float = 4.0

    def normalize(self):
        total = self.w_classification + self.w_anomaly + self.w_trend
        if total <= 0:
            self.w_classification, self.w_anomaly, self.w_trend = 0.55, 0.25, 0.20
        else:
            self.w_classification /= total
            self.w_anomaly /= total
            self.w_trend /= total


RISK_BANDS = [
    (0, 25, "LOW", "NORMAL"),
    (25, 50, "MEDIUM", "EARLY ANOMALY"),
    (50, 75, "HIGH", "DEVELOPING BLOCKAGE"),
    (75, 101, "VERY HIGH", "CRITICAL"),
]


def risk_band(risk: float) -> Tuple[str, str]:
    for lo, hi, level, status in RISK_BANDS:
        if lo <= risk < hi:
            return level, status
    return "VERY HIGH", "CRITICAL"


def _weighted_classification_probability(class_proba: Dict[str, float], cfg: FusionConfig) -> float:
    return float(sum(class_proba.get(name, 0.0) * w for name, w in cfg.class_weights.items()))


def _trend_contribution(feature_row: Dict[str, float], cfg: FusionConfig) -> float:
    level_term = max(0.0, feature_row.get("level_slope", 0.0)) / cfg.level_slope_saturation
    load_term = max(0.0, feature_row.get("load_slope", 0.0)) / cfg.load_slope_saturation
    return float(np.clip((level_term + load_term) / 2.0, 0.0, 1.0))


def compute_risk(class_proba: Dict[str, float], anomaly_score: float,
                 feature_row: Dict[str, float],
                 cfg: Optional[FusionConfig] = None,
                 sensor_health: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    cfg = cfg or FusionConfig()
    cfg.normalize()

    class_contrib = _weighted_classification_probability(class_proba, cfg)
    anomaly_contrib = float(np.clip(anomaly_score, 0.0, 1.0))
    trend_contrib = _trend_contribution(feature_row, cfg)

    # Dynamic sensor reliability weighting (motor_current excluded = 0.0)
    raw_weights = {
        "level": 1.0,
        "vibration": 1.0,
        "load": 1.0,
        "motor_current": 0.0,
    }
    confidence = 1.0
    if sensor_health:
        for s, h in sensor_health.items():
            if s == "motor_current":
                continue
            if h == "DEGRADED":
                if s == "load":
                    raw_weights[s] = 0.4
                else:
                    raw_weights[s] = 0.5
                confidence -= 0.30
            elif h == "FAILED":
                raw_weights[s] = 0.0
                confidence -= 0.50

    confidence = float(np.clip(confidence, 0.20, 1.0))
    total_sw = sum(raw_weights.values())
    if total_sw > 0:
        sensor_weights = {s: round(w / total_sw, 3) for s, w in raw_weights.items()}
    else:
        sensor_weights = {"level": 0.5, "vibration": 0.5, "load": 0.0, "motor_current": 0.0}

    risk_raw = (cfg.w_classification * class_contrib
                + cfg.w_anomaly * anomaly_contrib
                + cfg.w_trend * trend_contrib)

    # Low confidence damps the risk score toward a cautious mid-range
    if confidence < 1.0:
        risk_raw = risk_raw * confidence + 0.30 * (1.0 - confidence)

    risk = float(np.clip(100.0 * risk_raw, 0.0, 100.0))
    level, status = risk_band(risk)

    contributions = {
        "Random Forest Classification": round(cfg.w_classification * class_contrib * 100, 1),
        "Isolation Forest Anomaly": round(cfg.w_anomaly * anomaly_contrib * 100, 1),
        "Temporal Slope Trend": round(cfg.w_trend * trend_contrib * 100, 1),
    }

    def band(x: float) -> str:
        if x < 0.2:
            return "LOW"
        if x < 0.5:
            return "MEDIUM"
        return "HIGH"

    explanation = {
        "Material Accumulation Rate": band(trend_contrib),
        "Behavioral Anomaly Index": band(anomaly_contrib),
        "Blockage State Progression": band(class_contrib),
    }

    return {
        "risk": round(risk, 1),
        "risk_level": level,
        "status": status,
        "confidence": round(confidence * 100, 1),
        "class_contrib": round(class_contrib, 3),
        "anomaly_contrib": round(anomaly_contrib, 3),
        "trend_contrib": round(trend_contrib, 3),
        "contributions": contributions,
        "explanation": explanation,
        "sensor_weights": sensor_weights,
    }

