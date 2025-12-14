"""Confirmed order lines endpoint for SAP registration.

P3: Uses LotReservation instead of Allocation.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Customer, Order, OrderLine, Product
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)
from app.presentation.api.deps import get_db


router = APIRouter(prefix="/orders", tags=["orders"])


class ConfirmedOrderLineResponse(BaseModel):
    """Confirmed order line for SAP registration."""

    line_id: int
    order_id: int
    customer_order_no: str | None = None  # 得意先受注番号（明細レベル）
    customer_id: int
    customer_name: str
    product_id: int
    product_code: str
    product_name: str
    order_quantity: float
    reserved_quantity: float  # P3: Renamed from allocated_quantity
    unit: str
    delivery_date: str
    sap_order_no: str | None = None

    model_config = {"from_attributes": True}


@router.get("/confirmed-order-lines", response_model=list[ConfirmedOrderLineResponse])
def get_confirmed_order_lines(db: Session = Depends(get_db)):
    """Get all order lines that are fully reserved and not yet registered in
    SAP.

    Returns lines where reserved_quantity >= converted_quantity and sap_order_no is NULL.

    P3: Uses LotReservation instead of Allocation.
    """
    # Subquery to calculate reserved quantity per line
    res_subq = (
        select(
            LotReservation.source_id.label("order_line_id"),
            func.coalesce(func.sum(LotReservation.reserved_qty), 0).label("reserved_qty"),
        )
        .where(
            LotReservation.source_type == ReservationSourceType.ORDER,
            LotReservation.status != ReservationStatus.RELEASED,
        )
        .group_by(LotReservation.source_id)
        .subquery()
    )

    # Main query - filter in WHERE clause instead of HAVING
    query = (
        select(
            OrderLine.id.label("line_id"),
            Order.id.label("order_id"),
            OrderLine.customer_order_no,
            Customer.id.label("customer_id"),
            Customer.customer_name,
            Product.id.label("product_id"),
            Product.maker_part_code.label("product_code"),
            Product.product_name,
            OrderLine.order_quantity,
            func.coalesce(res_subq.c.reserved_qty, 0).label("reserved_quantity"),
            OrderLine.unit,
            OrderLine.delivery_date,
            OrderLine.sap_order_no,
        )
        .join(Order, OrderLine.order_id == Order.id)
        .join(Customer, Order.customer_id == Customer.id)
        .join(Product, OrderLine.product_id == Product.id)
        .outerjoin(res_subq, OrderLine.id == res_subq.c.order_line_id)
        .where(OrderLine.sap_order_no.is_(None))  # SAP未登録
        .where(
            func.coalesce(res_subq.c.reserved_qty, 0) >= OrderLine.converted_quantity
        )  # 予約確定済み (内部単位で比較)
        .order_by(OrderLine.delivery_date.asc())
    )

    results = db.execute(query).all()

    return [
        ConfirmedOrderLineResponse(
            line_id=r.line_id,
            order_id=r.order_id,
            customer_order_no=r.customer_order_no,
            customer_id=r.customer_id,
            customer_name=r.customer_name,
            product_id=r.product_id,
            product_code=r.product_code,
            product_name=r.product_name,
            order_quantity=float(r.order_quantity),
            reserved_quantity=float(r.reserved_quantity),
            unit=r.unit,
            delivery_date=str(r.delivery_date),
            sap_order_no=r.sap_order_no,
        )
        for r in results
    ]
