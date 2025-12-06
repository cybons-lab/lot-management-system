from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.routes.auth.auth_router import get_current_user_optional, get_current_user
from app.core.database import get_db
from app.models.auth_models import User
from app.models.system_models import ClientLog
from app.schemas.system.system_schemas import ClientLogCreate, ClientLogResponse

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
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    return {"status": "ok"}


@router.get("/logs/recent", response_model=list[ClientLogResponse])
def get_recent_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_user), # Require Auth (Admin check later)
    db: Session = Depends(get_db),
):
    """Get recent system logs (Admin only ideally)."""
    # For now just check login
    logs = (
        db.query(ClientLog)
        .order_by(desc(ClientLog.created_at))
        .limit(limit)
        .all()
    )
    
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "username": l.user_id, # TODO: Join user to get name if needed, simple mapping for now
            "level": l.level,
            "message": l.message,
            "user_agent": l.user_agent,
            "created_at": l.created_at,
        }
        for l in logs
    ]
