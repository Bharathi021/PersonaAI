from fastapi import APIRouter

from backend.schemas import BusinessModelResponse, PlanTier

router = APIRouter()


@router.get("/plans", response_model=BusinessModelResponse)
def plans():
    return BusinessModelResponse(
        plans=[
            PlanTier(
                name="Free",
                tagline="Basic insights for early users",
                features=["Resume skill match", "Cognitive state snapshot", "1 prediction/week"],
                recommended=False,
            ),
            PlanTier(
                name="Premium",
                tagline="Roadmap and adaptive prediction engine",
                features=["Unlimited predictions", "Adaptive roadmap", "Smart GPT feedback"],
                recommended=True,
            ),
            PlanTier(
                name="Enterprise",
                tagline="Workforce analytics for teams",
                features=["Team readiness dashboard", "Risk employee detection", "Performance analytics"],
                recommended=False,
            ),
        ],
        api_partner_note="API access available for recruitment platforms and HRIS integrations.",
    )
