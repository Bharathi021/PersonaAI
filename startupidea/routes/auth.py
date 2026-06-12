from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import AuthRequest, AuthResponse
from models.db_models import User

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
def login(payload: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        user = User(email=payload.email, full_name=payload.full_name)
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user:
        raise HTTPException(status_code=500, detail="Could not create user")

    return AuthResponse(user_id=user.id, token=f"demo-token-{user.id}")
