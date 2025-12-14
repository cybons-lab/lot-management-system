"""FEFO reservation commit operations.

Handles commit of FEFO-based reservations:
- Validate commit eligibility
- Persist reservation entities with pessimistic locking
- Execute FEFO reservation commit

P3: Uses LotReservation exclusively.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.allocations.fefo import preview_fefo_allocation
from app.application.services.allocations.schemas import (
    AllocationCommitError,
    FefoCommitResult,
    FefoLinePlan,
)
from app.application.services.allocations.utils import (
    _load_order,
    update_order_allocation_status,
)
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import Lot, Order, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def validate_commit_eligibility(order: Order) -> None:
    """Validate order status for commit operation.

    Args:
        order: Order entity

    Raises:
        ValueError: If order status does not allow commit
    """
    if order.status not in {"open", "part_allocated"}:
        raise ValueError(
            f"Order status '{order.status}' does not allow commit. Allowed: open, part_allocated"
        )


def persist_reservation_entities(
    db: Session,
    line_plan: FefoLinePlan,
    created: list[LotReservation],
) -> None:
    """Persist reservation entities with pessimistic locking.

    Args:
        db: Database session
        line_plan: Line allocation plan
        created: List to append created reservations

    Raises:
        AllocationCommitError: If persistence fails
    """
    EPSILON = 1e-6

    if not line_plan.allocations:
        return

    line_stmt = select(OrderLine).where(OrderLine.id == line_plan.order_line_id)
    line = db.execute(line_stmt).scalar_one_or_none()
    if not line:
        raise AllocationCommitError(f"OrderLine {line_plan.order_line_id} not found")

    if line_plan.next_div and not getattr(line, "next_div", None):
        line.next_div = line_plan.next_div  # type: ignore[attr-defined]

    now = utcnow()

    for alloc_plan in line_plan.allocations:
        lot_stmt = select(Lot).where(Lot.id == alloc_plan.lot_id).with_for_update()
        lot = db.execute(lot_stmt).scalar_one_or_none()
        if not lot:
            raise AllocationCommitError(f"Lot {alloc_plan.lot_id} not found")
        if lot.status != "active":
            raise AllocationCommitError(
                f"Lot {alloc_plan.lot_id} status '{lot.status}' is not active"
            )

        available = float(get_available_quantity(db, lot))
        if available + EPSILON < alloc_plan.allocate_qty:
            raise AllocationCommitError(
                f"Insufficient stock for lot {lot.id}: "
                f"required {alloc_plan.allocate_qty}, available {available}"
            )

        reservation = LotReservation(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=line.id,
            reserved_qty=Decimal(str(alloc_plan.allocate_qty)),
            status=ReservationStatus.ACTIVE,
            created_at=now,
        )
        db.add(reservation)
        lot.updated_at = now
        created.append(reservation)


def commit_fefo_reservation(db: Session, order_id: int) -> FefoCommitResult:
    """FEFO予約確定（状態: open|part_allocated のみ許容）.

    Args:
        db: データベースセッション
        order_id: 注文ID

    Returns:
        FefoCommitResult: 予約確定結果

    Raises:
        ValueError: 注文が見つからない、または状態が不正な場合
        AllocationCommitError: 予約確定中にエラーが発生した場合
    """
    order = _load_order(db, order_id)
    validate_commit_eligibility(order)

    preview = preview_fefo_allocation(db, order_id)

    created: list[LotReservation] = []
    try:
        for line_plan in preview.lines:
            persist_reservation_entities(db, line_plan, created)

        update_order_allocation_status(db, order_id)

        db.commit()
    except Exception:
        db.rollback()
        raise

    return FefoCommitResult(preview=preview, created_reservations=created)


# Backward compatibility aliases
persist_allocation_entities = persist_reservation_entities
commit_fefo_allocation = commit_fefo_reservation
