from datetime import datetime
from typing import Any, List, Literal

from pydantic import BaseModel, Field # type: ignore


RoleName = Literal["Backend Developer", "Data Scientist", "AI Engineer"]
PredictionLabel = Literal["Success", "Moderate Risk", "Failure"]
FocusLevel = Literal["Low", "Medium", "High"]


class AuthRequest(BaseModel): # pyright: ignore[reportUntypedBaseClass]
    email: str
    full_name: str


class AuthResponse(BaseModel):
    user_id: int
    token: str


class ResumeAnalysisRequest(BaseModel):
    user_id: int
    role: RoleName
    resume_text: str = Field(..., min_length=20)
    session_time_minutes: int = Field(..., ge=5, le=600)
    task_completion_rate: float = Field(..., ge=0, le=1)
    typing_delay_ms: int = Field(..., ge=20, le=5000)
    activity_gap_count: int = Field(..., ge=0, le=50)
    local_processing_mode: bool = True


class SkillInsight(BaseModel):
    extracted_skills: List[str]
    role_required_skills: List[str]
    missing_skills: List[str]
    skill_match_percent: float


class CognitiveInsight(BaseModel):
    focus_level: FocusLevel
    consistency_score: float
    distraction_risk: float


class PredictionInsight(BaseModel):
    readiness_score: float
    prediction: PredictionLabel
    reason: str


class RoadmapItem(BaseModel):
    day_range: str
    task: str
    intensity: Literal["Light", "Balanced", "Heavy"]


class AnalysisResponse(BaseModel):
    assessment_id: int
    timestamp: datetime
    skill_intelligence: SkillInsight
    cognitive_intelligence: CognitiveInsight
    predictive_intelligence: PredictionInsight
    adaptive_roadmap: List[RoadmapItem]
    gpt_explanation: str
    smart_feedback: str


class DashboardSummary(BaseModel):
    user_id: int
    readiness_score: float
    cognitive_state: CognitiveInsight
    skill_gap_summary: str
    recent_predictions: List[PredictionInsight]
    roadmap_progress_percent: float


class EnterpriseSummary(BaseModel):
    team_size: int
    average_readiness: float
    risk_employees: int
    performance_distribution: dict


class PlanTier(BaseModel):
    name: str
    tagline: str
    features: List[str]
    recommended: bool = False


class BusinessModelResponse(BaseModel):
    plans: List[PlanTier]
    api_partner_note: str


class AssistantChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)
    context: dict[str, Any] = Field(default_factory=dict)
    api_key: str | None = None


class AssistantChatResponse(BaseModel):
    reply: str


class TaskBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: str = Field(..., max_length=2000)
    status: Literal["pending", "in_progress", "done"] = "pending"
    priority: Literal["low", "medium", "high"] = "medium"


class TaskCreate(TaskBase):
    pass


class TaskResponse(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime


class ExecutionPlanRequest(BaseModel):
    role: str
    focus_level: str
    missing_skills: List[str] = Field(default_factory=list)
    guided_project: dict[str, Any] = Field(default_factory=dict)
    include_hourly: bool = False
    api_key: str | None = None


class ExecutionPlanResponse(BaseModel):
    plan_text: str
