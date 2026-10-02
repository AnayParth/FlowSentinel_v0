"""Sensor calibration and signal synthesis utilities."""
from __future__ import annotations
from typing import Optional, Dict
import numpy as np

MATERIAL_PROFILES: Dict[str, Dict[str, float]] = {
    "iron_ore":   {"vib_gain": 1.15, "level_gain": 1.00, "load_gain": 1.20, "density": 1.0},
    "coal":       {"vib_gain": 0.85, "level_gain": 1.10, "load_gain": 0.70, "density": 0.55},
    "pellets":    {"vib_gain": 1.00, "level_gain": 0.95, "load_gain": 1.00, "density": 0.85},
    "limestone":  {"vib_gain": 1.05, "level_gain": 1.00, "load_gain": 1.05, "density": 0.95},
    "generic":    {"vib_gain": 1.00, "level_gain": 1.00, "load_gain": 1.00, "density": 1.00},
}


def distance_to_level(distance_cm: float, empty_distance_cm: float = 8.0,
                      full_distance_cm: float = 0.5) -> float:
    """Convert HC-SR04 ultrasonic distance (cm) to 0-100% material level."""
    if empty_distance_cm <= full_distance_cm:
        raise ValueError("empty_distance_cm must be greater than full_distance_cm")
    span = empty_distance_cm - full_distance_cm
    level = (empty_distance_cm - float(distance_cm)) / span * 100.0
    return float(np.clip(level, 0.0, 100.0))


def load_from_hx711(raw_value: float, tare_raw: float, calibration_counts_per_kg: float) -> float:
    """Convert calibrated HX711 raw count to kilograms."""
    if calibration_counts_per_kg == 0:
        raise ValueError("calibration_counts_per_kg cannot be zero")
    return max(0.0, (float(raw_value) - float(tare_raw)) / float(calibration_counts_per_kg))


def acceleration_magnitude(ax_g: float, ay_g: float, az_g: float) -> float:
    """Return total acceleration magnitude in g from MPU6050."""
    return float(np.sqrt(ax_g**2 + ay_g**2 + az_g**2))


def apply_fault(value: float, fault: Optional[str], rng: np.random.Generator,
                frozen_value: float = 0.0) -> float:
    if fault is None:
        return value
    if fault == "dropout":
        return 0.0
    if fault == "stuck":
        return frozen_value
    if fault == "spike":
        if rng.random() < 0.20:
            return value * float(rng.uniform(3.0, 5.5)) * float(rng.choice([-1.0, 1.0]))
        return value
    if fault == "noisy":
        return value + float(rng.normal(0, abs(value) * 0.8 + 0.5))
    return value


def sample_vibration(severity: float, noise_level: float, rng: np.random.Generator,
                     material_gain: float = 1.0, fault: Optional[str] = None,
                     prev_vibration: float = 0.98) -> float:
    target = 0.98 + 0.12 * severity * material_gain
    val = prev_vibration + 0.15 * (target - prev_vibration) + float(rng.normal(0, 0.01 + 0.02 * noise_level))
    val = float(np.clip(val, 0.80, 1.20))
    return apply_fault(val, fault, rng, frozen_value=prev_vibration)


def sample_level(prev_level: float, severity: float, noise_level: float,
                 rng: np.random.Generator, material_gain: float = 1.0,
                 fault: Optional[str] = None) -> float:
    target = min(98.0, 100.0 * severity * material_gain)
    value = prev_level + 0.12 * (target - prev_level) + rng.normal(0, 1.2 + 3.0 * noise_level)
    return apply_fault(float(np.clip(value, 0.0, 100.0)), fault, rng, frozen_value=prev_level)


def sample_load(prev_load: float, severity: float, noise_level: float,
                rng: np.random.Generator, material_gain: float = 1.0,
                fault: Optional[str] = None) -> float:
    target = 0.05 + 0.90 * severity * material_gain
    value = prev_load + 0.10 * (target - prev_load) + float(rng.normal(0, 0.005 + 0.01 * noise_level))
    return apply_fault(float(np.clip(value, 0.0, 1.0)), fault, rng, frozen_value=prev_load)


def sample_motor_current(severity: float, noise_level: float, rng: np.random.Generator,
                         fault: Optional[str] = None) -> Optional[float]:
    return None

