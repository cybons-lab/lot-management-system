"""Material Delivery Simple (Step1/Step2) endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.rpa.material_delivery_simple_service import (
    MaterialDeliverySimpleService,
)
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.schemas.rpa_schema import (
    MaterialDeliverySimpleJobResponse,
    MaterialDeliverySimpleRequest,
)


router = APIRouter(prefix="/rpa/material-delivery-simple", tags=["rpa"])


def _job_to_response(job, step: int) -> MaterialDeliverySimpleJobResponse:
    return MaterialDeliverySimpleJobResponse(
        id=job.id,
        step=step,
        status=job.status,
        start_date=job.start_date,
        end_date=job.end_date,
        requested_at=job.requested_at,
        requested_by=job.requested_by_user.username if job.requested_by_user else None,
        completed_at=job.completed_at,
        result_message=job.result_message,
        error_message=job.error_message,
    )


@router.get("/history", response_model=list[MaterialDeliverySimpleJobResponse])
def get_step1_history(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    _current_user: User | None = Depends(get_current_user_optional),
):
    """Step1履歴を取得."""
    service = MaterialDeliverySimpleService(db)
    jobs = service.get_step1_history(limit=limit, offset=offset)
    return [_job_to_response(job, step=1) for job in jobs]


@router.post("/step1", response_model=MaterialDeliverySimpleJobResponse)
def execute_step1(
    request: MaterialDeliverySimpleRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Step1実行."""
    service = MaterialDeliverySimpleService(db)
    try:
        job = service.execute_step(
            step=1,
            start_date=request.start_date,
            end_date=request.end_date,
            user=current_user,
        )
        return _job_to_response(job, step=1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/step2", response_model=MaterialDeliverySimpleJobResponse)
def execute_step2(
    request: MaterialDeliverySimpleRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Step2実行."""
    service = MaterialDeliverySimpleService(db)
    try:
        job = service.execute_step(
            step=2,
            start_date=request.start_date,
            end_date=request.end_date,
            user=current_user,
        )
        return _job_to_response(job, step=2)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
