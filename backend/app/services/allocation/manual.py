from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import Allocation, Lot, OrderLine

from .schemas import AllocationCommitError
from .utils import update_order_allocation_status, update_order_line_status


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
