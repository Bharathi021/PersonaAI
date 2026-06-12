# pyright: reportUnknownVariableType=false, reportUnknownMemberType=false, reportUnknownArgumentType=false, reportUntypedFunctionDecorator=false
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI # pyright: ignore[reportUnknownVariableType]
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.responses import JSONResponse

from backend.database import Base, engine
from routes import analysis, assistant, auth, business, dashboard
from routes.tasks import router as tasks_router

# Load env from backend/.env when running from repository root.
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="PersonaAI API",
    description="Predictive Intelligence for Human Performance",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(business.router, prefix="/api/business", tags=["Business"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["Assistant"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["Tasks"])


@app.get("/api/debug/openai")
def debug_openai_key():
    key = os.getenv("OPENAI_API_KEY")
    return {
        "has_openai_key": bool(key),
        "key_preview": (key[:8] + "...") if key else None,
    }


@app.get("/api/health")
def health() -> JSONResponse:
    return JSONResponse(
        content={
            "status": "ok",
            "product": "PersonaAI",
            "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        }
    )
