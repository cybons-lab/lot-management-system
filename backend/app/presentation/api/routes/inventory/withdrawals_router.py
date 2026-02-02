"""Withdrawals API router.

出庫（受注外出庫）のAPIエンドポイント。
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.inventory.lot_reservation_service import (
    ReservationInsufficientStockError,
    ReservationLotNotFoundError,
)
from app.application.services.inventory.withdrawal_service import WithdrawalService
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.schemas.inventory.withdrawal_schema import (
    DailyWithdrawalSummary,
    WithdrawalCancelRequest,
    WithdrawalCreate,
    WithdrawalListResponse,
    WithdrawalResponse,
)


router = APIRouter(prefix="/withdrawals", tags=["withdrawals"])


@router.get("", response_model=WithdrawalListResponse)
def list_withdrawals(
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数上限"),
    lot_id: int | None = Query(None, description="ロットIDでフィルタ"),
    customer_id: int | None = Query(None, description="得意先IDでフィルタ"),
    withdrawal_type: str | None = Query(None, description="出庫タイプでフィルタ"),
    start_date: date | None = Query(None, description="開始日（出荷日）"),
    end_date: date | None = Query(None, description="終了日（出荷日）"),
    supplier_item_id: int | None = Query(None, description="製品IDでフィルタ"),
    warehouse_id: int | None = Query(None, description="倉庫IDでフィルタ"),
    search: str | None = Query(
        None, description="キーワード検索（ロット、製品、得意先、納入先、参照番号）"
    ),
    db: Session = Depends(get_db),
):
    """出庫履歴一覧を取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        lot_id: ロットIDでフィルタ
        customer_id: 得意先IDでフィルタ
        withdrawal_type: 出庫タイプでフィルタ
        start_date: 開始日
        end_date: 終了日
        supplier_item_id: 製品ID
        warehouse_id: 倉庫ID
        search: 検索キーワード
        db: データベースセッション

    Returns:
        出庫履歴一覧
    """
    service = WithdrawalService(db)
    return service.get_withdrawals(
        skip=skip,
        limit=limit,
        lot_id=lot_id,
        customer_id=customer_id,
        withdrawal_type=withdrawal_type,
        start_date=start_date,
        end_date=end_date,
        supplier_item_id=supplier_item_id,
        warehouse_id=warehouse_id,
        search_query=search,
    )


@router.get("/calendar-summary", response_model=list[DailyWithdrawalSummary])
def get_calendar_summary(
    year: int = Query(..., description="年"),
    month: int = Query(..., description="月"),
    warehouse_id: int | None = Query(None, description="倉庫ID"),
    supplier_item_id: int | None = Query(None, description="製品ID"),
    supplier_id: int | None = Query(None, description="仕入先ID"),
    db: Session = Depends(get_db),
):
    """月間の日別出庫集計を取得（カレンダー用）.

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
    service = WithdrawalService(db)
    return service.get_calendar_summary(
        year=year,
        month=month,
        warehouse_id=warehouse_id,
        supplier_item_id=supplier_item_id,
        supplier_id=supplier_id,
    )


@router.get("/{withdrawal_id}", response_model=WithdrawalResponse)
def get_withdrawal(
    withdrawal_id: int,
    db: Session = Depends(get_db),
):
    """出庫詳細を取得.

    Args:
        withdrawal_id: 出庫ID
        db: データベースセッション

    Returns:
        出庫詳細

    Raises:
        HTTPException: 出庫が見つからない場合
    """
    service = WithdrawalService(db)
    result = service.get_withdrawal_by_id(withdrawal_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"出庫（ID={withdrawal_id}）が見つかりません",
        )

    return result


@router.post("", response_model=WithdrawalResponse, status_code=status.HTTP_201_CREATED)
def create_withdrawal(
    data: WithdrawalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """出庫を登録.

    - ロットの現在数量から出庫数量を減算
    - 利用可能数量（current - allocated - locked）以内であること
    - stock_historyにWITHDRAWALトランザクションを記録

    Args:
        data: 出庫登録リクエスト
        db: データベースセッション
        current_user: 現在のログインユーザー

    Returns:
        作成された出庫レコード

    Raises:
        HTTPException: バリデーションエラー
    """
    service = WithdrawalService(db)

    try:
        return service.create_withdrawal(data, withdrawn_by=current_user.id)
    except ReservationLotNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except ReservationInsufficientStockError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.post("/{withdrawal_id}/cancel", response_model=WithdrawalResponse)
def cancel_withdrawal(
    withdrawal_id: int,
    data: WithdrawalCancelRequest,
    db: Session = Depends(get_db),
):
    """出庫を取消.

    反対仕訳方式で出庫を取消し、ロットの在庫を復元する。
    - stock_historyにRETURNトランザクションを記録
    - ロットのcurrent_quantityを復元
    - べき等性: 既に取消済みの場合はそのまま返す

    Args:
        withdrawal_id: 出庫ID
        data: 取消リクエスト（理由、メモ）
        db: データベースセッション

    Returns:
        取消後の出庫レコード

    Raises:
        HTTPException: 出庫が見つからない場合
    """
    service = WithdrawalService(db)

    try:
        return service.cancel_withdrawal(withdrawal_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
