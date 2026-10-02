"""Automated test suite for FlowSentinel FastAPI backend and ML engine."""
import unittest
import numpy as np

from backend.app.ml.features import RollingWindowBuffer, extract_features, FEATURE_NAMES
from backend.app.ml.classifier import BlockageClassifier, STATE_NAMES
from backend.app.ml.anomaly_model import AnomalyModel
from backend.app.ml.fusion import compute_risk, FusionConfig
from backend.app.ml.sensor_health import assess_sensor_health
from backend.app.ml.sensors import distance_to_level, acceleration_magnitude
from backend.app.ml.simulator import generate_training_dataset, LiveSimulator
from backend.app.services.ml_engine import MLEngine


class TestMLPipeline(unittest.TestCase):
    def test_feature_extraction(self):
        v = np.array([1.0, 1.2, 1.1, 1.3, 1.5])
        lvl = np.array([10.0, 12.0, 15.0, 18.0, 22.0])
        ld = np.array([20.0, 25.0, 30.0, 35.0, 40.0])
        cur = np.array([8.0, 8.2, 8.5, 8.7, 9.0])
        feats = extract_features(v, lvl, ld, cur)
        self.assertEqual(len(feats), 20)
        for f in FEATURE_NAMES:
            self.assertIn(f, feats)
            self.assertTrue(np.isfinite(feats[f]))

    def test_rolling_buffer(self):
        buf = RollingWindowBuffer(window=10, enable_motor_current=True)
        for i in range(8):
            buf.push(1.0 + i*0.1, 10.0 + i, 20.0 + i*2, 8.0)
        self.assertTrue(buf.ready())
        feats = buf.features()
        self.assertEqual(len(feats), 20)

    def test_distance_calibration(self):
        level_empty = distance_to_level(7.0, empty_distance_cm=7.0, full_distance_cm=0.5)
        self.assertAlmostEqual(level_empty, 0.0, places=2)
        level_full = distance_to_level(0.5, empty_distance_cm=7.0, full_distance_cm=0.5)
        self.assertAlmostEqual(level_full, 100.0, places=2)

    def test_acceleration_magnitude(self):
        mag = acceleration_magnitude(0.0, 0.0, 1.0)
        self.assertAlmostEqual(mag, 1.0, places=4)

    def test_risk_fusion(self):
        class_proba = {"NORMAL": 0.1, "PARTIAL BLOCKAGE": 0.2, "DEVELOPING BLOCKAGE": 0.3, "CRITICAL / BLOCKED": 0.4}
        anomaly_score = 0.65
        feats = {"level_slope": 1.5, "load_slope": 2.0}
        health = {"vibration": "HEALTHY", "level": "HEALTHY", "load": "HEALTHY"}
        res = compute_risk(class_proba, anomaly_score, feats, FusionConfig(), health)
        self.assertIn("risk", res)
        self.assertIn("risk_level", res)
        self.assertIn("status", res)
        self.assertTrue(0.0 <= res["risk"] <= 100.0)

    def test_sensor_health_faults(self):
        healthy_vals = [1.0, 1.05, 0.98, 1.02, 1.01, 0.99]
        self.assertEqual(assess_sensor_health(healthy_vals, "vibration"), "HEALTHY")
        
        stuck_vals = [2.5, 2.5, 2.5, 2.5, 2.5, 2.5]
        self.assertEqual(assess_sensor_health(stuck_vals, "vibration"), "FAILED")
        
        dropout_vals = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
        self.assertEqual(assess_sensor_health(dropout_vals, "vibration"), "FAILED")

        # Hardware load cell stuck dynamics test -> DEGRADED (~40% health)
        stuck_load = [0.42, 0.42, 0.42, 0.42, 0.42, 0.42]
        self.assertEqual(assess_sensor_health(stuck_load, "load", (0.0, 5.0), is_hardware=True), "DEGRADED")

    def test_ml_engine_integration(self):
        engine = MLEngine()
        sample = {"t": 1.0, "vibration_g": 1.0, "distance_cm": 7.5, "load_kg": 22.0}
        res = engine.process_raw_sample(sample, stream="simulation")
        self.assertIn("predicted_state", res)
        self.assertIn("risk_result", res)
        self.assertIn("sensor_health", res)


if __name__ == "__main__":
    unittest.main()
