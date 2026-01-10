"""Order lines endpoint."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.orders.order_service import OrderService
from app.presentation.api.deps import get_db
from app.presentation.schemas.orders.orders_schema import OrderLineResponse


router = APIRouter(prefix="/orders/lines", tags=["orders"])


@router.get("", response_model=list[OrderLineResponse])
def list_order_lines(
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    customer_code: str | None = None,
    product_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    order_type: str | None = None,
    db: Session = Depends(get_db),
):
    """受注明細一覧取得.

    受注ヘッダ情報や製品情報などを結合したフラットな明細リストを返します。
    """
    service = OrderService(db)
    return service.get_order_lines(
        skip=skip,
        limit=limit,
        status=status,
        customer_code=customer_code,
        product_code=product_code,
        date_from=date_from,
        date_to=date_to,
        order_type=order_type,
    )
