from typing import Dict


def evaluate_cognitive_state(
    session_time_minutes: int,
    task_completion_rate: float,
    typing_delay_ms: int,
    activity_gap_count: int,
) -> Dict[str, float | str]:
    completion_score = task_completion_rate * 100
    delay_penalty = min(typing_delay_ms / 40, 40)
    gap_penalty = min(activity_gap_count * 6, 42)

    consistency_score = max(0.0, min(100.0, round(completion_score - delay_penalty * 0.4 - gap_penalty * 0.6, 2)))

    if consistency_score >= 75 and activity_gap_count <= 3:
        focus_level = "High"
    elif consistency_score >= 45:
        focus_level = "Medium"
    else:
        focus_level = "Low"

    distraction_risk = round(min(100.0, max(0.0, 100 - consistency_score + activity_gap_count * 3)), 2)

    if session_time_minutes < 25:
        distraction_risk = min(100.0, round(distraction_risk + 7.0, 2))

    return {
        "focus_level": focus_level,
        "consistency_score": consistency_score,
        "distraction_risk": distraction_risk,
    }
