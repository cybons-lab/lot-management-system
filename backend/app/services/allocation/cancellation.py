from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Allocation, Lot

from .schemas import AllocationCommitError, AllocationNotFoundError


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
