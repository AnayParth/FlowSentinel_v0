"""ChuteGuard AI Core Machine Learning & Physics Processing Package."""
from .features import FEATURE_NAMES, RollingWindowBuffer, extract_features
from .classifier import BlockageClassifier, STATE_NAMES
from .anomaly_model import AnomalyModel
from .fusion import compute_risk, FusionConfig, RISK_BANDS
from .sensor_health import assess_sensor_health
from .sensors import distance_to_level, load_from_hx711, acceleration_magnitude, MATERIAL_PROFILES
from .simulator import LiveSimulator, generate_training_dataset
from .evaluation import evaluate_classifier, evaluate_anomaly_separation, compute_prediction_lead_time

__all__ = [
    "FEATURE_NAMES",
    "RollingWindowBuffer",
    "extract_features",
    "BlockageClassifier",
    "STATE_NAMES",
    "AnomalyModel",
    "compute_risk",
    "FusionConfig",
    "RISK_BANDS",
    "assess_sensor_health",
    "distance_to_level",
    "load_from_hx711",
    "acceleration_magnitude",
    "MATERIAL_PROFILES",
    "LiveSimulator",
    "generate_training_dataset",
    "evaluate_classifier",
    "evaluate_anomaly_separation",
    "compute_prediction_lead_time",
]
