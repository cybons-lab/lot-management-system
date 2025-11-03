"""FEFO allocation service (excluding locked lots)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Dict, List, Tuple

from sqlalchemy import func, nulls_last
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Allocation,
    Lot,
    LotCurrentStock,
    NextDivMap,
    Order,
    OrderLine,
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
    allocations: List[FefoLotPlan] = field(default_factory=list)
    next_div: str | None = None
    warnings: List[str] = field(default_factory=list)


@dataclass
class FefoPreviewResult:
    order_id: int
    lines: List[FefoLinePlan]
    warnings: List[str] = field(default_factory=list)


@dataclass
class FefoCommitResult:
    preview: FefoPreviewResult
    created_allocations: List[Allocation]


class AllocationCommitError(RuntimeError):
    """Raised when FEFO allocation cannot be committed."""


def _load_order(db: Session, order_id: int) -> Order:
    order = (
        db.query(Order)
        .options(
            joinedload(Order.lines)
            .joinedload(OrderLine.allocations)
            .joinedload(Allocation.lot)
        )
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise ValueError("Order not found")
    return order


def _existing_allocated_qty(line: OrderLine) -> float:
    return sum(
        alloc.allocated_qty
        for alloc in line.allocations
        if getattr(alloc, "status", "active") != "cancelled"
    )


def _resolve_next_div(db: Session, order: Order, line: OrderLine) -> Tuple[str | None, str | None]:
    ship_to_code = getattr(order, "delivery_mode", None) or order.customer_code
    mapping = (
        db.query(NextDivMap)
        .filter(
            NextDivMap.customer_code == order.customer_code,
            NextDivMap.ship_to_code == ship_to_code,
            NextDivMap.product_code == line.product_code,
        )
        .first()
    )
    if mapping:
        return mapping.next_div, None
    warning = (
        "次区が未設定: customer="
        f"{order.customer_code}, ship_to={ship_to_code}, product={line.product_code}"
    )
    return None, warning


def _lot_candidates(db: Session, product_code: str) -> List[Tuple[Lot, float]]:
    query = (
        db.query(Lot, LotCurrentStock.current_quantity)
        .join(LotCurrentStock, LotCurrentStock.lot_id == Lot.id)
        .filter(
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
    return query.all()


def preview_fefo_allocation(db: Session, order_id: int) -> FefoPreviewResult:
    order = _load_order(db, order_id)

    if order.status not in {"open", "part_allocated"}:
        raise ValueError("Order status does not allow allocation")

    available_per_lot: Dict[int, float] = {}
    preview_lines: List[FefoLinePlan] = []
    warnings: List[str] = []

    sorted_lines = sorted(order.lines, key=lambda l: (l.line_no, l.id))
    for line in sorted_lines:
        required_qty = float(line.quantity or 0.0)
        already_allocated = _existing_allocated_qty(line)
        remaining = required_qty - already_allocated
        if remaining <= 0:
            continue

        next_div_value, next_div_warning = _resolve_next_div(db, order, line)
        line_plan = FefoLinePlan(
            order_line_id=line.id,
            product_code=line.product_code,
            required_qty=required_qty,
            already_allocated_qty=already_allocated,
            next_div=next_div_value,
        )
        if next_div_warning:
            line_plan.warnings.append(next_div_warning)
            warnings.append(next_div_warning)

        for lot, current_qty in _lot_candidates(db, line.product_code):
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
            message = (
                f"在庫不足: 製品 {line.product_code} に対して {remaining:.2f} 足りません"
            )
            line_plan.warnings.append(message)
            warnings.append(message)

        preview_lines.append(line_plan)

    return FefoPreviewResult(order_id=order_id, lines=preview_lines, warnings=warnings)


def commit_fefo_allocation(db: Session, order_id: int) -> FefoCommitResult:
    preview = preview_fefo_allocation(db, order_id)

    created: List[Allocation] = []
    try:
        EPSILON = 1e-6
        for line_plan in preview.lines:
            if not line_plan.allocations:
                continue

            line = (
                db.query(OrderLine)
                .options(joinedload(OrderLine.allocations))
                .filter(OrderLine.id == line_plan.order_line_id)
                .first()
            )
            if not line:
                raise AllocationCommitError(
                    f"OrderLine {line_plan.order_line_id} not found"
                )

            if line_plan.next_div and not line.next_div:
                line.next_div = line_plan.next_div

            for alloc_plan in line_plan.allocations:
                lot = db.query(Lot).filter(Lot.id == alloc_plan.lot_id).first()
                if not lot:
                    raise AllocationCommitError(
                        f"Lot {alloc_plan.lot_id} not found"
                    )
                if lot.is_locked:
                    raise AllocationCommitError(
                        f"Lot {alloc_plan.lot_id} is locked"
                    )

                current_stock = (
                    db.query(LotCurrentStock)
                    .filter(LotCurrentStock.lot_id == alloc_plan.lot_id)
                    .first()
                )
                if not current_stock:
                    raise AllocationCommitError(
                        f"Current stock for lot {alloc_plan.lot_id} not found"
                    )

                if current_stock.current_quantity < alloc_plan.allocate_qty:
                    raise AllocationCommitError(
                        f"Lot {alloc_plan.lot_id} does not have enough stock"
                    )

                current_stock.current_quantity -= alloc_plan.allocate_qty

                allocation = Allocation(
                    order_line_id=line.id,
                    lot_id=alloc_plan.lot_id,
                    allocated_qty=alloc_plan.allocate_qty,
                )
                db.add(allocation)
                db.flush()
                created.append(allocation)

        totals = (
            db.query(
                OrderLine.id,
                func.coalesce(func.sum(Allocation.allocated_qty), 0.0),
                OrderLine.quantity,
            )
            .outerjoin(Allocation, Allocation.order_line_id == OrderLine.id)
            .filter(OrderLine.order_id == order_id)
            .group_by(OrderLine.id, OrderLine.quantity)
            .all()
        )
        fully_allocated = True
        any_allocated = False
        for _, allocated_total, required_qty in totals:
            if allocated_total > EPSILON:
                any_allocated = True
            if allocated_total + EPSILON < float(required_qty or 0.0):
                fully_allocated = False

        target_order = db.query(Order).filter(Order.id == order_id).one()
        if fully_allocated:
            target_order.status = "allocated"
        elif any_allocated and target_order.status not in {"allocated", "part_allocated"}:
            target_order.status = "part_allocated"

        db.commit()

        for alloc in created:
            db.refresh(alloc)
    except Exception:
        db.rollback()
        raise

    return FefoCommitResult(preview=preview, created_allocations=created)
