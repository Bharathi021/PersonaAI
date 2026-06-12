from fastapi import APIRouter

from backend.schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    ExecutionPlanRequest,
    ExecutionPlanResponse,
)
from utils.openai_engine import generate_chat_reply, generate_execution_plan

router = APIRouter()


@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat(payload: AssistantChatRequest) -> AssistantChatResponse:
    reply = generate_chat_reply(payload.question, payload.context, payload.api_key)
    return AssistantChatResponse(reply=reply)


@router.post("/plan", response_model=ExecutionPlanResponse)
def assistant_plan(payload: ExecutionPlanRequest) -> ExecutionPlanResponse:
    plan_text = generate_execution_plan(
        role=payload.role,
        focus_level=payload.focus_level,
        missing_skills=payload.missing_skills,
        guided_project=payload.guided_project,
        include_hourly=payload.include_hourly,
        api_key=payload.api_key,
    )
    return ExecutionPlanResponse(plan_text=plan_text)
