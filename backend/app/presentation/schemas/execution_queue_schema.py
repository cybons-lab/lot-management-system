"""Execution Queue Schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class QueueEntryResponse(BaseModel):
    """Execution Queue API Response Schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    resource_type: str
    resource_id: str
    status: str
    requested_by_user_id: int
    parameters: dict[str, Any]
    priority: int
    position: int | None
    started_at: datetime | None
    completed_at: datetime | None
    heartbeat_at: datetime | None
    timeout_seconds: int
    result_message: str | None
    error_message: str | None
    created_at: datetime


class QueueStatusResponse(BaseModel):
    """Queue Status Response."""

    resource_type: str
    resource_id: str
    current_running_task: QueueEntryResponse | None
    queue_length: int
    my_position: int | None
    my_tasks: list[QueueEntryResponse]


class EnqueueResult(BaseModel):
    """Enqueue Operation Result."""

    queue_entry: QueueEntryResponse
    status: str  # pending, running
    position: int | None
    running_by_user_name: str | None  # If pending, who is running it?
