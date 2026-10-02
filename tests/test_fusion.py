"""
test_fusion.py
===============
Covers README section 29, Tests 4 & 5 (sensor faults must not cause false
confident blockage calls) plus fusion mechanics sanity checks.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.ml.fusion import compute_risk, FusionConfig, risk_band


def _base_inputs(anomaly=0.1):
    class_proba = {"NORMAL": 0.9, "PARTIAL BLOCKAGE": 0.08,
                    "DEVELOPING BLOCKAGE": 0.02, "CRITICAL / BLOCKED": 0.0}
    feature_row = {"level_slope": 0.05, "load_slope": 0.05}
    return class_proba, anomaly, feature_row


def test_normal_inputs_produce_low_risk():
    class_proba, anomaly, feats = _base_inputs(anomaly=0.05)
    result = compute_risk(class_proba, anomaly, feats)
    assert result["risk"] < 25
    assert result["status"] == "NORMAL"


def test_critical_inputs_produce_very_high_risk():
    class_proba = {"NORMAL": 0.0, "PARTIAL BLOCKAGE": 0.02,
                    "DEVELOPING BLOCKAGE": 0.08, "CRITICAL / BLOCKED": 0.90}
    feature_row = {"level_slope": 2.5, "load_slope": 3.0}
    result = compute_risk(class_proba, 0.95, feature_row)
    assert result["risk"] > 75
    assert result["status"] == "CRITICAL"


def test_vibration_fault_alone_does_not_force_critical_status():
    """Test 4: a vibration anomaly with all other signals normal (as a faulty
    vibration sensor would look) must not automatically produce CRITICAL."""
    class_proba, _, feats = _base_inputs()
    # only anomaly score is elevated (as if vibration sensor spiking) while
    # classification and trend remain low, AND vibration is flagged unhealthy
    sensor_health = {"vibration": "DEGRADED", "level": "HEALTHY", "load": "HEALTHY"}
    result = compute_risk(class_proba, 0.85, feats, sensor_health=sensor_health)
    assert result["status"] != "CRITICAL"
    assert result["confidence"] < 100


def test_level_sensor_fault_reduces_confidence_not_just_risk():
    """Test 5: a level-sensor fault should reduce confidence, providing a
    'sensor warning' signal rather than silently trusting the reading."""
    class_proba, anomaly, feats = _base_inputs(anomaly=0.4)
    healthy_result = compute_risk(class_proba, anomaly, feats,
                                   sensor_health={"vibration": "HEALTHY", "level": "HEALTHY", "load": "HEALTHY"})
    faulty_result = compute_risk(class_proba, anomaly, feats,
                                  sensor_health={"vibration": "HEALTHY", "level": "FAILED", "load": "HEALTHY"})
    assert faulty_result["confidence"] < healthy_result["confidence"]


def test_fusion_weights_are_configurable_and_normalized():
    cfg = FusionConfig(w_classification=2.0, w_anomaly=1.0, w_trend=1.0)
    cfg.normalize()
    assert abs((cfg.w_classification + cfg.w_anomaly + cfg.w_trend) - 1.0) < 1e-9


def test_risk_band_boundaries():
    assert risk_band(0)[0] == "LOW"
    assert risk_band(30)[0] == "MEDIUM"
    assert risk_band(60)[0] == "HIGH"
    assert risk_band(90)[0] == "VERY HIGH"


if __name__ == "__main__":
    test_normal_inputs_produce_low_risk()
    test_critical_inputs_produce_very_high_risk()
    test_vibration_fault_alone_does_not_force_critical_status()
    test_level_sensor_fault_reduces_confidence_not_just_risk()
    test_fusion_weights_are_configurable_and_normalized()
    test_risk_band_boundaries()
    print("All fusion tests passed.")
