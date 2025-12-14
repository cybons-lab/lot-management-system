"""Manual reservation operations.

Handles manual allocation (Drag & Assign):
- Direct lot-to-order-line reservation
- Event dispatching for reservation creation

P3: Uses LotReservation exclusively.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.application.services.allocations.schemas import AllocationCommitError
from app.application.services.allocations.utils import (
    update_order_allocation_status,
    update_order_line_status,
)
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import Lot, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def create_manual_reservation(
    db: Session,
    order_line_id: int,
    lot_id: int,
    quantity: float | Decimal,
    *,
    commit_db: bool = True,
) -> LotReservation:
    """手動予約作成 (Drag & Assign).

    P3: LotReservation のみを作成。Allocation は作成しない。

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID
        lot_id: ロットID
        quantity: 予約数量
        commit_db: Trueの場合、処理完了後にcommitを実行

    Returns:
        LotReservation: 作成された予約オブジェクト

    Raises:
        AllocationCommitError: 予約に失敗した場合
        ValueError: パラメータが不正な場合
    """
    from app.domain.events import AllocationCreatedEvent, EventDispatcher

    EPSILON = Decimal("1e-6")

    if isinstance(quantity, float):
        quantity = Decimal(str(quantity))
    elif isinstance(quantity, int):
        quantity = Decimal(quantity)

    if quantity <= 0:
        raise ValueError("Reservation quantity must be positive")

    line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not line:
        raise ValueError(f"OrderLine {order_line_id} not found")

    lot = db.query(Lot).filter(Lot.id == lot_id).with_for_update().first()
    if not lot:
        raise ValueError(f"Lot {lot_id} not found")

    if lot.status != "active":
        raise AllocationCommitError(f"Lot {lot_id} is not active")

    if lot.product_id != line.product_id:
        raise ValueError(
            f"Product mismatch: Lot product {lot.product_id} != Line product {line.product_id}"
        )

    available = get_available_quantity(db, lot)
    if available + EPSILON < quantity:
        raise AllocationCommitError(
            f"Insufficient stock: required {quantity}, available {available}"
        )

    now = utcnow()

    reservation = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=line.id,
        reserved_qty=quantity,
        status=ReservationStatus.ACTIVE,
        created_at=now,
    )
    db.add(reservation)
    lot.updated_at = now

    db.flush()

    update_order_allocation_status(db, line.order_id)
    update_order_line_status(db, line.id)

    if commit_db:
        db.commit()
        db.refresh(reservation)

        event = AllocationCreatedEvent(
            allocation_id=reservation.id,  # P3: Use reservation ID
            order_line_id=order_line_id,
            lot_id=lot_id,
            quantity=quantity,
            allocation_type="soft",
        )
        EventDispatcher.queue(event)

    return reservation


# Backward compatibility alias
allocate_manually = create_manual_reservation
