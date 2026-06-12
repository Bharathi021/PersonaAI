from functools import lru_cache
from typing import Dict

import numpy as np
from sklearn.linear_model import LogisticRegression


@lru_cache(maxsize=1)
def _model_bundle():
    # Synthetic training data: [skill_match, consistency, distraction]
    X = np.array(
        [
            [85, 80, 15],
            [72, 68, 30],
            [60, 55, 45],
            [40, 35, 70],
            [25, 30, 85],
            [90, 88, 10],
            [50, 42, 63],
            [68, 75, 28],
            [35, 44, 75],
        ]
    )
    y = np.array([2, 2, 1, 0, 0, 2, 1, 2, 0])

    clf = LogisticRegression(multi_class="multinomial", max_iter=1000)
    clf.fit(X, y)
    return clf


def run_prediction(skill_match: float, consistency: float, distraction: float) -> Dict[str, object]:
    clf = _model_bundle()
    features = np.array([[skill_match, consistency, distraction]])
    probs = clf.predict_proba(features)[0]
    label_map = {0: "Failure", 1: "Moderate Risk", 2: "Success"}

    pred_idx = int(np.argmax(probs))
    prediction = label_map[pred_idx]

    readiness = round(skill_match * 0.45 + consistency * 0.4 + (100 - distraction) * 0.15, 2)

    return {
        "readiness_score": readiness,
        "prediction": prediction,
        "confidence": float(round(probs[pred_idx], 3)),
    }


def generate_reason(missing_skills: list[str], consistency_score: float, distraction_risk: float) -> str:
    reasons = []
    if missing_skills:
        reasons.append(f"missing {', '.join(missing_skills[:3])}")
    if consistency_score < 50:
        reasons.append("low consistency")
    if distraction_risk > 60:
        reasons.append("high distraction risk")

    if not reasons:
        return "Strong skill coverage and stable cognitive performance."

    return "Outcome impacted by " + " + ".join(reasons)
