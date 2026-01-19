from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.system_models import ClientLog
from app.presentation.api.routes.auth.auth_router import (
    get_current_admin,
    get_current_user_optional,
)
from app.presentation.schemas.system.system_schemas import ClientLogCreate, ClientLogResponse


router = APIRouter()


@router.post("/logs/client", status_code=201)
def create_client_log(
    log_in: ClientLogCreate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Save client-side log."""
    log = ClientLog(
        user_id=current_user.id if current_user else None,
        level=log_in.level,
        message=log_in.message,
        user_agent=log_in.user_agent,
        request_id=log_in.request_id,
        created_at=datetime.now(UTC),
    )
    db.add(log)
    db.commit()
    return {"status": "ok"}


@router.get("/logs/recent", response_model=list[ClientLogResponse])
def get_recent_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_admin),  # Require Admin
    db: Session = Depends(get_db),
):
    """Get recent system logs (Admin only ideally)."""
    # Join User to get username
    logs = (
        db.query(ClientLog, User)
        .outerjoin(User, ClientLog.user_id == User.id)
        .order_by(desc(ClientLog.created_at))
        .limit(limit)
        .all()
    )

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "username": user.username if user else None,
            "level": log.level,
            "message": log.message,
            "user_agent": log.user_agent,
            "request_id": log.request_id,
            "created_at": log.created_at,
        }
        for log, user in logs
    ]
