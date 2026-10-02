"""Transparent sensor health diagnostic checks for ChuteGuard AI."""
from __future__ import annotations
from typing import List, Optional, Tuple
import numpy as np


def assess_sensor_health(buffer_values: List[float], sensor_name: str,
                         expected_range: Optional[Tuple[float, float]] = None,
                         is_hardware: bool = False) -> str:
    """Return HEALTHY, DEGRADED or FAILED.
    Conservative physical sanity & statistical checks.
    """
    arr = np.asarray(buffer_values, dtype=float)
    if len(arr) < 5:
        return "HEALTHY"

    finite = arr[np.isfinite(arr)]
    if len(finite) == 0:
        return "FAILED"

    if expected_range is not None:
        lo, hi = expected_range
        out = np.mean((finite < lo) | (finite > hi))
        if out >= 0.5:
            return "FAILED"
        if out > 0:
            return "DEGRADED"

    # All-zero checks
    if sensor_name != "load" and np.all(finite == 0):
        return "FAILED"

    # Constant non-zero reading (stuck sensor dynamics check)
    if is_hardware and sensor_name == "load":
        if len(finite) >= 5 and np.std(finite) < 1e-3:
            return "DEGRADED"
    elif len(finite) >= 5 and np.std(finite) < 1e-9:
        if sensor_name != "load":
            return "FAILED"
        return "HEALTHY"

    mean = float(np.mean(finite))
    std = float(np.std(finite))
    if std > 0 and np.max(np.abs(finite - mean)) > 6 * std:
        return "DEGRADED"
    cv = std / (abs(mean) + 1e-6)
    if cv > 1.5:
        return "DEGRADED"
    return "HEALTHY"

