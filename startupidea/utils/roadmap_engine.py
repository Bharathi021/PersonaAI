from typing import List

from backend.schemas import RoadmapItem


def build_adaptive_roadmap(missing_skills: list[str], focus_level: str) -> List[RoadmapItem]:
    base_skill = missing_skills[0] if missing_skills else "system design"
    second_skill = missing_skills[1] if len(missing_skills) > 1 else "project execution"

    if focus_level == "Low":
        intensity = "Light"
        daily_load = "90-minute micro-sprints"
    elif focus_level == "High":
        intensity = "Heavy"
        daily_load = "deep 3-hour work blocks"
    else:
        intensity = "Balanced"
        daily_load = "2 focused sessions"

    return [
        RoadmapItem(day_range="Day 1-3", task=f"Learn and practice {base_skill} via {daily_load}", intensity=intensity),
        RoadmapItem(day_range="Day 4-7", task=f"Build mini project using {base_skill} + {second_skill}", intensity=intensity),
        RoadmapItem(day_range="Day 8", task="Deploy project and document outcomes", intensity=intensity),
    ]
