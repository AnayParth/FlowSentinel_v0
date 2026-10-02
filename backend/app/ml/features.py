"""Rolling-window feature extraction for ChuteGuard AI."""
from __future__ import annotations
from typing import List, Optional, Dict, Any
import numpy as np

FEATURE_NAMES = [
    "vibration_rms", "vibration_mean", "vibration_std", "vibration_variance",
    "vibration_peak", "vibration_peak_to_peak", "vibration_kurtosis",
    "vibration_crest_factor", "vibration_slope",
    "material_level", "level_rolling_avg", "level_slope", "level_std",
    "load", "load_rolling_avg", "load_slope", "load_std",
    "motor_current_rms", "motor_current_slope", "motor_current_std",
]


def _clean(arr: Any) -> np.ndarray:
    arr = np.asarray(arr, dtype=float)
    return arr[~np.isnan(arr)]


def _slope(arr: np.ndarray) -> float:
    arr = np.asarray(arr, dtype=float)
    mask = np.isfinite(arr)
    if mask.sum() < 2:
        return 0.0
    x = np.arange(len(arr), dtype=float)
    return float(np.polyfit(x[mask], arr[mask], 1)[0])


def _kurtosis(arr: np.ndarray) -> float:
    arr = _clean(arr)
    if len(arr) < 4:
        return 0.0
    std = float(np.std(arr))
    if std < 1e-9:
        return 0.0
    return float(np.mean((arr - np.mean(arr)) ** 4) / std**4 - 3.0)


def _last(arr: Any) -> float:
    c = _clean(arr)
    return float(c[-1]) if len(c) else 0.0


def extract_features(vibration: np.ndarray, level: np.ndarray, load: np.ndarray,
                     motor_current: Optional[np.ndarray] = None) -> Dict[str, float]:
    v = np.asarray(vibration, dtype=float)
    lv = np.asarray(level, dtype=float)
    ld = np.asarray(load, dtype=float)
    vc, lvc, ldc = _clean(v), _clean(lv), _clean(ld)

    rms = float(np.sqrt(np.mean(vc**2))) if len(vc) else 0.0
    mean = float(np.mean(vc)) if len(vc) else 0.0
    std = float(np.std(vc)) if len(vc) else 0.0
    peak = float(np.max(np.abs(vc))) if len(vc) else 0.0

    feats: Dict[str, float] = {
        "vibration_rms": rms,
        "vibration_mean": mean,
        "vibration_std": std,
        "vibration_variance": std**2,
        "vibration_peak": peak,
        "vibration_peak_to_peak": float(np.ptp(vc)) if len(vc) else 0.0,
        "vibration_kurtosis": _kurtosis(v),
        "vibration_crest_factor": float(peak / rms) if rms > 1e-6 else 0.0,
        "vibration_slope": _slope(v),
        "material_level": _last(lv),
        "level_rolling_avg": float(np.mean(lvc)) if len(lvc) else 0.0,
        "level_slope": _slope(lv),
        "level_std": float(np.std(lvc)) if len(lvc) else 0.0,
        "load": _last(ld),
        "load_rolling_avg": float(np.mean(ldc)) if len(ldc) else 0.0,
        "load_slope": _slope(ld),
        "load_std": float(np.std(ldc)) if len(ldc) else 0.0,
    }

    if motor_current is None:
        feats.update({"motor_current_rms": 0.0, "motor_current_slope": 0.0, "motor_current_std": 0.0})
    else:
        mc = np.asarray(motor_current, dtype=float)
        mcc = _clean(mc)
        feats["motor_current_rms"] = float(np.sqrt(np.mean(mcc**2))) if len(mcc) else 0.0
        feats["motor_current_slope"] = _slope(mc)
        feats["motor_current_std"] = float(np.std(mcc)) if len(mcc) else 0.0
    return feats


class RollingWindowBuffer:
    def __init__(self, window: int = 20, enable_motor_current: bool = True):
        self.window = int(window)
        self.enable_motor_current = bool(enable_motor_current)
        self.vibration: List[float] = []
        self.level: List[float] = []
        self.load: List[float] = []
        self.motor_current: List[float] = []

    def push(self, vibration: float, level: float, load: float,
             motor_current: Optional[float] = None):
        self.vibration.append(float(vibration))
        self.level.append(float(level))
        self.load.append(float(load))
        self.motor_current.append(np.nan if motor_current is None else float(motor_current))
        if len(self.vibration) > self.window:
            self.vibration.pop(0)
            self.level.pop(0)
            self.load.pop(0)
            self.motor_current.pop(0)

    def ready(self) -> bool:
        return len(self.vibration) >= max(5, self.window // 3)

    def features(self) -> Dict[str, float]:
        return extract_features(
            np.asarray(self.vibration), np.asarray(self.level), np.asarray(self.load),
            np.asarray(self.motor_current) if self.enable_motor_current else None,
        )

    def clear(self):
        self.vibration.clear()
        self.level.clear()
        self.load.clear()
        self.motor_current.clear()
