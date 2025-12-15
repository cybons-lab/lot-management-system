"""Withdrawals API router.

出庫（受注外出庫）のAPIエンドポイント。
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.inventory.lot_reservation_service import (
    ReservationInsufficientStockError,
    ReservationLotNotFoundError,
)
from app.application.services.inventory.withdrawal_service import WithdrawalService
from app.presentation.api.deps import get_db
from app.presentation.schemas.inventory.withdrawal_schema import (
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
    db: Session = Depends(get_db),
):
    """出庫履歴一覧を取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        lot_id: ロットIDでフィルタ
        customer_id: 得意先IDでフィルタ
        withdrawal_type: 出庫タイプでフィルタ
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
):
    """出庫を登録.

    - ロットの現在数量から出庫数量を減算
    - 利用可能数量（current - allocated - locked）以内であること
    - stock_historyにWITHDRAWALトランザクションを記録

    Args:
        data: 出庫登録リクエスト
        db: データベースセッション

    Returns:
        作成された出庫レコード

    Raises:
        HTTPException: バリデーションエラー
    """
    service = WithdrawalService(db)

    try:
        return service.create_withdrawal(data)
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
