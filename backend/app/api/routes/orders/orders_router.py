# backend/app/api/routes/orders_refactored.py
"""
受注エンドポイント（全修正版）
I/O整形のみを責務とし、例外変換はグローバルハンドラに委譲.
"""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_uow
from app.schemas.orders.orders_schema import (
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
    OrderWithLinesResponse,
)
from app.services.common.uow_service import UnitOfWork
from app.services.orders.order_service import OrderService


router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderWithLinesResponse])
def list_orders(
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    customer_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    """
    受注一覧取得（読み取り専用）.

    トランザクション不要のため、通常のSessionを使用

    Note:
        例外はグローバルハンドラで処理されるため、
        ここではHTTPExceptionを投げない
    """
    service = OrderService(db)
    return service.get_orders(
        skip=skip,
        limit=limit,
        status=status,
        customer_code=customer_code,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/{order_id}", response_model=OrderWithLinesResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """
    受注詳細取得（読み取り専用、明細含む）.

    トランザクション不要のため、通常のSessionを使用

    Note:
        - OrderNotFoundError → 404はグローバルハンドラが処理
    """
    service = OrderService(db)
    return service.get_order_detail(order_id)


@router.post("", response_model=OrderWithLinesResponse, status_code=201)
def create_order(order: OrderCreate, uow: UnitOfWork = Depends(get_uow)):
    """
    受注作成.

    【修正#5】UnitOfWorkを依存注入で取得（SessionLocal直参照を回避）

    トランザクション管理:
        - 成功時: UnitOfWorkが自動commit
        - 例外発生時: UnitOfWorkが自動rollback

    例外処理:
        - DuplicateOrderError → 409 Conflict
        - OrderValidationError → 422 Unprocessable Entity
        - ProductNotFoundError → 404 Not Found
        - OrderDomainError → 400 Bad Request
        上記はすべてグローバルハンドラで変換される
    """
    service = OrderService(uow.session)
    return service.create_order(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(order_id: int, body: OrderStatusUpdate, uow: UnitOfWork = Depends(get_uow)):
    """
    受注ステータス更新.

    【修正#2】dict入力を廃止し、OrderStatusUpdateスキーマを使用
    【修正#5】UnitOfWorkを依存注入で取得

    Args:
        order_id: 受注ID
        body: ステータス更新データ（Schema検証済み）
        uow: UnitOfWork（依存注入）

    トランザクション管理:
        - 成功時: UnitOfWorkが自動commit
        - 例外発生時: UnitOfWorkが自動rollback

    例外処理:
        - OrderNotFoundError → 404 Not Found
        - InvalidOrderStatusError → 400 Bad Request
        上記はグローバルハンドラで変換される
    """
    service = OrderService(uow.session)
    return service.update_order_status(order_id, body.status)


@router.delete("/{order_id}/cancel", status_code=204)
def cancel_order(order_id: int, uow: UnitOfWork = Depends(get_uow)):
    """
    受注キャンセル.

    【修正#5】UnitOfWorkを依存注入で取得

    トランザクション管理:
        - 成功時: UnitOfWorkが自動commit
        - 例外発生時: UnitOfWorkが自動rollback

    例外処理:
        - OrderNotFoundError → 404 Not Found
        - InvalidOrderStatusError → 400 Bad Request
        上記はグローバルハンドラで変換される

    Returns:
        None (204 No Content)
    """
    service = OrderService(uow.session)
    service.cancel_order(order_id)
    return None
