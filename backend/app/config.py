"""Application configuration settings."""
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
RAW_DATASET_PATH = DATA_DIR / "real_sensor_dataset.csv"

# Model paths
CLASSIFIER_PATH = MODEL_DIR / "real_data_classifier.joblib"
ANOMALY_PATH = MODEL_DIR / "real_data_anomaly_model.joblib"
METADATA_PATH = MODEL_DIR / "real_data_model_metadata.joblib"

SYNTHETIC_CLASSIFIER_PATH = DATA_DIR / "models" / "random_forest.joblib"
SYNTHETIC_ANOMALY_PATH = DATA_DIR / "models" / "isolation_forest.joblib"

# Server configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "*",
]
