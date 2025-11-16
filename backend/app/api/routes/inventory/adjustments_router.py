"""Inventory adjustment API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.inventory.inventory_schema import AdjustmentCreate, AdjustmentResponse
from app.services.inventory.adjustment_service import AdjustmentService


router = APIRouter(prefix="/adjustments", tags=["adjustments"])


@router.post("", response_model=AdjustmentResponse, status_code=status.HTTP_201_CREATED)
def create_adjustment(
    adjustment: AdjustmentCreate,
    db: Session = Depends(get_db),
):
    """
    在庫調整登録.

    Args:
        adjustment: 在庫調整データ
        db: データベースセッション

    Returns:
        作成された在庫調整レコード

    Note:
        - ロットの current_quantity を更新
        - stock_history に履歴を記録
    """
    service = AdjustmentService(db)
    try:
        return service.create_adjustment(adjustment)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("", response_model=list[AdjustmentResponse])
def list_adjustments(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    lot_id: int | None = None,
    adjustment_type: str | None = None,
    db: Session = Depends(get_db),
):
    """
    在庫調整履歴取得.

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数上限
        lot_id: ロットIDでフィルタ
        adjustment_type: 調整タイプでフィルタ
        db: データベースセッション

    Returns:
        在庫調整レコードのリスト
    """
    service = AdjustmentService(db)
    return service.get_adjustments(
        skip=skip,
        limit=limit,
        lot_id=lot_id,
        adjustment_type=adjustment_type,
    )


@router.get("/{adjustment_id}", response_model=AdjustmentResponse)
def get_adjustment(
    adjustment_id: int,
    db: Session = Depends(get_db),
):
    """
    在庫調整詳細取得.

    Args:
        adjustment_id: 在庫調整ID
        db: データベースセッション

    Returns:
        在庫調整レコード

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    service = AdjustmentService(db)
    adjustment = service.get_adjustment_by_id(adjustment_id)
    if not adjustment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Adjustment with id={adjustment_id} not found",
        )
    return adjustment
