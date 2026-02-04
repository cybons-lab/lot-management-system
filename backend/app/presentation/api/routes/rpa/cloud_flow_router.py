"""Cloud Flow router - ジョブキュー管理API."""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.cloud_flow_service import CloudFlowService
from app.core.database import get_db
from app.infrastructure.persistence.models import User
from app.presentation.api.routes.auth.auth_router import (
    get_current_admin,
    get_current_user,
    get_current_user_optional,
)
from app.presentation.schemas.cloud_flow_schema import (
    CloudFlowConfigResponse,
    CloudFlowConfigUpdate,
    CloudFlowGenericExecuteRequest,
    CloudFlowJobCreate,
    CloudFlowJobResponse,
    CloudFlowQueueStatus,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rpa/cloud-flow", tags=["cloud-flow"])


def _job_to_response(job, position: int | None = None) -> CloudFlowJobResponse:
    """ジョブをレスポンス形式に変換."""
    return CloudFlowJobResponse(
        id=job.id,
        job_type=job.job_type,
        status=job.status,
        start_date=job.start_date,
        end_date=job.end_date,
        requested_by=job.requested_by_user.username if job.requested_by_user else None,
        requested_at=job.requested_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        result_message=job.result_message,
        error_message=job.error_message,
        position_in_queue=position,
    )


@router.post("/execute-generic", status_code=status.HTTP_200_OK)
async def execute_generic_flow(
    request: CloudFlowGenericExecuteRequest,
    current_user: User = Depends(get_current_user),
):
    """汎用Cloud Flow実行."""
    from app.application.services.rpa import call_power_automate_flow

    logger.info(
        "Generic Cloud Flow execution requested",
        extra={"user_id": current_user.id, "flow_url": request.flow_url[:50] + "..."},
    )
    return await call_power_automate_flow(
        flow_url=request.flow_url,
        json_payload=request.json_payload or {},
    )


@router.post("/jobs", response_model=CloudFlowJobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    request: CloudFlowJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CloudFlowJobResponse:
    """ジョブを作成（キューに追加）.

    ゲストユーザーは実行不可。
    他ユーザーが実行中の場合は待機状態で追加。
    """
    logger.info(
        "Cloud Flow job creation requested",
        extra={
            "job_type": request.job_type,
            "start_date": str(request.start_date),
            "end_date": str(request.end_date),
            "user_id": current_user.id,
        },
    )
    service = CloudFlowService(db, background_tasks=background_tasks)
    job = service.create_job(
        job_type=request.job_type,
        start_date=str(request.start_date),
        end_date=str(request.end_date),
        user=current_user,
    )

    # 待ち順番を計算
    queue_status = service.get_queue_status(request.job_type, current_user.id)
    logger.info("Cloud Flow job created", extra={"job_id": job.id, "job_status": job.status})
    return _job_to_response(job, queue_status["your_position"])


@router.get("/jobs", response_model=list[CloudFlowJobResponse])
def get_job_history(
    job_type: str = "progress_download",
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    _current_user: User | None = Depends(get_current_user_optional),
) -> list[CloudFlowJobResponse]:
    """ジョブ履歴を取得."""
    service = CloudFlowService(db)
    jobs = service.get_job_history(job_type, limit, offset)
    return [_job_to_response(job) for job in jobs]


@router.get("/jobs/current", response_model=CloudFlowQueueStatus)
def get_queue_status(
    job_type: str = "progress_download",
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> CloudFlowQueueStatus:
    """現在のキュー状態を取得.

    - current_job: 実行中のジョブ
    - pending_jobs: 待機中のジョブ一覧
    - your_position: 自分の待ち順番
    """
    service = CloudFlowService(db)
    user_id = current_user.id if current_user else None
    status_dict = service.get_queue_status(job_type, user_id)

    return CloudFlowQueueStatus(
        current_job=_job_to_response(status_dict["current_job"])
        if status_dict["current_job"]
        else None,
        pending_jobs=[
            _job_to_response(job, i + 1) for i, job in enumerate(status_dict["pending_jobs"])
        ],
        your_position=status_dict["your_position"],
    )


@router.get("/configs/{config_key}", response_model=CloudFlowConfigResponse | None)
def get_config(
    config_key: str,
    optional: bool = False,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> CloudFlowConfigResponse | None:
    """設定を取得.

    Args:
        config_key: 設定キー
        optional: Trueの場合、未設定時に404ではなくnullを返す
        db: データベースセッション
        _current_user: 認証済みユーザー

    Returns:
        設定情報。optionalがTrueで未設定の場合はNone
    """
    service = CloudFlowService(db)
    config = service.get_config(config_key)
    if not config:
        if optional:
            return None
        raise HTTPException(status_code=404, detail=f"Config '{config_key}' not found")
    return CloudFlowConfigResponse.model_validate(config)


@router.put("/configs/{config_key}", response_model=CloudFlowConfigResponse)
def update_config(
    config_key: str,
    request: CloudFlowConfigUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_admin),
) -> CloudFlowConfigResponse:
    """設定を登録/更新."""
    logger.info("Cloud Flow config updated", extra={"config_key": config_key})
    service = CloudFlowService(db)
    config = service.set_config(config_key, request.config_value, request.description)
    return CloudFlowConfigResponse.model_validate(config)
