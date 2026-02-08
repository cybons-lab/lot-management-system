"""Execution Queue Router."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.execution_queue_service import ExecutionQueueService
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.schemas.execution_queue_schema import QueueEntryResponse, QueueStatusResponse


router = APIRouter(prefix="/execution-queue", tags=["execution-queue"])


@router.get("/status", response_model=QueueStatusResponse)
def get_queue_status(
    resource_type: Annotated[str, Query(..., description="Resource Type (e.g. smartread_ocr)")],
    resource_id: Annotated[str, Query(..., description="Resource ID (e.g. config_id or 'global')")],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Get current queue status for a resource."""
    service = ExecutionQueueService(db)
    return service.get_status(resource_type, resource_id, current_user.id)


@router.get("/my-tasks", response_model=list[QueueEntryResponse])
def get_my_tasks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    resource_type: str | None = None,
):
    """Get all my active tasks (running/pending)."""
    # This logic wasn't explicitly in service, but we can reuse logic or add new method.
    # Service.get_status returns my_tasks for specific resource.
    # We might want global search.
    # For now let's reuse get_status or implement ad-hoc query here?
    # Better to keep logic in service.

    # Adding ad-hoc implementation for now as service.get_status is resource specific
    # Or strict adherence to user request: "GET /api/execution-queue/my-tasks"

    from sqlalchemy import select

    from app.infrastructure.persistence.models.execution_queue_model import ExecutionQueue

    query = (
        select(ExecutionQueue)
        .where(
            ExecutionQueue.requested_by_user_id == current_user.id,
            ExecutionQueue.status.in_(["running", "pending"]),
        )
        .order_by(ExecutionQueue.created_at.desc())
    )

    if resource_type:
        query = query.where(ExecutionQueue.resource_type == resource_type)

    tasks = db.scalars(query).all()
    return [QueueEntryResponse.model_validate(t) for t in tasks]


@router.delete("/{queue_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_task(
    queue_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Cancel a pending task."""
    service = ExecutionQueueService(db)
    success = service.cancel_pending(queue_id, current_user.id)
    if not success:
        # Check if it exists to give 404 or 400
        # If running -> 400
        # If not found -> 404
        # Assuming 404/400 generic error for simplicity or checking specifics
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not cancel task. It may be running, completed, or not owned by you.",
        )
