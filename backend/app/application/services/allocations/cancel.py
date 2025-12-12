"""Allocation cancellation operations.

Handles cancellation of allocations:
- Single allocation cancellation
- Bulk cancellation
- Order line-level cancellation
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
)
from app.application.services.allocations.utils import (
    update_order_allocation_status,
    update_order_line_status,
)
from app.infrastructure.persistence.models import Allocation, Lot, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def cancel_allocation(db: Session, allocation_id: int, *, commit_db: bool = True) -> None:
    """引当をキャンセル.

    Args:
        db: データベースセッション
        allocation_id: 引当ID
        commit_db: Trueの場合、処理完了後にcommitを実行（デフォルト: True）

    Raises:
        AllocationNotFoundError: 引当が見つからない場合
        AllocationCommitError: ロットが見つからない場合
    """
    allocation = db.get(Allocation, allocation_id)
    if not allocation:
        raise AllocationNotFoundError(f"Allocation {allocation_id} not found")

    lot = None
    if allocation.lot_reference:
        lot_stmt = select(Lot).where(Lot.lot_number == allocation.lot_reference).with_for_update()
        lot = db.execute(lot_stmt).scalar_one_or_none()

    if lot:
        reservations = (
            db.query(LotReservation)
            .filter(
                LotReservation.lot_id == lot.id,
                LotReservation.source_id == allocation.order_line_id,
                LotReservation.source_type == ReservationSourceType.ORDER,
                LotReservation.status.in_([ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED]),
            )
            .all()
        )
        for reservation in reservations:
            reservation.status = ReservationStatus.RELEASED
            reservation.updated_at = datetime.utcnow()
        lot.updated_at = datetime.utcnow()

    order_line_id = allocation.order_line_id

    db.delete(allocation)
    db.flush()

    if order_line_id:
        line = db.get(OrderLine, order_line_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)

    if commit_db:
        db.commit()


def bulk_cancel_allocations(db: Session, allocation_ids: list[int]) -> tuple[list[int], list[int]]:
    """引当を一括キャンセル.

    Args:
        db: データベースセッション
        allocation_ids: キャンセル対象の引当ID一覧

    Returns:
        tuple[list[int], list[int]]: (成功したID一覧, 失敗したID一覧)
    """
    cancelled_ids: list[int] = []
    failed_ids: list[int] = []

    for allocation_id in allocation_ids:
        try:
            cancel_allocation(db, allocation_id, commit_db=False)
            cancelled_ids.append(allocation_id)
        except (AllocationNotFoundError, AllocationCommitError):
            failed_ids.append(allocation_id)

    if cancelled_ids:
        db.commit()

    return cancelled_ids, failed_ids


def cancel_allocations_for_order_line(db: Session, order_line_id: int) -> list[int]:
    """受注明細に紐づく全ての引当を一括キャンセル.

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID

    Returns:
        list[int]: キャンセルされた引当IDのリスト
    """
    allocations = db.query(Allocation).filter(Allocation.order_line_id == order_line_id).all()

    cancelled_ids: list[int] = []
    for alloc in allocations:
        if alloc.status != "cancelled":
            try:
                cancel_allocation(db, alloc.id, commit_db=False)
                cancelled_ids.append(alloc.id)
            except (AllocationNotFoundError, AllocationCommitError):
                continue

    if cancelled_ids:
        db.commit()

        line = db.get(OrderLine, order_line_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)
            db.commit()

    return cancelled_ids
