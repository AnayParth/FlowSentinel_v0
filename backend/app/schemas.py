"""Pydantic request and response schemas for ChuteGuard AI."""
from __future__ import annotations
from typing import Literal, Dict, Any, List, Optional
from pydantic import BaseModel, Field


class HardwareSampleInput(BaseModel):
    timestamp: Optional[float] = Field(default=None, description="UNIX timestamp in seconds")
    distance_cm: float = Field(..., description="Ultrasonic surface distance in cm (HC-SR04)")
    load_kg: float = Field(..., description="Material load in kg (HX711)")
    ax_g: float = Field(default=0.0, description="X-axis acceleration in g (MPU6050)")
    ay_g: float = Field(default=0.0, description="Y-axis acceleration in g (MPU6050)")
    az_g: float = Field(default=1.0, description="Z-axis acceleration in g (MPU6050)")
    motor_current_a: Optional[float] = Field(default=None, description="Optional drive motor current in A")


class ManualPredictionRequest(BaseModel):
    vibration_g: float = Field(1.0, ge=0.0, le=10.0, description="Vibration magnitude in g")
    distance_cm: Optional[float] = Field(default=None, description="Measured distance in cm")
    material_level: float = Field(12.0, ge=0.0, le=100.0, description="Material fill level (0-100%)")
    load_kg: float = Field(25.0, ge=0.0, le=10000.0, description="Calibrated load in kg")
    motor_current_a: Optional[float] = Field(default=None, ge=0.0, le=50.0, description="Drive motor current in A")
    sensor_noise: float = Field(0.2, ge=0.0, le=1.0, description="Simulated sensor noise variance")
    fault_vibration: Optional[Literal["dropout", "stuck", "spike", "noisy"]] = None
    fault_level: Optional[Literal["dropout", "stuck", "spike", "noisy"]] = None
    fault_load: Optional[Literal["dropout", "stuck", "spike", "noisy"]] = None
    fault_motor_current: Optional[Literal["dropout", "stuck", "spike", "noisy"]] = None


class FusionWeightsConfig(BaseModel):
    w_classification: float = Field(0.55, ge=0.0, le=1.0)
    w_anomaly: float = Field(0.25, ge=0.0, le=1.0)
    w_trend: float = Field(0.20, ge=0.0, le=1.0)


class SimulationConfig(BaseModel):
    mode: Literal["progressive", "sudden", "random", "normal", "custom"] = "progressive"
    material: Literal["generic", "iron_ore", "coal", "pellets", "limestone"] = "generic"
    enable_motor_current: bool = False
    ramp_seconds: int = Field(90, ge=10, le=300)
    noise_level: float = Field(0.35, ge=0.0, le=1.0)
    tick_delay: float = Field(0.25, ge=0.05, le=2.0)
    manual_severity: Optional[float] = Field(None, ge=0.0, le=1.0)
    fault_vibration: Optional[Literal["dropout", "stuck", "spike", "noisy"]] = None
    fault_level: Optional[Literal["dropout", "stuck", "spike", "noisy"]] = None
    fault_load: Optional[Literal["dropout", "stuck", "spike", "noisy"]] = None
    fault_motor_current: Optional[Literal["dropout", "stuck", "spike", "noisy"]] = None


class SensorHealthStatus(BaseModel):
    vibration: Literal["HEALTHY", "DEGRADED", "FAILED"]
    level: Literal["HEALTHY", "DEGRADED", "FAILED"]
    load: Literal["HEALTHY", "DEGRADED", "FAILED"]
    motor_current: Optional[Literal["HEALTHY", "DEGRADED", "FAILED"]] = None


class RiskBreakdown(BaseModel):
    risk: float = Field(..., description="Fused Blockage Risk (0-100%)")
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "VERY HIGH"]
    status: Literal["NORMAL", "EARLY ANOMALY", "DEVELOPING BLOCKAGE", "CRITICAL"]
    confidence: float = Field(..., description="System confidence (0-100%) reflecting sensor health")
    class_contrib: float
    anomaly_contrib: float
    trend_contrib: float
    contributions: Dict[str, float]
    explanation: Dict[str, str]


class TelemetrySnapshot(BaseModel):
    t: float
    timestamp: float
    mode: Literal["simulation", "hardware", "manual"]
    raw_sensors: Dict[str, Any]
    features: Dict[str, float]
    class_probabilities: Dict[str, float]
    predicted_state: str
    predicted_state_id: int
    anomaly_score: float
    risk_result: RiskBreakdown
    sensor_health: SensorHealthStatus
    active_alerts: List[Dict[str, Any]] = []


class UltrasonicCalibration(BaseModel):
    empty_distance_cm: float = Field(8.0, gt=0.0)
    full_distance_cm: float = Field(0.5, ge=0.0)


class SerialConnectionRequest(BaseModel):
    port: str
    baudrate: int = 115200
    timeout: float = 0.5


class HardwareDiagnostics(BaseModel):
    connected: bool
    port: Optional[str] = None
    baudrate: Optional[int] = None
    valid_samples: int = 0
    malformed_samples: int = 0
    seconds_since_last_valid: Optional[float] = None
    last_error: Optional[str] = None


class RecordSessionStart(BaseModel):
    label: Literal["NORMAL", "PARTIAL BLOCKAGE", "DEVELOPING BLOCKAGE", "CRITICAL / BLOCKED"]


class TrainRequest(BaseModel):
    enable_motor_current: bool = False
    window: int = 20
    random_state: int = 42
    use_synthetic_fallback: bool = True
