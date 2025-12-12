"""Soft allocation preemption for hard allocation.

Handles automatic release of soft allocations when hard allocation is requested.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import case as sa_case
from sqlalchemy import select
from sqlalchemy.orm import Session

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


def _get_available_quantity_for_preempt(db: Session, lot: Lot) -> Decimal:
    """Get available quantity for preemption check."""
    from app.application.services.inventory.stock_calculation import get_available_quantity

    return get_available_quantity(db, lot)


def preempt_soft_allocations_for_hard(
    db: Session,
    lot_id: int,
    required_qty: Decimal,
    hard_demand_id: int,
) -> list[dict]:
    """Hard引当時に同ロットのSoft引当を自動解除.

    優先度: KANBAN > ORDER > FORECAST (優先度の低いものから解除)

    Args:
        db: データベースセッション
        lot_id: ロットID
        required_qty: 必要数量（Hard引当する数量）
        hard_demand_id: 新しいHard需要のorder_line_id

    Returns:
        list[dict]: 解除された引当情報のリスト
    """
    lot_stmt = select(Lot).where(Lot.id == lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        return []

    available = _get_available_quantity_for_preempt(db, lot)
    if available >= required_qty:
        return []

    shortage = required_qty - available

    soft_allocations_stmt = (
        select(Allocation)
        .join(OrderLine, Allocation.order_line_id == OrderLine.id)
        .where(
            Allocation.lot_reference == lot.lot_number,
            Allocation.allocation_type == "soft",
            Allocation.status == "allocated",
            Allocation.order_line_id != hard_demand_id,
        )
        .order_by(
            sa_case(
                (OrderLine.order_type == "KANBAN", 4),
                (OrderLine.order_type == "ORDER", 3),
                (OrderLine.order_type == "SPOT", 2),
                (OrderLine.order_type == "FORECAST_LINKED", 1),
                else_=3,
            ).asc(),
            Allocation.created_at.asc(),
        )
    )

    soft_allocations = db.execute(soft_allocations_stmt).scalars().all()

    released_info: list[dict] = []
    remaining_shortage = shortage

    for allocation in soft_allocations:
        if remaining_shortage <= 0:
            break

        release_qty = min(allocation.allocated_quantity, remaining_shortage)

        reservations = (
            db.query(LotReservation)
            .filter(
                LotReservation.lot_id == lot_id,
                LotReservation.source_id == allocation.order_line_id,
                LotReservation.source_type == ReservationSourceType.ORDER,
                LotReservation.status.in_([ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED]),
            )
            .all()
        )

        order_line_id = allocation.order_line_id
        order_line = db.get(OrderLine, order_line_id)

        if release_qty < allocation.allocated_quantity:
            allocation.allocated_quantity -= release_qty

            for reservation in reservations:
                if reservation.reserved_qty > release_qty:
                    reservation.reserved_qty -= release_qty
                    break
                else:
                    reservation.reserved_qty -= release_qty

            released_info.append(
                {
                    "allocation_id": allocation.id,
                    "order_line_id": order_line_id,
                    "released_qty": float(release_qty),
                    "order_type": order_line.order_type if order_line else "UNKNOWN",
                }
            )
        else:
            for reservation in reservations:
                reservation.status = ReservationStatus.RELEASED
                reservation.released_at = datetime.utcnow()

            released_info.append(
                {
                    "allocation_id": allocation.id,
                    "order_line_id": order_line_id,
                    "released_qty": float(release_qty),
                    "order_type": order_line.order_type if order_line else "UNKNOWN",
                }
            )
            db.delete(allocation)

        lot.updated_at = datetime.utcnow()
        remaining_shortage -= release_qty

        if order_line:
            update_order_allocation_status(db, order_line.order_id)
            update_order_line_status(db, order_line.id)

    db.flush()

    return released_info
