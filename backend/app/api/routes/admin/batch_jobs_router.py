"""Batch jobs router (バッチジョブAPI)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.batch_jobs_schema import (
    BatchJobCreate,
    BatchJobExecuteRequest,
    BatchJobExecuteResponse,
    BatchJobListResponse,
    BatchJobResponse,
)
from app.services.batch_jobs_service import BatchJobService


router = APIRouter(prefix="/batch-jobs", tags=["batch-jobs"])


@router.get("", response_model=BatchJobListResponse)
def list_batch_jobs(
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数上限"),
    job_type: str | None = Query(None, description="ジョブ種別でフィルタ"),
    status: str | None = Query(None, description="ステータスでフィルタ"),
    db: Session = Depends(get_db),
):
    """
    バッチジョブ一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        job_type: ジョブ種別でフィルタ（オプション）
        status: ステータスでフィルタ（オプション）
        db: データベースセッション

    Returns:
        バッチジョブのリスト（ページネーション付き）
    """
    service = BatchJobService(db)
    jobs, total = service.get_all(skip=skip, limit=limit, job_type=job_type, status=status)

    page = (skip // limit) + 1 if limit > 0 else 1

    return BatchJobListResponse(
        jobs=[BatchJobResponse.model_validate(job) for job in jobs],
        total=total,
        page=page,
        page_size=limit,
    )


@router.get("/{job_id}", response_model=BatchJobResponse)
def get_batch_job(job_id: int, db: Session = Depends(get_db)):
    """
    バッチジョブ詳細取得.

    Args:
        job_id: ジョブID
        db: データベースセッション

    Returns:
        バッチジョブ詳細

    Raises:
        HTTPException: ジョブが存在しない場合
    """
    service = BatchJobService(db)
    job = service.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch job not found")

    return BatchJobResponse.model_validate(job)


@router.post("", response_model=BatchJobResponse, status_code=status.HTTP_201_CREATED)
def create_batch_job(job: BatchJobCreate, db: Session = Depends(get_db)):
    """
    バッチジョブ作成.

    Args:
        job: 作成するバッチジョブ情報
        db: データベースセッション

    Returns:
        作成されたバッチジョブ
    """
    service = BatchJobService(db)
    created_job = service.create(job)
    return BatchJobResponse.model_validate(created_job)


@router.post("/{job_id}/execute", response_model=BatchJobExecuteResponse)
def execute_batch_job(
    job_id: int,
    request: BatchJobExecuteRequest | None = None,
    db: Session = Depends(get_db),
):
    """
    バッチジョブ実行.

    注意: これはスタブ実装です。本番環境では、非同期ジョブキュー（Celery、RQ等）を使用してください。

    Args:
        job_id: ジョブID
        request: 実行リクエスト（パラメータ上書き可能）
        db: データベースセッション

    Returns:
        実行結果

    Raises:
        HTTPException: ジョブが存在しない場合
    """
    service = BatchJobService(db)

    parameters = request.parameters if request else None
    executed_job = service.execute(job_id, parameters)

    if not executed_job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch job not found")

    return BatchJobExecuteResponse(
        job_id=executed_job.job_id,
        status=executed_job.status,
        message=executed_job.result_message or "Job executed",
    )


@router.post("/{job_id}/cancel", response_model=BatchJobResponse)
def cancel_batch_job(job_id: int, db: Session = Depends(get_db)):
    """
    バッチジョブキャンセル.

    Args:
        job_id: ジョブID
        db: データベースセッション

    Returns:
        キャンセルされたバッチジョブ

    Raises:
        HTTPException: ジョブが存在しないか、キャンセルできない状態の場合
    """
    service = BatchJobService(db)
    cancelled_job = service.cancel(job_id)

    if not cancelled_job:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch job not found or cannot be cancelled",
        )

    return BatchJobResponse.model_validate(cancelled_job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch_job(job_id: int, db: Session = Depends(get_db)):
    """
    バッチジョブ削除.

    Args:
        job_id: ジョブID
        db: データベースセッション

    Raises:
        HTTPException: ジョブが存在しない場合
    """
    service = BatchJobService(db)
    deleted = service.delete(job_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch job not found")

    return None
