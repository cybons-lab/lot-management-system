from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Select, func, nulls_last, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Allocation,
    Lot,
    Order,
    OrderLine,
    Product,
)


def _load_order(db: Session, order_id: int | None = None, order_number: str | None = None) -> Order:
    """
    注文を取得（ID/コード両対応）.

    Args:
        db: データベースセッション
        order_id: 注文ID（優先）
        order_number: 注文番号（IDがない場合）

    Returns:
        Order: 注文エンティティ（子テーブル含む）

    Raises:
        ValueError: 注文が見つからない場合、またはパラメータ不足の場合
    """
    if not order_id and not order_number:
        raise ValueError("Either order_id or order_number must be provided")

    stmt: Select[Order] = select(Order).options(
        selectinload(Order.order_lines)
        .joinedload(OrderLine.allocations)
        .joinedload(Allocation.lot),
        selectinload(Order.order_lines).joinedload(OrderLine.product),
    )

    if order_id:
        stmt = stmt.where(Order.id == order_id)
    else:
        stmt = stmt.where(Order.order_number == order_number)

    order = db.execute(stmt).scalar_one_or_none()
    if not order:
        identifier = f"ID={order_id}" if order_id else f"order_number={order_number}"
        raise ValueError(f"Order not found: {identifier}")
    return order


def _existing_allocated_qty(line: OrderLine) -> float:
    """Calculate already allocated quantity for an order line."""
    return sum(
        alloc.allocated_quantity
        for alloc in line.allocations
        if getattr(alloc, "status", "reserved") != "cancelled"
    )


def _resolve_next_div(db: Session, order: Order, line: OrderLine) -> tuple[str | None, str | None]:
    """Resolve next_div value and generate warning if missing."""
    product = getattr(line, "product", None)
    if product is None and getattr(line, "product_id", None):
        stmt = select(Product).where(Product.id == line.product_id)
        product = db.execute(stmt).scalar_one_or_none()
    if product is None:
        product_code = getattr(line, "product_code", None)
        if product_code:
            stmt = select(Product).where(Product.product_code == product_code)
            product = db.execute(stmt).scalar_one_or_none()
    if product and getattr(product, "next_div", None):
        return product.next_div, None

    product_code = getattr(line, "product_code", None)
    if not product_code and product:
        product_code = product.maker_part_code
    warning = f"次区が未設定: customer_id={order.customer_id}, product={product_code or 'unknown'}"
    return None, warning


def _lot_candidates(db: Session, product_id: int) -> list[tuple[Lot, float]]:
    """
    FEFO候補ロットを取得.

    v2.2: Lot モデルから直接利用可能在庫を計算。

    Returns:
        List of (Lot, available_quantity) tuples sorted by FEFO order
    """
    stmt: Select[tuple[Lot, float]] = (
        select(Lot, (Lot.current_quantity - Lot.allocated_quantity).label("available_qty"))
        .where(
            Lot.product_id == product_id,
            (Lot.current_quantity - Lot.allocated_quantity) > 0,
            Lot.status == "active",
        )
        .order_by(
            nulls_last(Lot.expiry_date.asc()),
            Lot.received_date.asc(),
            Lot.id.asc(),
        )
    )
    return db.execute(stmt).all()


def update_order_line_status(db: Session, order_line_id: int) -> None:
    """
    Update OrderLine status based on allocation completion.

    Args:
        db: Database session
        order_line_id: Order line ID
    """
    EPSILON = Decimal("1e-6")

    # Load order line with allocations
    line_stmt = (
        select(OrderLine)
        .options(selectinload(OrderLine.allocations))
        .where(OrderLine.id == order_line_id)
    )
    line = db.execute(line_stmt).scalar_one_or_none()
    if not line:
        return

    # Calculate required and allocated quantities
    required_qty = Decimal(
        str(line.converted_quantity if line.converted_quantity else line.order_quantity or 0)
    )
    allocated_qty = sum(
        Decimal(str(a.allocated_quantity)) for a in line.allocations if a.status != "cancelled"
    )

    # Update line status based on allocation
    if allocated_qty + EPSILON >= required_qty:
        line.status = "allocated"
    elif allocated_qty > EPSILON:
        line.status = "pending"
    else:
        line.status = "pending"


def update_order_allocation_status(db: Session, order_id: int) -> None:
    """
    Update order status based on allocation completion.

    Args:
        db: Database session
        order_id: Order ID
    """
    EPSILON = 1e-6

    # 注文ステータス更新
    totals_stmt = (
        select(
            OrderLine.id,
            func.coalesce(func.sum(Allocation.allocated_quantity), 0.0),
            func.coalesce(OrderLine.converted_quantity, OrderLine.order_quantity),
        )
        .outerjoin(Allocation, Allocation.order_line_id == OrderLine.id)
        .where(OrderLine.order_id == order_id)
        .group_by(
            OrderLine.id,
            OrderLine.order_quantity,
            OrderLine.converted_quantity,
        )
    )
    totals = db.execute(totals_stmt).all()
    fully_allocated = True
    any_allocated = False

    for _, allocated_total, required_qty in totals:
        allocated_total = float(allocated_total)
        required_qty = float(required_qty or 0.0)
        if allocated_total > EPSILON:
            any_allocated = True
        if allocated_total + EPSILON < required_qty:
            fully_allocated = False

    target_order = db.execute(select(Order).where(Order.id == order_id)).scalar_one()
    if fully_allocated:
        target_order.status = "allocated"
    elif any_allocated and target_order.status not in {"allocated", "part_allocated"}:
        target_order.status = "part_allocated"
