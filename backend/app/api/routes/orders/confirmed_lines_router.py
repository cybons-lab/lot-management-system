"""Confirmed order lines endpoint for SAP registration."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Allocation, Customer, Order, OrderLine, Product

router = APIRouter(prefix="/orders", tags=["orders"])


class ConfirmedOrderLineResponse(BaseModel):
    """Confirmed order line for SAP registration."""
    
    line_id: int
    order_id: int
    order_number: str
    customer_id: int
    customer_name: str
    product_id: int
    product_code: str
    product_name: str
    order_quantity: float
    allocated_quantity: float
    unit: str
    delivery_date: str
    sap_order_no: str | None = None
    
    model_config = {"from_attributes": True}


@router.get("/confirmed-order-lines", response_model=list[ConfirmedOrderLineResponse])
def get_confirmed_order_lines(db: Session = Depends(get_db)):
    """
    Get all order lines that are fully allocated and not yet registered in SAP.
    
    Returns lines where allocated_quantity >= order_quantity and sap_order_no is NULL.
    """
    # Subquery to calculate allocated quantity per line
    alloc_subq = (
        select(
            Allocation.order_line_id,
            func.coalesce(func.sum(Allocation.allocated_quantity), 0).label("allocated_qty")
        )
        .group_by(Allocation.order_line_id)
        .subquery()
    )
    
    # Main query - filter in WHERE clause instead of HAVING
    query = (
        select(
            OrderLine.id.label("line_id"),
            Order.id.label("order_id"),
            Order.order_number,
            Customer.id.label("customer_id"),
            Customer.customer_name,
            Product.id.label("product_id"),
            Product.maker_part_code.label("product_code"),
            Product.product_name,
            OrderLine.order_quantity,
            func.coalesce(alloc_subq.c.allocated_qty, 0).label("allocated_quantity"),
            OrderLine.unit,
            OrderLine.delivery_date,
            OrderLine.sap_order_no,
        )
        .join(Order, OrderLine.order_id == Order.id)
        .join(Customer, Order.customer_id == Customer.id)
        .join(Product, OrderLine.product_id == Product.id)
        .outerjoin(alloc_subq, OrderLine.id == alloc_subq.c.order_line_id)
        .where(OrderLine.sap_order_no.is_(None))  # SAP未登録
        .where(func.coalesce(alloc_subq.c.allocated_qty, 0) >= OrderLine.order_quantity)  # 引当確定済み
        .order_by(OrderLine.delivery_date.asc())
    )
    
    results = db.execute(query).all()
    
    return [
        ConfirmedOrderLineResponse(
            line_id=r.line_id,
            order_id=r.order_id,
            order_number=r.order_number,
            customer_id=r.customer_id,
            customer_name=r.customer_name,
            product_id=r.product_id,
            product_code=r.product_code,
            product_name=r.product_name,
            order_quantity=float(r.order_quantity),
            allocated_quantity=float(r.allocated_quantity),
            unit=r.unit,
            delivery_date=str(r.delivery_date),
            sap_order_no=r.sap_order_no,
        )
        for r in results
    ]
