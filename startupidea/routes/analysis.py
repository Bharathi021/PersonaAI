from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import AnalysisResponse, ResumeAnalysisRequest
from models.db_models import Assessment, User
from utils.cognitive_engine import evaluate_cognitive_state
from utils.openai_engine import generate_reasoning, generate_roadmap_feedback
from utils.predictive_engine import generate_reason, run_prediction
from utils.privacy import mask_sensitive_text
from utils.roadmap_engine import build_adaptive_roadmap
from utils.skill_engine import extract_skills, match_role

router = APIRouter()


@router.post("/run", response_model=AnalysisResponse)
def run_analysis(payload: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    extracted = extract_skills(payload.resume_text)
    role_result = match_role(payload.role, extracted)

    cognitive = evaluate_cognitive_state(
        payload.session_time_minutes,
        payload.task_completion_rate,
        payload.typing_delay_ms,
        payload.activity_gap_count,
    )

    prediction = run_prediction(
        role_result["skill_match_percent"],
        cognitive["consistency_score"],
        cognitive["distraction_risk"],
    )

    reason = generate_reason(
        role_result["missing_skills"],
        cognitive["consistency_score"],
        cognitive["distraction_risk"],
    )

    roadmap = build_adaptive_roadmap(role_result["missing_skills"], cognitive["focus_level"])
    gpt_explanation = generate_reasoning(
        role_result["missing_skills"],
        cognitive["focus_level"],
        prediction["prediction"],
    )
    smart_feedback = generate_roadmap_feedback(role_result["missing_skills"], cognitive["focus_level"])

    masked_resume = mask_sensitive_text(payload.resume_text) if payload.local_processing_mode else "[stored-with-minimal-retention]"

    row = Assessment(
        user_id=payload.user_id,
        role=payload.role,
        masked_resume=masked_resume,
        skill_match_percent=role_result["skill_match_percent"],
        consistency_score=cognitive["consistency_score"],
        distraction_risk=cognitive["distraction_risk"],
        readiness_score=prediction["readiness_score"],
        prediction_label=prediction["prediction"],
        missing_skills=", ".join(role_result["missing_skills"]),
        local_processing_mode=payload.local_processing_mode,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return AnalysisResponse(
        assessment_id=row.id,
        timestamp=row.created_at,
        skill_intelligence={
            "extracted_skills": extracted,
            "role_required_skills": role_result["role_required_skills"],
            "missing_skills": role_result["missing_skills"],
            "skill_match_percent": role_result["skill_match_percent"],
        },
        cognitive_intelligence=cognitive,
        predictive_intelligence={
            "readiness_score": prediction["readiness_score"],
            "prediction": prediction["prediction"],
            "reason": reason,
        },
        adaptive_roadmap=roadmap,
        gpt_explanation=gpt_explanation,
        smart_feedback=smart_feedback,
    )
