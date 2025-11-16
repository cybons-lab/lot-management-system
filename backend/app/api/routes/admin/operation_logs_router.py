"""Operation logs router (操作ログ・マスタ変更履歴API)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.operation_logs_schema import (
    MasterChangeLogListResponse,
    MasterChangeLogResponse,
    OperationLogListResponse,
    OperationLogResponse,
)
from app.services.operation_logs_service import MasterChangeLogService, OperationLogService


router = APIRouter(tags=["logs"])


@router.get("/operation-logs", response_model=OperationLogListResponse)
def list_operation_logs(
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数上限"),
    user_id: int | None = Query(None, description="ユーザーIDでフィルタ"),
    operation_type: str | None = Query(None, description="操作種別でフィルタ"),
    target_table: str | None = Query(None, description="対象テーブル名でフィルタ"),
    start_date: datetime | None = Query(None, description="開始日時（この日時以降）"),
    end_date: datetime | None = Query(None, description="終了日時（この日時以前）"),
    db: Session = Depends(get_db),
):
    """
    操作ログ一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        user_id: ユーザーIDでフィルタ（オプション）
        operation_type: 操作種別でフィルタ（オプション）
        target_table: 対象テーブル名でフィルタ（オプション）
        start_date: 開始日時（オプション）
        end_date: 終了日時（オプション）
        db: データベースセッション

    Returns:
        操作ログのリスト（ページネーション付き）
    """
    service = OperationLogService(db)
    logs, total = service.get_all(
        skip=skip,
        limit=limit,
        user_id=user_id,
        operation_type=operation_type,
        target_table=target_table,
        start_date=start_date,
        end_date=end_date,
    )

    page = (skip // limit) + 1 if limit > 0 else 1

    return OperationLogListResponse(
        logs=[OperationLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=limit,
    )


@router.get("/operation-logs/{log_id}", response_model=OperationLogResponse)
def get_operation_log(log_id: int, db: Session = Depends(get_db)):
    """
    操作ログ詳細取得.

    Args:
        log_id: ログID
        db: データベースセッション

    Returns:
        操作ログ詳細

    Raises:
        HTTPException: ログが存在しない場合
    """
    service = OperationLogService(db)
    log = service.get_by_id(log_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operation log not found")

    return OperationLogResponse.model_validate(log)


@router.get("/master-change-logs", response_model=MasterChangeLogListResponse)
def list_master_change_logs(
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数上限"),
    table_name: str | None = Query(None, description="テーブル名でフィルタ"),
    record_id: int | None = Query(None, description="レコードIDでフィルタ"),
    change_type: str | None = Query(None, description="変更種別でフィルタ"),
    changed_by: int | None = Query(None, description="変更者でフィルタ"),
    start_date: datetime | None = Query(None, description="開始日時（この日時以降）"),
    end_date: datetime | None = Query(None, description="終了日時（この日時以前）"),
    db: Session = Depends(get_db),
):
    """
    マスタ変更履歴一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        table_name: テーブル名でフィルタ（オプション）
        record_id: レコードIDでフィルタ（オプション）
        change_type: 変更種別でフィルタ（オプション）
        changed_by: 変更者でフィルタ（オプション）
        start_date: 開始日時（オプション）
        end_date: 終了日時（オプション）
        db: データベースセッション

    Returns:
        マスタ変更履歴のリスト（ページネーション付き）
    """
    service = MasterChangeLogService(db)
    logs, total = service.get_all(
        skip=skip,
        limit=limit,
        table_name=table_name,
        record_id=record_id,
        change_type=change_type,
        changed_by=changed_by,
        start_date=start_date,
        end_date=end_date,
    )

    page = (skip // limit) + 1 if limit > 0 else 1

    return MasterChangeLogListResponse(
        logs=[MasterChangeLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=limit,
    )


@router.get("/master-change-logs/{change_log_id}", response_model=MasterChangeLogResponse)
def get_master_change_log(change_log_id: int, db: Session = Depends(get_db)):
    """
    マスタ変更履歴詳細取得.

    Args:
        change_log_id: 変更ログID
        db: データベースセッション

    Returns:
        マスタ変更履歴詳細

    Raises:
        HTTPException: ログが存在しない場合
    """
    service = MasterChangeLogService(db)
    log = service.get_by_id(change_log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Master change log not found"
        )

    return MasterChangeLogResponse.model_validate(log)


@router.get(
    "/master-change-logs/record/{table_name}/{record_id}",
    response_model=list[MasterChangeLogResponse],
)
def get_master_change_logs_by_record(
    table_name: str,
    record_id: int,
    db: Session = Depends(get_db),
):
    """
    特定レコードのマスタ変更履歴取得.

    Args:
        table_name: テーブル名
        record_id: レコードID
        db: データベースセッション

    Returns:
        マスタ変更履歴のリスト（降順）
    """
    service = MasterChangeLogService(db)
    logs = service.get_by_record(table_name, record_id)

    return [MasterChangeLogResponse.model_validate(log) for log in logs]
