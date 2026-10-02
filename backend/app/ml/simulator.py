"""Synthetic dataset generator and stateful LiveSimulator for ChuteGuard AI."""
from __future__ import annotations
from typing import Dict, Optional, Any
import numpy as np
import pandas as pd

from .sensors import (
    sample_vibration, sample_level, sample_load, sample_motor_current,
    MATERIAL_PROFILES,
)
from .classifier import STATE_NAMES

STATE_SEVERITY_RANGES = {
    0: (0.00, 0.22),
    1: (0.15, 0.48),
    2: (0.40, 0.78),
    3: (0.68, 1.00),
}


def severity_to_state(severity: float) -> int:
    if severity < 0.20:
        return 0
    if severity < 0.45:
        return 1
    if severity < 0.72:
        return 2
    return 3


def generate_training_dataset(n_samples_per_state: int = 400,
                               noise_level: float = 0.35,
                               material: str = "generic",
                               enable_motor_current: bool = True,
                               seed: int = 42) -> pd.DataFrame:
    from .features import extract_features

    rng = np.random.default_rng(seed)
    mat = MATERIAL_PROFILES.get(material, MATERIAL_PROFILES["generic"])
    rows = []

    for state, (lo, hi) in STATE_SEVERITY_RANGES.items():
        for _ in range(n_samples_per_state):
            severity = float(rng.uniform(lo, hi))
            drift = float(rng.uniform(-0.03, 0.05))

            window = 20
            level = 15.0 + 70.0 * severity + float(rng.normal(0, 5))
            load = float(np.clip(0.05 + 0.90 * severity + float(rng.normal(0, 0.02)), 0.0, 1.0))
            v_val = 0.98
            vib, lvl, ld, cur = [], [], [], []
            for i in range(window):
                s_t = float(np.clip(severity + drift * (i / window), 0, 1))
                v_val = sample_vibration(s_t, noise_level, rng, mat["vib_gain"], prev_vibration=v_val)
                vib.append(v_val)
                level = sample_level(level, s_t, noise_level, rng, mat["level_gain"])
                lvl.append(level)
                load = sample_load(load, s_t, noise_level, rng, mat["load_gain"])
                ld.append(load)
                if enable_motor_current:
                    cur.append(sample_motor_current(s_t, noise_level, rng))
                else:
                    cur.append(np.nan)

            feats = extract_features(
                np.array(vib), np.array(lvl), np.array(ld),
                np.array(cur) if enable_motor_current else None,
            )
            feats["state"] = state
            feats["state_name"] = STATE_NAMES[state]
            feats["severity_true"] = severity
            rows.append(feats)

    df = pd.DataFrame(rows)
    return df.sample(frac=1.0, random_state=seed).reset_index(drop=True)


class LiveSimulator:
    def __init__(self, mode: str = "progressive", noise_level: float = 0.35,
                 material: str = "generic", enable_motor_current: bool = False,
                 ramp_seconds: int = 90, seed: Optional[int] = None,
                 sensor_faults: Optional[Dict[str, Optional[str]]] = None):
        self.mode = mode
        self.noise_level = noise_level
        self.material = material
        self.enable_motor_current = enable_motor_current
        self.ramp_seconds = max(10, ramp_seconds)
        self.sensor_faults: Dict[str, str] = {k: v for k, v in (sensor_faults or {}).items() if v}
        self.rng = np.random.default_rng(seed)

        self.t = 0
        self.severity = 0.02
        self._manual_severity = 0.1
        self._sudden_trigger_t = self.ramp_seconds // 2

        self._level = 15.0
        self._load = 0.05
        self._vibration = 0.98

    def set_mode(self, mode: str):
        self.mode = mode

    def set_manual_severity(self, value: float):
        self._manual_severity = float(np.clip(value, 0.0, 1.0))

    def set_sensor_fault(self, sensor: str, fault: Optional[str]):
        if fault is None:
            self.sensor_faults.pop(sensor, None)
        else:
            self.sensor_faults[sensor] = fault

    def _advance_severity(self):
        if self.mode == "normal":
            self.severity = float(np.clip(0.05 + self.rng.normal(0, 0.02), 0.0, 0.15))
        elif self.mode == "progressive":
            frac = min(1.0, self.t / self.ramp_seconds)
            self.severity = float(np.clip(frac + self.rng.normal(0, 0.015), 0.0, 1.0))
        elif self.mode == "sudden":
            if self.t < self._sudden_trigger_t:
                self.severity = float(np.clip(0.05 + self.rng.normal(0, 0.02), 0.0, 0.15))
            else:
                ramp = (self.t - self._sudden_trigger_t) / max(5, self.ramp_seconds * 0.15)
                self.severity = float(np.clip(ramp, 0.0, 1.0))
        elif self.mode == "random":
            step = float(self.rng.normal(0, 0.05))
            self.severity = float(np.clip(self.severity + step, 0.0, 1.0))
        elif self.mode == "custom":
            self.severity = self._manual_severity

    def step(self) -> Dict[str, Any]:
        self._advance_severity()
        mat = MATERIAL_PROFILES.get(self.material, MATERIAL_PROFILES["generic"])
        rng = self.rng

        self._vibration = sample_vibration(self.severity, self.noise_level, rng,
                                         mat["vib_gain"], self.sensor_faults.get("vibration"),
                                         prev_vibration=self._vibration)
        vib = self._vibration
        self._level = sample_level(self._level, self.severity, self.noise_level, rng,
                                   mat["level_gain"], self.sensor_faults.get("level"))
        self._load = sample_load(self._load, self.severity, self.noise_level, rng,
                                 mat["load_gain"], self.sensor_faults.get("load"))
        if self.enable_motor_current:
            cur = sample_motor_current(self.severity, self.noise_level, rng,
                                       self.sensor_faults.get("motor_current"))
        else:
            cur = None

        # Derive simulated distance from level (assuming empty=7.0cm, full=0.5cm)
        empty_d, full_d = 7.0, 0.5
        distance_cm = empty_d - (self._level / 100.0) * (empty_d - full_d)

        # Accel components approximating total vibration
        ax = float(rng.normal(0, 0.03))
        ay = float(rng.normal(0, 0.03))
        az = float(np.sqrt(max(0.0, vib**2 - ax**2 - ay**2)))

        sample = {
            "t": self.t,
            "vibration": float(vib),
            "level": float(self._level),
            "load": float(self._load),
            "load_kg": float(self._load),
            "distance_cm": float(distance_cm),
            "ax_g": ax,
            "ay_g": ay,
            "az_g": az,
            "motor_current": cur,
            "motor_current_a": cur,
            "severity_true": float(self.severity),
            "state_true": severity_to_state(self.severity),
            "state_true_name": STATE_NAMES[severity_to_state(self.severity)],
        }
        self.t += 1
        return sample

    def reset(self):
        self.t = 0
        self.severity = 0.02
        self._level = 15.0
        self._load = 0.05
        self._vibration = 0.98
