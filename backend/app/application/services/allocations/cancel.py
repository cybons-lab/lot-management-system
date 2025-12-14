"""Reservation cancellation operations.

Handles cancellation of reservations:
- Single reservation cancellation
- Bulk cancellation
- Order line-level cancellation

P3: Uses LotReservation exclusively.
"""

from __future__ import annotations

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
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import Lot, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def release_reservation(db: Session, reservation_id: int, *, commit_db: bool = True) -> None:
    """予約を解放（キャンセル）.

    Args:
        db: データベースセッション
        reservation_id: 予約ID
        commit_db: Trueの場合、処理完了後にcommitを実行

    Raises:
        AllocationNotFoundError: 予約が見つからない場合
    """
    reservation = db.get(LotReservation, reservation_id)
    if not reservation:
        raise AllocationNotFoundError(f"Reservation {reservation_id} not found")

    # Already released - idempotent
    if reservation.status == ReservationStatus.RELEASED:
        return

    now = utcnow()

    lot = None
    if reservation.lot_id:
        lot_stmt = select(Lot).where(Lot.id == reservation.lot_id).with_for_update()
        lot = db.execute(lot_stmt).scalar_one_or_none()

    reservation.status = ReservationStatus.RELEASED
    reservation.released_at = now
    reservation.updated_at = now

    if lot:
        lot.updated_at = now

    db.flush()

    if reservation.source_type == ReservationSourceType.ORDER and reservation.source_id:
        line = db.get(OrderLine, reservation.source_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)

    if commit_db:
        db.commit()


def bulk_release_reservations(
    db: Session, reservation_ids: list[int]
) -> tuple[list[int], list[int]]:
    """予約を一括解放.

    Args:
        db: データベースセッション
        reservation_ids: 解放対象の予約ID一覧

    Returns:
        tuple[list[int], list[int]]: (成功したID一覧, 失敗したID一覧)
    """
    released_ids: list[int] = []
    failed_ids: list[int] = []

    for reservation_id in reservation_ids:
        try:
            release_reservation(db, reservation_id, commit_db=False)
            released_ids.append(reservation_id)
        except (AllocationNotFoundError, AllocationCommitError):
            failed_ids.append(reservation_id)

    if released_ids:
        db.commit()

    return released_ids, failed_ids


def release_reservations_for_order_line(db: Session, order_line_id: int) -> list[int]:
    """受注明細に紐づく全ての予約を一括解放.

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID

    Returns:
        list[int]: 解放された予約IDのリスト
    """
    reservations = (
        db.query(LotReservation)
        .filter(
            LotReservation.source_type == ReservationSourceType.ORDER,
            LotReservation.source_id == order_line_id,
            LotReservation.status != ReservationStatus.RELEASED,
        )
        .all()
    )

    released_ids: list[int] = []
    for reservation in reservations:
        try:
            release_reservation(db, reservation.id, commit_db=False)
            released_ids.append(reservation.id)
        except (AllocationNotFoundError, AllocationCommitError):
            continue

    if released_ids:
        db.commit()

        line = db.get(OrderLine, order_line_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)
            db.commit()

    return released_ids


# Backward compatibility aliases
cancel_allocation = release_reservation
bulk_cancel_allocations = bulk_release_reservations
cancel_allocations_for_order_line = release_reservations_for_order_line
