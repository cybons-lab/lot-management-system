import json
import re
from datetime import UTC, datetime
from pathlib import Path

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


class BackendLogEntry(BaseModel):
    timestamp: str
    level: str
    logger: str
    message: str
    module: str
    function: str
    line: int


@router.get("/logs/backend/recent", response_model=list[BackendLogEntry])
def get_recent_backend_logs(
    limit: int = 200,
    _current_user: User = Depends(get_current_admin),
):
    """Get recent backend logs from log file (Admin only).

    Args:
        limit: Maximum number of logs to return (default: 200)
        _current_user: Current admin user (dependency)

    Returns:
        List of recent backend log entries
    """
    log_file = Path("logs/app.log")

    if not log_file.exists():
        return []

    try:
        # Read last N lines from log file
        with open(log_file, encoding="utf-8") as f:
            # Get all lines
            lines = f.readlines()

        # Take last 'limit' lines
        recent_lines = lines[-limit:] if len(lines) > limit else lines

        # Parse log lines (simplified parsing)
        logs: list[BackendLogEntry] = []
        for line in recent_lines:
            parsed = _parse_log_line(line)
            if parsed:
                logs.append(parsed)

        return logs

    except Exception:
        # Return empty list on error
        return []


def _parse_log_line(line: str) -> BackendLogEntry | None:
    """Parse a log line into BackendLogEntry.

    Expected format: 2024-01-30 12:34:56,789 - logger.name - LEVEL - message

    Args:
        line: Log line to parse

    Returns:
        Parsed log entry or None if parsing fails
    """
    # Regex pattern for log format
    pattern = r"(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2},\d{3})\s-\s([\w\.]+)\s-\s(\w+)\s-\s(.+)"
    match = re.match(pattern, line.strip())

    if not match:
        return None

    timestamp_str, logger_name, level, message = match.groups()

    # Convert timestamp format
    try:
        dt = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S,%f")
        iso_timestamp = dt.isoformat()
    except ValueError:
        iso_timestamp = timestamp_str

    return BackendLogEntry(
        timestamp=iso_timestamp,
        level=level,
        logger=logger_name,
        message=message,
        module="",  # Not available from log file
        function="",  # Not available from log file
        line=0,  # Not available from log file
    )
