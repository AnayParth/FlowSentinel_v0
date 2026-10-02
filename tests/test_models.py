"""
test_models.py
===============
Covers README section 29, Test 1 (normal operation -> low risk) and general
model sanity checks.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.ml.simulator import generate_training_dataset
from backend.app.ml.anomaly_model import AnomalyModel
from backend.app.ml.classifier import BlockageClassifier
from backend.app.ml.features import FEATURE_NAMES


def _train():
    df = generate_training_dataset(n_samples_per_state=200, seed=11)
    anomaly = AnomalyModel(random_state=11).fit(df, normal_only=True)
    clf = BlockageClassifier(random_state=11)
    X_test, y_test = clf.fit_with_holdout(df, random_state=11)
    return df, anomaly, clf, X_test, y_test


def test_random_forest_reaches_reasonable_accuracy():
    _, _, clf, X_test, y_test = _train()
    acc = clf.model.score(X_test, y_test)
    # not trivially separable (per spec) but should clearly beat random (25%)
    assert 0.5 < acc < 1.0


def test_isolation_forest_scores_are_bounded():
    df, anomaly, _, _, _ = _train()
    scores = anomaly.anomaly_scores_batch(df)
    assert scores.min() >= 0.0
    assert scores.max() <= 1.0


def test_normal_operation_produces_low_anomaly_and_normal_classification():
    """Test 1: a clearly-normal feature row should score low anomaly and be
    classified as NORMAL with reasonable confidence."""
    df, anomaly, clf, _, _ = _train()
    normal_row = df[df["state"] == 0].iloc[0].to_dict()
    score = anomaly.anomaly_score(normal_row)
    proba = clf.predict_proba_row(normal_row)
    assert score < 0.6
    assert proba["NORMAL"] == max(proba.values())


def test_feature_importances_cover_all_features():
    _, _, clf, _, _ = _train()
    importances = clf.feature_importances()
    assert set(importances.keys()) == set(FEATURE_NAMES)
    assert all(v >= 0 for v in importances.values())


if __name__ == "__main__":
    test_random_forest_reaches_reasonable_accuracy()
    test_isolation_forest_scores_are_bounded()
    test_normal_operation_produces_low_anomaly_and_normal_classification()
    test_feature_importances_cover_all_features()
    print("All model tests passed.")
