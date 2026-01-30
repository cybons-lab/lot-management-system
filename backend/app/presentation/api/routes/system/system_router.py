import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.application.services.system_config_service import ConfigKeys, SystemConfigService
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
    limit: int = 500,
    level: str | None = None,
    user_id: int | None = None,
    search: str | None = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get recent system logs with filtering (Admin only).

    Args:
        limit: Maximum number of logs to return (default: 500)
        level: Filter by log level (error, warning, info)
        user_id: Filter by user ID
        search: Search in message content
        current_user: Current admin user (dependency)
        db: Database session (dependency)
    """
    # Build query with filters
    query = db.query(ClientLog, User).outerjoin(User, ClientLog.user_id == User.id)

    if level:
        query = query.filter(ClientLog.level == level)

    if user_id is not None:
        query = query.filter(ClientLog.user_id == user_id)

    if search:
        query = query.filter(ClientLog.message.ilike(f"%{search}%"))

    logs = query.order_by(desc(ClientLog.created_at)).limit(limit).all()

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


class PublicSystemSettings(BaseModel):
    page_visibility: dict | None
    maintenance_mode: bool


@router.get("/public-settings", response_model=PublicSystemSettings)
def get_public_settings(
    db: Session = Depends(get_db),
    # Authenticated used required (any user)
    _current_user: User = Depends(get_current_user_optional),
):
    """フロントエンド用の公開システム設定を取得."""
    service = SystemConfigService(db)

    # Get config values
    maintenance = service.get_bool(ConfigKeys.MAINTENANCE_MODE)
    visibility_str = service.get(ConfigKeys.PAGE_VISIBILITY, "{}")

    try:
        visibility = json.loads(visibility_str)
    except json.JSONDecodeError:
        visibility = {}

    return PublicSystemSettings(page_visibility=visibility, maintenance_mode=maintenance)
