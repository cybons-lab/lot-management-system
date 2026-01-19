from __future__ import annotations

from datetime import datetime

from app.presentation.schemas.common.base import BaseSchema


class ClientLogCreate(BaseSchema):
    """Client log creation schema."""

    level: str = "info"
    message: str
    user_agent: str | None = None
    request_id: str | None = None


class ClientLogResponse(BaseSchema):
    """Client log response schema."""

    id: int
    user_id: int | None
    username: str | None = None  # Joined info
    level: str
    message: str
    user_agent: str | None
    request_id: str | None
    created_at: datetime
