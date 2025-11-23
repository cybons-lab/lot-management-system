"""
FEFO allocation service (excluding locked lots).

v2.2: lot_current_stock 依存を削除。Lot モデルを直接使用。

Refactored: God functions split into smaller, reusable functions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

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
            allocated_quantity=alloc_plan.allocate_qty,
            status="reserved",
            created_at=datetime.utcnow(),
        )
        db.add(allocation)
        created.append(allocation)


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
    lot.allocated_quantity -= allocation.allocated_quantity
    lot.updated_at = datetime.utcnow()

    db.delete(allocation)


def allocate_manually(
    db: Session, order_line_id: int, lot_id: int, quantity: float | Decimal
) -> Allocation:
    """
    手動引当実行 (Drag & Assign).

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID
        lot_id: ロットID
        quantity: 引当数量

    Returns:
        Allocation: 作成された引当オブジェクト

    Raises:
        AllocationCommitError: 引当に失敗した場合
        ValueError: パラメータが不正な場合
    """
    EPSILON = Decimal("1e-6")

    # Ensure quantity is Decimal
    if isinstance(quantity, float):
        quantity = Decimal(str(quantity))
    elif isinstance(quantity, int):
        quantity = Decimal(quantity)

    if quantity <= 0:
        raise ValueError("Allocation quantity must be positive")

    # 受注明細取得
    line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not line:
        raise ValueError(f"OrderLine {order_line_id} not found")

    # ロット取得 (ロック付き)
    lot = db.query(Lot).filter(Lot.id == lot_id).with_for_update().first()
    if not lot:
        raise ValueError(f"Lot {lot_id} not found")

    if lot.status != "active":
        raise AllocationCommitError(f"Lot {lot_id} is not active")

    # 在庫チェック
    available = lot.current_quantity - lot.allocated_quantity
    if available + EPSILON < quantity:
        raise AllocationCommitError(
            f"Insufficient stock: required {quantity}, available {available}"
        )

    # 引当実行
    lot.allocated_quantity += quantity
    lot.updated_at = datetime.utcnow()

    allocation = Allocation(
        order_line_id=line.id,
        lot_id=lot.id,
        allocated_quantity=quantity,
        status="allocated",
        created_at=datetime.utcnow(),
    )
    db.add(allocation)

    # 注文ステータス更新のためにフラッシュ
    db.flush()

    # 親注文のステータス更新
    update_order_allocation_status(db, line.order_id)

    # 受注明細のステータス更新
    update_order_line_status(db, line.id)

    db.commit()
    db.refresh(allocation)
    return allocation


# ============================
# Enterprise-Level Allocation with Tracing
# ============================


def allocate_with_tracing(
    db: Session,
    order_line_id: int,
    reference_date: date | None = None,
) -> dict:
    """トレースログ付き引当処理（エンタープライズレベル）.

    純粋関数の計算エンジンを使用し、引当の推論過程を記録します。
    楽観的ロックを使用して同時実行制御を行います。

    Args:
        db: データベースセッション
        order_line_id: 注文明細ID
        reference_date: 基準日（期限切れ判定用、デフォルトは今日）

    Returns:
        dict: 引当結果とトレースログ
            - allocated_lots: 引き当てられたロット情報のリスト
            - total_allocated: 引当合計数量
            - shortage: 不足数量
            - trace_count: 保存されたトレースログ数

    Raises:
        ValueError: 注文明細が見つからない場合
        AllocationCommitError: 引当処理に失敗した場合
    """
    from datetime import date as date_type

    from sqlalchemy.exc import StaleDataError

    from app.domain.allocation import (
        AllocationRequest,
        LotCandidate,
        calculate_allocation,
    )
    from app.models import AllocationTrace

    if reference_date is None:
        reference_date = date_type.today()

    # 注文明細を取得
    line_stmt = (
        select(OrderLine)
        .options(joinedload(OrderLine.product))
        .where(OrderLine.id == order_line_id)
    )
    order_line = db.execute(line_stmt).scalar_one_or_none()
    if not order_line:
        raise ValueError(f"OrderLine {order_line_id} not found")

    product_id = order_line.product_id
    if not product_id:
        raise ValueError(f"OrderLine {order_line_id} has no product_id")

    # 候補ロットを取得
    lot_stmt = (
        select(Lot)
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
    lots = db.execute(lot_stmt).scalars().all()

    # LotCandidateに変換
    candidates = [
        LotCandidate(
            lot_id=lot.id,
            lot_number=lot.lot_number,
            expiry_date=lot.expiry_date,
            available_quantity=lot.current_quantity - lot.allocated_quantity,
            current_quantity=lot.current_quantity,
            allocated_quantity=lot.allocated_quantity,
            status=lot.status,
        )
        for lot in lots
    ]

    # 引当計算エンジンを実行
    request = AllocationRequest(
        order_line_id=order_line_id,
        required_quantity=order_line.converted_quantity
        if order_line.converted_quantity is not None
        else order_line.order_quantity,
        reference_date=reference_date,
        allow_partial=True,
    )
    result = calculate_allocation(request, candidates)

    # トランザクション内でDB更新
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # 楽観的ロックを使用してロットを更新
            for decision in result.allocated_lots:
                lot_stmt = select(Lot).where(Lot.id == decision.lot_id)
                lot = db.execute(lot_stmt).scalar_one()

                # 引当数量を更新（楽観的ロックが自動的にチェック）
                lot.allocated_quantity += decision.allocated_qty
                lot.updated_at = datetime.utcnow()

                # Allocationレコード作成
                allocation = Allocation(
                    order_line_id=order_line_id,
                    lot_id=lot.id,
                    allocated_quantity=decision.allocated_qty,
                    status="allocated",
                    created_at=datetime.utcnow(),
                )
                db.add(allocation)

            # トレースログを保存
            for trace in result.trace_logs:
                trace_log = AllocationTrace(
                    order_line_id=order_line_id,
                    lot_id=trace.lot_id,
                    score=trace.score,
                    decision=trace.decision,
                    reason=trace.reason,
                    allocated_qty=trace.allocated_qty,
                    created_at=datetime.utcnow(),
                )
                db.add(trace_log)

            db.commit()
            break  # 成功したらループを抜ける

        except StaleDataError:
            db.rollback()
            if attempt == max_retries - 1:
                raise AllocationCommitError(
                    f"Failed to allocate after {max_retries} retries due to concurrent updates"
                )
            # リトライ前に最新データを再取得
            continue

    return {
        "allocated_lots": [
            {
                "lot_id": decision.lot_id,
                "lot_number": decision.lot_number,
                "allocated_qty": float(decision.allocated_qty),
                "reason": decision.reason,
            }
            for decision in result.allocated_lots
        ],
        "total_allocated": float(result.total_allocated),
        "shortage": float(result.shortage),
        "trace_count": len(result.trace_logs),
    }
