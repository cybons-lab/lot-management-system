from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Order, OrderLine, Product

from .schemas import FefoLinePlan, FefoLotPlan, FefoPreviewResult
from .utils import (
    _existing_allocated_qty,
    _load_order,
    _lot_candidates,
    _resolve_next_div,
)


def validate_preview_eligibility(order: Order) -> None:
    """
    Validate order status for preview operation.

    Args:
        order: Order entity

    Raises:
        ValueError: If order status does not allow preview
    """
    if order.status not in {"draft", "open", "part_allocated", "allocated"}:
        raise ValueError(
            f"Order status '{order.status}' does not allow preview. "
            f"Allowed: draft, open, part_allocated, allocated"
        )


def load_order_for_preview(db: Session, order_id: int) -> Order:
    """
    Load order with validation for preview.

    Args:
        db: Database session
        order_id: Order ID

    Returns:
        Order: Order entity with lines

    Raises:
        ValueError: If order not found or status invalid
    """
    order = _load_order(db, order_id)
    validate_preview_eligibility(order)
    return order


def calculate_line_allocations(
    db: Session,
    line: OrderLine,
    order: Order,
    available_per_lot: dict[int, float],
) -> FefoLinePlan:
    """
    Calculate FEFO allocations for a single order line.

    Args:
        db: Database session
        line: Order line to allocate
        order: Parent order
        available_per_lot: Shared availability tracker

    Returns:
        FefoLinePlan: Allocation plan for this line
    """
    required_qty = float(
        line.converted_quantity
        if line.converted_quantity is not None
        else line.order_quantity or 0.0
    )
    already_allocated = _existing_allocated_qty(line)
    remaining = required_qty - already_allocated

    product_id = getattr(line, "product_id", None)
    warehouse_id = getattr(line, "warehouse_id", None)
    product_code = None
    warehouse_code = None

    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            product_code = product.maker_part_code

    # Get warehouse_code from warehouse_id if needed
    if warehouse_id and not warehouse_code:
        from app.models import Warehouse

        warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
        if warehouse:
            warehouse_code = warehouse.warehouse_code

    if not product_id:
        warning = f"製品ID未設定: order_line={line.id}"
        return FefoLinePlan(
            order_line_id=line.id,
            product_id=None,
            product_code="",
            warehouse_id=warehouse_id,
            warehouse_code=warehouse_code,
            required_qty=required_qty,
            already_allocated_qty=already_allocated,
            warnings=[warning],
        )

    next_div_value, next_div_warning = _resolve_next_div(db, order, line)
    line_plan = FefoLinePlan(
        order_line_id=line.id,
        product_id=product_id,
        product_code=product_code or "",
        warehouse_id=warehouse_id,
        warehouse_code=warehouse_code,
        required_qty=required_qty,
        already_allocated_qty=already_allocated,
        next_div=next_div_value,
    )

    if next_div_warning:
        line_plan.warnings.append(next_div_warning)

    # Allocate lots using FEFO strategy
    if remaining > 0:
        for lot, available_qty in _lot_candidates(db, product_id):
            available = available_per_lot.get(lot.id, float(available_qty or 0.0))
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
                    receipt_date=lot.received_date,
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

    return line_plan


def build_preview_result(
    order_id: int,
    line_plans: list[FefoLinePlan],
) -> FefoPreviewResult:
    """
    Build preview result from line plans.

    Args:
        order_id: Order ID
        line_plans: List of line allocation plans

    Returns:
        FefoPreviewResult: Complete preview result
    """
    all_warnings = []
    for line_plan in line_plans:
        all_warnings.extend(line_plan.warnings)

    return FefoPreviewResult(order_id=order_id, lines=line_plans, warnings=all_warnings)


def preview_fefo_allocation(db: Session, order_id: int) -> FefoPreviewResult:
    """
    FEFO引当プレビュー（状態: draft|open|part_allocated|allocated 許容）.

    Refactored: Split into smaller functions for clarity.

    Args:
        db: データベースセッション
        order_id: 注文ID

    Returns:
        FefoPreviewResult: 引当プレビュー結果

    Raises:
        ValueError: 注文が見つからない、または状態が不正な場合
    """
    order = load_order_for_preview(db, order_id)

    available_per_lot: dict[int, float] = {}
    preview_lines: list[FefoLinePlan] = []

    sorted_lines = sorted(order.order_lines, key=lambda l: l.id)
    for line in sorted_lines:
        required_qty = float(
            line.converted_quantity
            if line.converted_quantity is not None
            else line.order_quantity or 0.0
        )
        already_allocated = _existing_allocated_qty(line)
        remaining = required_qty - already_allocated

        if remaining <= 0:
            continue

        line_plan = calculate_line_allocations(db, line, order, available_per_lot)
        preview_lines.append(line_plan)

    return build_preview_result(order_id, preview_lines)
