from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import CognitiveInsight, DashboardSummary, EnterpriseSummary
from models.db_models import Assessment, User

router = APIRouter()


@router.get("/{user_id}", response_model=DashboardSummary)
def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    records = (
        db.query(Assessment)
        .filter(Assessment.user_id == user_id)
        .order_by(Assessment.created_at.desc())
        .limit(5)
        .all()
    )

    if not records:
        return DashboardSummary(
            user_id=user_id,
            readiness_score=0,
            cognitive_state=CognitiveInsight(
                focus_level="Low",
                consistency_score=0,
                distraction_risk=100,
            ),
            skill_gap_summary="No assessments yet",
            recent_predictions=[],
            roadmap_progress_percent=0,
        )

    latest = records[0]
    roadmap_progress = min(100, len(records) * 18)

    return DashboardSummary(
        user_id=user_id,
        readiness_score=latest.readiness_score,
        cognitive_state=CognitiveInsight(
            focus_level="High" if latest.consistency_score >= 75 else "Medium" if latest.consistency_score >= 45 else "Low",
            consistency_score=latest.consistency_score,
            distraction_risk=latest.distraction_risk,
        ),
        skill_gap_summary=latest.missing_skills or "No critical skill gaps",
        recent_predictions=[
            {
                "readiness_score": row.readiness_score,
                "prediction": row.prediction_label,
                "reason": row.missing_skills or "Strong profile",
            }
            for row in records
        ],
        roadmap_progress_percent=roadmap_progress,
    )


@router.get("/enterprise/metrics", response_model=EnterpriseSummary)
def enterprise_metrics(db: Session = Depends(get_db)):
    records = db.query(Assessment).all()
    if not records:
        return EnterpriseSummary(
            team_size=0,
            average_readiness=0,
            risk_employees=0,
            performance_distribution={"Success": 0, "Moderate Risk": 0, "Failure": 0},
        )

    readiness_values = [row.readiness_score for row in records]
    labels = [row.prediction_label for row in records]

    return EnterpriseSummary(
        team_size=len({row.user_id for row in records}),
        average_readiness=round(sum(readiness_values) / len(readiness_values), 2),
        risk_employees=sum(1 for x in labels if x in {"Failure", "Moderate Risk"}),
        performance_distribution=dict(Counter(labels)),
    )
