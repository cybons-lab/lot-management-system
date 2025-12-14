"""Soft reservation preemption for hard allocation.

Handles automatic release of soft reservations when hard allocation is requested.

P3: Uses LotReservation exclusively.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import case as sa_case
from sqlalchemy import select
from sqlalchemy.orm import Session

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


def _get_available_quantity_for_preempt(db: Session, lot: Lot) -> Decimal:
    """Get available quantity for preemption check."""
    from app.application.services.inventory.stock_calculation import get_available_quantity

    return get_available_quantity(db, lot)


def preempt_soft_reservations_for_hard(
    db: Session,
    lot_id: int,
    required_qty: Decimal,
    hard_demand_id: int,
) -> list[dict]:
    """Hard確定時に同ロットのSoft予約を自動解除.

    優先度: KANBAN > ORDER > FORECAST (優先度の低いものから解除)

    Args:
        db: データベースセッション
        lot_id: ロットID
        required_qty: 必要数量（Hard確定する数量）
        hard_demand_id: 新しいHard需要のsource_id

    Returns:
        list[dict]: 解除された予約情報のリスト
    """
    lot_stmt = select(Lot).where(Lot.id == lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        return []

    available = _get_available_quantity_for_preempt(db, lot)
    if available >= required_qty:
        return []

    shortage = required_qty - available

    # Get soft reservations (ACTIVE, not CONFIRMED) ordered by priority
    soft_reservations_stmt = (
        select(LotReservation)
        .outerjoin(
            OrderLine,
            (LotReservation.source_type == ReservationSourceType.ORDER)
            & (LotReservation.source_id == OrderLine.id),
        )
        .where(
            LotReservation.lot_id == lot_id,
            LotReservation.status == ReservationStatus.ACTIVE,
            LotReservation.source_id != hard_demand_id,
        )
        .order_by(
            sa_case(
                (OrderLine.order_type == "KANBAN", 4),
                (OrderLine.order_type == "ORDER", 3),
                (OrderLine.order_type == "SPOT", 2),
                (OrderLine.order_type == "FORECAST_LINKED", 1),
                else_=3,
            ).asc(),
            LotReservation.created_at.asc(),
        )
    )

    soft_reservations = db.execute(soft_reservations_stmt).scalars().all()

    released_info: list[dict] = []
    remaining_shortage = shortage

    now = utcnow()

    for reservation in soft_reservations:
        if remaining_shortage <= 0:
            break

        release_qty = min(reservation.reserved_qty, remaining_shortage)

        order_line = None
        if reservation.source_type == ReservationSourceType.ORDER and reservation.source_id:
            order_line = db.get(OrderLine, reservation.source_id)

        if release_qty < reservation.reserved_qty:
            # Partial release - reduce quantity
            reservation.reserved_qty -= release_qty
            reservation.updated_at = now

            released_info.append(
                {
                    "reservation_id": reservation.id,
                    "source_id": reservation.source_id,
                    "released_qty": float(release_qty),
                    "order_type": order_line.order_type if order_line else "UNKNOWN",
                }
            )
        else:
            # Full release
            reservation.status = ReservationStatus.RELEASED
            reservation.released_at = now
            reservation.updated_at = now

            released_info.append(
                {
                    "reservation_id": reservation.id,
                    "source_id": reservation.source_id,
                    "released_qty": float(release_qty),
                    "order_type": order_line.order_type if order_line else "UNKNOWN",
                }
            )

        lot.updated_at = now
        remaining_shortage -= release_qty

        if order_line:
            update_order_allocation_status(db, order_line.order_id)
            update_order_line_status(db, order_line.id)

    db.flush()

    return released_info
