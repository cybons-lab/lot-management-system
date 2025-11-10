"""FEFO allocation service (excluding locked lots)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import Select, func, nulls_last, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import (
    Allocation,
    Lot,
    LotCurrentStock,
    Order,
    OrderLine,
    Product,
)


@dataclass
class FefoLotPlan:
    lot_id: int
    allocate_qty: float
    expiry_date: date | None
    receipt_date: date | None
    lot_number: str


@dataclass
class FefoLinePlan:
    order_line_id: int
    product_code: str
    required_qty: float
    already_allocated_qty: float
    allocations: list[FefoLotPlan] = field(default_factory=list)
    next_div: str | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class FefoPreviewResult:
    order_id: int
    lines: list[FefoLinePlan]
    warnings: list[str] = field(default_factory=list)


@dataclass
class FefoCommitResult:
    preview: FefoPreviewResult
    created_allocations: list[Allocation]


class AllocationCommitError(RuntimeError):
    """Raised when FEFO allocation cannot be committed."""


# ============================
# Exceptions
# ============================


class AllocationNotFoundError(Exception):
    """Raised when the specified allocation is not found in DB."""

    pass


def _load_order(db: Session, order_id: int) -> Order:
    stmt: Select[Order] = (
        select(Order)
        .options(
            selectinload(Order.order_lines)
            .joinedload(OrderLine.allocations)
            .joinedload(Allocation.lot),
            selectinload(Order.order_lines).joinedload(OrderLine.product),
        )
        .where(Order.id == order_id)
    )
    order = db.execute(stmt).scalar_one_or_none()
    if not order:
        raise ValueError("Order not found")
    return order


def _existing_allocated_qty(line: OrderLine) -> float:
    return sum(
        alloc.allocated_qty
        for alloc in line.allocations
        if getattr(alloc, "status", "active") != "cancelled"
    )


def _resolve_next_div(db: Session, order: Order, line: OrderLine) -> tuple[str | None, str | None]:
    product = getattr(line, "product", None)
    if product is None and getattr(line, "product_id", None):
        stmt = select(Product).where(Product.id == line.product_id)
        product = db.execute(stmt).scalar_one_or_none()
    if product is None:
        product_code = getattr(line, "product_code", None)
        if product_code:
            stmt = select(Product).where(Product.product_code == product_code)
            product = db.execute(stmt).scalar_one_or_none()
    if product and product.next_div:
        return product.next_div, None

    product_code = getattr(line, "product_code", None)
    if not product_code and product:
        product_code = product.product_code
    warning = f"次区が未設定: customer={order.customer_code}, product={product_code or 'unknown'}"
    return None, warning


def _lot_candidates(db: Session, product_code: str) -> list[tuple[Lot, float]]:
    stmt: Select[tuple[Lot, float]] = (
        select(Lot, LotCurrentStock.current_quantity)
        .join(LotCurrentStock, LotCurrentStock.lot_id == Lot.id)
        .where(
            Lot.product_code == product_code,
            LotCurrentStock.current_quantity > 0,
            Lot.is_locked.is_(False),
        )
        .order_by(
            nulls_last(Lot.expiry_date.asc()),
            Lot.receipt_date.asc(),
            Lot.id.asc(),
        )
    )
    return db.execute(stmt).all()


def preview_fefo_allocation(db: Session, order_id: int) -> FefoPreviewResult:
    order = _load_order(db, order_id)

    if order.status not in {"open", "part_allocated"}:
        raise ValueError("Order status does not allow allocation")

    available_per_lot: dict[int, float] = {}
    preview_lines: list[FefoLinePlan] = []
    warnings: list[str] = []

    sorted_lines = sorted(order.order_lines, key=lambda l: (l.line_no, l.id))
    for line in sorted_lines:
        required_qty = float(line.quantity or 0.0)
        already_allocated = _existing_allocated_qty(line)
        remaining = required_qty - already_allocated
        if remaining <= 0:
            continue

        product_code = getattr(line, "product_code", None)
        if not product_code and getattr(line, "product", None):
            product_code = line.product.product_code
            line.product_code = product_code
        if not product_code:
            warning = f"製品コード未設定: order_line={line.id}"
            warnings.append(warning)
            preview_lines.append(
                FefoLinePlan(
                    order_line_id=line.id,
                    product_code="",
                    required_qty=required_qty,
                    already_allocated_qty=already_allocated,
                    warnings=[warning],
                )
            )
            continue

        next_div_value, next_div_warning = _resolve_next_div(db, order, line)
        line_plan = FefoLinePlan(
            order_line_id=line.id,
            product_code=product_code,
            required_qty=required_qty,
            already_allocated_qty=already_allocated,
            next_div=next_div_value,
        )
        if next_div_warning:
            line_plan.warnings.append(next_div_warning)
            warnings.append(next_div_warning)

        for lot, current_qty in _lot_candidates(db, product_code):
            available = available_per_lot.get(lot.id, float(current_qty or 0.0))
            if available <= 0:
                continue

            allocate_qty = min(remaining, available)
            if allocate_qty <= 0:
                continue

            line_plan.allocations.append(
                FefoLotPlan(
                    lot_id=lot.id,
                    allocate_qty=float(allocate_qty),
                    expiry_date=lot.expiry_date,
                    receipt_date=lot.receipt_date,
                    lot_number=lot.lot_number,
                )
            )
            available_per_lot[lot.id] = available - allocate_qty
            remaining -= allocate_qty

            if remaining <= 0:
                break

        if remaining > 0:
            message = f"在庫不足: 製品 {product_code} に対して {remaining:.2f} 足りません"
            line_plan.warnings.append(message)
            warnings.append(message)

        preview_lines.append(line_plan)

    return FefoPreviewResult(order_id=order_id, lines=preview_lines, warnings=warnings)


def commit_fefo_allocation(db: Session, order_id: int) -> FefoCommitResult:
    preview = preview_fefo_allocation(db, order_id)

    created: list[Allocation] = []
    try:
        EPSILON = 1e-6
        for line_plan in preview.lines:
            if not line_plan.allocations:
                continue

            line_stmt = (
                select(OrderLine)
                .options(joinedload(OrderLine.allocations))
                .where(OrderLine.id == line_plan.order_line_id)
            )
            line = db.execute(line_stmt).scalar_one_or_none()
            if not line:
                raise AllocationCommitError(f"OrderLine {line_plan.order_line_id} not found")

            if line_plan.next_div and not getattr(line, "next_div", None):
                line.next_div = line_plan.next_div

            for alloc_plan in line_plan.allocations:
                lot_stmt = select(Lot).where(Lot.id == alloc_plan.lot_id)
                lot = db.execute(lot_stmt).scalar_one_or_none()
                if not lot:
                    raise AllocationCommitError(f"Lot {alloc_plan.lot_id} not found")
                if lot.is_locked:
                    raise AllocationCommitError(
                        f"Lot {alloc_plan.lot_id} is locked and cannot be allocated"
                    )

                stock_stmt = (
                    select(LotCurrentStock)
                    .where(LotCurrentStock.lot_id == lot.id)
                    .with_for_update()
                )
                current_stock = db.execute(stock_stmt).scalar_one_or_none()
                if not current_stock:
                    raise AllocationCommitError(f"Current stock not found for lot {lot.id}")

                available = float(current_stock.current_quantity or 0.0)
                if available + EPSILON < alloc_plan.allocate_qty:
                    raise AllocationCommitError(
                        f"Insufficient stock for lot {lot.id}: required {alloc_plan.allocate_qty}, available {available}"
                    )

                current_stock.current_quantity = available - alloc_plan.allocate_qty
                current_stock.last_updated = datetime.utcnow()

                allocation = Allocation(
                    order_line_id=line.id,
                    lot_id=lot.id,
                    allocated_qty=alloc_plan.allocate_qty,
                )
                db.add(allocation)
                created.append(allocation)

        totals_stmt = (
            select(
                OrderLine.id,
                func.coalesce(func.sum(Allocation.allocated_qty), 0.0),
                OrderLine.quantity,
            )
            .outerjoin(Allocation, Allocation.order_line_id == OrderLine.id)
            .where(OrderLine.order_id == order_id)
            .group_by(OrderLine.id, OrderLine.quantity)
        )
        totals = db.execute(totals_stmt).all()
        fully_allocated = True
        any_allocated = False
        for _, allocated_total, required_qty in totals:
            if allocated_total > EPSILON:
                any_allocated = True
            if allocated_total + EPSILON < float(required_qty or 0.0):
                fully_allocated = False

        target_order = db.execute(select(Order).where(Order.id == order_id)).scalar_one()
        if fully_allocated:
            target_order.status = "allocated"
        elif any_allocated and target_order.status not in {"allocated", "part_allocated"}:
            target_order.status = "part_allocated"

        db.commit()
    except Exception:
        db.rollback()
        raise

    return FefoCommitResult(preview=preview, created_allocations=created)


def cancel_allocation(db: Session, allocation_id: int) -> None:
    allocation_stmt = (
        select(Allocation)
        .options(joinedload(Allocation.lot), joinedload(Allocation.order_line))
        .where(Allocation.id == allocation_id)
    )
    allocation = db.execute(allocation_stmt).scalar_one_or_none()
    if not allocation:
        raise AllocationNotFoundError(f"Allocation {allocation_id} not found")

    lot_stock_stmt = (
        select(LotCurrentStock).where(LotCurrentStock.lot_id == allocation.lot_id).with_for_update()
    )
    lot_stock = db.execute(lot_stock_stmt).scalar_one_or_none()
    if not lot_stock:
        raise AllocationCommitError(f"Lot current stock not found for lot {allocation.lot_id}")

    lot_stock.current_quantity += allocation.allocated_qty
    lot_stock.last_updated = datetime.utcnow()

    db.delete(allocation)
    db.commit()
