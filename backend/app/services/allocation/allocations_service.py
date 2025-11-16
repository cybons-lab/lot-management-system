"""
FEFO allocation service (excluding locked lots).

v2.2: lot_current_stock 依存を削除。Lot モデルを直接使用。

Refactored: God functions split into smaller, reusable functions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import Select, func, nulls_last, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import (
    Allocation,
    Lot,
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
    product_id: int | None
    product_code: str
    warehouse_id: int | None
    warehouse_code: str | None
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


class AllocationNotFoundError(Exception):
    """Raised when the specified allocation is not found in DB."""

    pass


# ============================
# Private Helper Functions (Existing)
# ============================


def _load_order(db: Session, order_id: int | None = None, order_no: str | None = None) -> Order:
    """
    注文を取得（ID/コード両対応）.

    Args:
        db: データベースセッション
        order_id: 注文ID（優先）
        order_no: 注文番号（IDがない場合）

    Returns:
        Order: 注文エンティティ（子テーブル含む）

    Raises:
        ValueError: 注文が見つからない場合、またはパラメータ不足の場合
    """
    if not order_id and not order_no:
        raise ValueError("Either order_id or order_no must be provided")

    stmt: Select[Order] = select(Order).options(
        selectinload(Order.order_lines)
        .joinedload(OrderLine.allocations)
        .joinedload(Allocation.lot),
        selectinload(Order.order_lines).joinedload(OrderLine.product),
    )

    if order_id:
        stmt = stmt.where(Order.id == order_id)
    else:
        stmt = stmt.where(Order.order_no == order_no)

    order = db.execute(stmt).scalar_one_or_none()
    if not order:
        identifier = f"ID={order_id}" if order_id else f"order_no={order_no}"
        raise ValueError(f"Order not found: {identifier}")
    return order


def _existing_allocated_qty(line: OrderLine) -> float:
    """Calculate already allocated quantity for an order line."""
    return sum(
        alloc.allocated_qty
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
    if product and product.next_div:
        return product.next_div, None

    product_code = getattr(line, "product_code", None)
    if not product_code and product:
        product_code = product.product_code
    warning = f"次区が未設定: customer={order.customer_code}, product={product_code or 'unknown'}"
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


# ============================
# Refactored: Preview Functions
# ============================


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
    required_qty = float(line.quantity or 0.0)
    already_allocated = _existing_allocated_qty(line)
    remaining = required_qty - already_allocated

    product_id = getattr(line, "product_id", None)
    warehouse_id = getattr(line, "warehouse_id", None)
    product_code = None
    warehouse_code = None

    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            product_code = product.product_code

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

    sorted_lines = sorted(order.order_lines, key=lambda l: (l.line_no, l.id))
    for line in sorted_lines:
        required_qty = float(line.quantity or 0.0)
        already_allocated = _existing_allocated_qty(line)
        remaining = required_qty - already_allocated

        if remaining <= 0:
            continue

        line_plan = calculate_line_allocations(db, line, order, available_per_lot)
        preview_lines.append(line_plan)

    return build_preview_result(order_id, preview_lines)


# ============================
# Refactored: Commit Functions
# ============================


def validate_commit_eligibility(order: Order) -> None:
    """
    Validate order status for commit operation.

    Args:
        order: Order entity

    Raises:
        ValueError: If order status does not allow commit
    """
    if order.status not in {"open", "part_allocated"}:
        raise ValueError(
            f"Order status '{order.status}' does not allow commit. Allowed: open, part_allocated"
        )


def persist_allocation_entities(
    db: Session,
    line_plan: FefoLinePlan,
    created: list[Allocation],
) -> None:
    """
    Persist allocation entities with pessimistic locking.

    Args:
        db: Database session
        line_plan: Line allocation plan
        created: List to append created allocations

    Raises:
        AllocationCommitError: If persistence fails
    """
    EPSILON = 1e-6

    if not line_plan.allocations:
        return

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
        # ロックをかけてロットを取得
        lot_stmt = select(Lot).where(Lot.id == alloc_plan.lot_id).with_for_update()
        lot = db.execute(lot_stmt).scalar_one_or_none()
        if not lot:
            raise AllocationCommitError(f"Lot {alloc_plan.lot_id} not found")
        if lot.status != "active":
            raise AllocationCommitError(
                f"Lot {alloc_plan.lot_id} status '{lot.status}' is not active"
            )

        # 利用可能在庫チェック
        available = float(lot.current_quantity - lot.allocated_quantity)
        if available + EPSILON < alloc_plan.allocate_qty:
            raise AllocationCommitError(
                f"Insufficient stock for lot {lot.id}: "
                f"required {alloc_plan.allocate_qty}, available {available}"
            )

        # 引当数量を更新
        lot.allocated_quantity += alloc_plan.allocate_qty
        lot.updated_at = datetime.utcnow()

        # 引当レコード作成
        allocation = Allocation(
            order_line_id=line.id,
            lot_id=lot.id,
            allocated_qty=alloc_plan.allocate_qty,
            status="reserved",
            created_at=datetime.utcnow(),
        )
        db.add(allocation)
        created.append(allocation)


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


def commit_fefo_allocation(db: Session, order_id: int) -> FefoCommitResult:
    """
    FEFO引当確定（状態: open|part_allocated のみ許容）.

    Refactored: Split into smaller functions for maintainability.

    v2.2: Lot.allocated_quantity を直接更新。

    Args:
        db: データベースセッション
        order_id: 注文ID

    Returns:
        FefoCommitResult: 引当確定結果

    Raises:
        ValueError: 注文が見つからない、または状態が不正な場合
        AllocationCommitError: 引当確定中にエラーが発生した場合
    """
    # 状態チェック（確定可能状態のみ）
    order = _load_order(db, order_id)
    validate_commit_eligibility(order)

    preview = preview_fefo_allocation(db, order_id)

    created: list[Allocation] = []
    try:
        for line_plan in preview.lines:
            persist_allocation_entities(db, line_plan, created)

        update_order_allocation_status(db, order_id)

        db.commit()
    except Exception:
        db.rollback()
        raise

    return FefoCommitResult(preview=preview, created_allocations=created)


# ============================
# Allocation Cancellation
# ============================


def cancel_allocation(db: Session, allocation_id: int) -> None:
    """
    引当をキャンセル.

    v2.2: Lot.allocated_quantity を直接更新。

    Args:
        db: データベースセッション
        allocation_id: 引当ID

    Raises:
        AllocationNotFoundError: 引当が見つからない場合
        AllocationCommitError: ロットが見つからない場合
    """
    allocation_stmt = (
        select(Allocation)
        .options(joinedload(Allocation.lot), joinedload(Allocation.order_line))
        .where(Allocation.id == allocation_id)
    )
    allocation = db.execute(allocation_stmt).scalar_one_or_none()
    if not allocation:
        raise AllocationNotFoundError(f"Allocation {allocation_id} not found")

    # ロックをかけてロットを取得
    lot_stmt = select(Lot).where(Lot.id == allocation.lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        raise AllocationCommitError(f"Lot {allocation.lot_id} not found")

    # 引当数量を解放
    lot.allocated_quantity -= allocation.allocated_qty
    lot.updated_at = datetime.utcnow()

    db.delete(allocation)
    db.commit()
