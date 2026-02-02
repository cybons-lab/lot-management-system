"""Intake history API router.

入庫履歴のAPIエンドポイント。
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.inventory.intake_history_service import IntakeHistoryService
from app.presentation.api.deps import get_db
from app.presentation.schemas.inventory.intake_history_schema import (
    DailyIntakeSummary,
    IntakeHistoryListResponse,
    IntakeHistoryResponse,
)


router = APIRouter(prefix="/intake-history", tags=["intake-history"])


@router.get("", response_model=IntakeHistoryListResponse)
def list_intake_history(
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数上限"),
    supplier_id: int | None = Query(None, description="仕入先IDでフィルタ"),
    warehouse_id: int | None = Query(None, description="倉庫IDでフィルタ"),
    supplier_item_id: int | None = Query(None, description="製品IDでフィルタ"),
    start_date: date | None = Query(None, description="開始日（入庫日）"),
    end_date: date | None = Query(None, description="終了日（入庫日）"),
    search: str | None = Query(None, description="キーワード検索（ロット番号、製品名、仕入先名）"),
    db: Session = Depends(get_db),
):
    """入庫履歴一覧を取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        supplier_id: 仕入先IDでフィルタ
        warehouse_id: 倉庫IDでフィルタ
        supplier_item_id: 製品IDでフィルタ
        start_date: 開始日
        end_date: 終了日
        search: 検索キーワード
        db: データベースセッション

    Returns:
        入庫履歴一覧
    """
    service = IntakeHistoryService(db)
    return service.get_intake_history(
        skip=skip,
        limit=limit,
        supplier_id=supplier_id,
        warehouse_id=warehouse_id,
        supplier_item_id=supplier_item_id,
        start_date=start_date,
        end_date=end_date,
        search_query=search,
    )


@router.get("/calendar-summary", response_model=list[DailyIntakeSummary])
def get_calendar_summary(
    year: int = Query(..., description="年"),
    month: int = Query(..., description="月"),
    warehouse_id: int | None = Query(None, description="倉庫ID"),
    supplier_item_id: int | None = Query(None, description="製品ID"),
    supplier_id: int | None = Query(None, description="仕入先ID"),
    db: Session = Depends(get_db),
):
    """月間の日別入庫集計を取得（カレンダー用）.

    Args:
        year: 年
        month: 月
        warehouse_id: 倉庫ID
        supplier_item_id: 製品ID
        supplier_id: 仕入先ID
        db: データベースセッション

    Returns:
        日別集計リスト
    """
    service = IntakeHistoryService(db)
    return service.get_calendar_summary(
        year=year,
        month=month,
        warehouse_id=warehouse_id,
        supplier_item_id=supplier_item_id,
        supplier_id=supplier_id,
    )


@router.get("/{intake_id}", response_model=IntakeHistoryResponse)
def get_intake_history_detail(
    intake_id: int,
    db: Session = Depends(get_db),
):
    """入庫履歴詳細を取得.

    Args:
        intake_id: 入庫履歴ID (StockHistory ID)
        db: データベースセッション

    Returns:
        入庫履歴詳細

    Raises:
        HTTPException: 入庫履歴が見つからない場合
    """
    service = IntakeHistoryService(db)
    result = service.get_intake_by_id(intake_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"入庫履歴（ID={intake_id}）が見つかりません",
        )

    return result
