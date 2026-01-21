"""Material Delivery Note event endpoints."""

from fastapi import Depends, HTTPException, Query

from app.application.services.common.uow_service import UnitOfWork
from app.application.services.rpa import MaterialDeliveryNoteOrchestrator
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.deps import get_uow
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.api.routes.rpa.material_delivery_note.router import router
from app.presentation.schemas.rpa_run_schema import (
    RpaRunEventCreateRequest,
    RpaRunEventResponse,
    RpaRunFetchCreateRequest,
    RpaRunFetchResponse,
)


@router.get("/runs/{run_id}/events", response_model=list[RpaRunEventResponse])
def get_run_events(
    run_id: int,
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
):
    """Run制御イベントを取得."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        events = service.get_run_events(run_id, limit=limit)
        return [RpaRunEventResponse.model_validate(event) for event in events]
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/runs/{run_id}/events", response_model=RpaRunEventResponse)
def create_run_event(
    run_id: int,
    request: RpaRunEventCreateRequest,
    uow: UnitOfWork = Depends(get_uow),
    user: User | None = Depends(get_current_user_optional),
):
    """Run制御イベントを追加."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        event = service.repo.add_run_event(
            run_id=run_id,
            event_type=request.event_type,
            message=request.message,
            created_by_user_id=user.id if user else None,
        )
        return RpaRunEventResponse.model_validate(event)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/step1/result", response_model=RpaRunFetchResponse)
def create_step1_result(
    request: RpaRunFetchCreateRequest,
    uow: UnitOfWork = Depends(get_uow),
):
    """Step1取得結果を記録する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    fetch = service.record_run_fetch(
        start_date=request.start_date,
        end_date=request.end_date,
        status=request.status,
        item_count=request.item_count,
        run_created=request.run_created,
        run_updated=request.run_updated,
        message=request.message,
    )
    return RpaRunFetchResponse.model_validate(fetch)


@router.get("/step1/latest", response_model=RpaRunFetchResponse | None)
def get_step1_latest(uow: UnitOfWork = Depends(get_uow)):
    """Step1取得結果の最新を取得する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    fetch = service.get_latest_run_fetch()
    return RpaRunFetchResponse.model_validate(fetch) if fetch else None
