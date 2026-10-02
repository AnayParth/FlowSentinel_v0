"""
test_simulator.py
==================
Covers README section 29, Tests 2 & 3 (gradual vs sudden blockage) plus 7
(different seeds still function), and basic sanity of the training dataset.
"""
import numpy as np
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.ml.simulator import generate_training_dataset, LiveSimulator, STATE_NAMES


def test_training_dataset_has_all_states_and_no_nans():
    df = generate_training_dataset(n_samples_per_state=50, seed=1)
    assert set(df["state"].unique()) == {0, 1, 2, 3}
    assert df.isnull().values.sum() == 0
    assert len(df) == 200


def test_progressive_mode_increases_severity_over_time():
    """Test 2: gradual blockage -> severity (and therefore risk inputs) rises
    progressively rather than jumping."""
    sim = LiveSimulator(mode="progressive", ramp_seconds=50, seed=3)
    severities = [sim.step()["severity_true"] for _ in range(60)]
    early_avg = np.mean(severities[:10])
    late_avg = np.mean(severities[-10:])
    assert late_avg > early_avg
    # progressive should not jump: no single-step change should be extreme
    diffs = np.abs(np.diff(severities))
    assert diffs.max() < 0.35


def test_sudden_mode_has_a_sharp_transition():
    """Test 3: sudden blockage -> rapid severity increase after the trigger point."""
    sim = LiveSimulator(mode="sudden", ramp_seconds=40, seed=5)
    severities = [sim.step()["severity_true"] for _ in range(45)]
    before_trigger = np.mean(severities[:15])
    after_trigger = np.mean(severities[-10:])
    assert after_trigger > before_trigger + 0.3


def test_different_seeds_still_produce_valid_output():
    """Test 7: different random seeds -> model/simulator still functions."""
    for seed in [1, 2, 3, 100, 9999]:
        sim = LiveSimulator(mode="random", seed=seed)
        sample = sim.step()
        assert 0.0 <= sample["severity_true"] <= 1.0
        assert sample["state_true"] in STATE_NAMES


def test_noise_increase_keeps_system_stable():
    """Test 6: noise increase -> system remains reasonably stable (no NaN/inf,
    values stay within sane physical bounds)."""
    sim = LiveSimulator(mode="normal", noise_level=1.0, seed=7)
    for _ in range(50):
        sample = sim.step()
        assert np.isfinite(sample["vibration"])
        assert 0.8 <= sample["vibration"] <= 1.2
        assert 0.0 <= sample["level"] <= 100.0
        assert 0.0 <= sample["load"] <= 1.0
        assert 0.5 <= sample["distance_cm"] <= 7.0
        assert sample["motor_current"] is None


if __name__ == "__main__":
    test_training_dataset_has_all_states_and_no_nans()
    test_progressive_mode_increases_severity_over_time()
    test_sudden_mode_has_a_sharp_transition()
    test_different_seeds_still_produce_valid_output()
    test_noise_increase_keeps_system_stable()
    print("All simulator tests passed.")
