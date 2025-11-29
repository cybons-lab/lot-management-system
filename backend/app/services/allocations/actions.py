"""
Allocation actions service.

Handles execution of allocations:
- Commit FEFO allocation
- Manual allocation (Drag & Assign)
- Cancel allocation
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Allocation, Lot, Order, OrderLine
from app.services.allocations.fefo import preview_fefo_allocation
from app.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
    FefoCommitResult,
    FefoLinePlan,
)
from app.services.allocations.utils import (
    _load_order,
    update_order_allocation_status,
    update_order_line_status,
)


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


def commit_fefo_allocation(db: Session, order_id: int) -> FefoCommitResult:
    """
    FEFO引当確定（状態: open|part_allocated のみ許容）.

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


def allocate_manually(
    db: Session,
    order_line_id: int,
    lot_id: int,
    quantity: float | Decimal,
    *,
    commit_db: bool = True,
) -> Allocation:
    """
    手動引当実行 (Drag & Assign).

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID
        lot_id: ロットID
        quantity: 引当数量
        commit_db: Trueの場合、処理完了後にcommitを実行（デフォルト: True）

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

    if commit_db:
        db.commit()
        db.refresh(allocation)

    return allocation


def cancel_allocation(db: Session, allocation_id: int, *, commit_db: bool = True) -> None:
    """
    引当をキャンセル.

    Args:
        db: データベースセッション
        allocation_id: 引当ID
        commit_db: Trueの場合、処理完了後にcommitを実行（デフォルト: True）

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

    # 注文ステータス更新
    db.flush()
    if allocation.order_line:
        update_order_allocation_status(db, allocation.order_line.order_id)
        update_order_line_status(db, allocation.order_line.id)

    if commit_db:
        db.commit()
