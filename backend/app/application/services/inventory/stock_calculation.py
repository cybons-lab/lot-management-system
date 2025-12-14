"""Stock calculation helpers using lot_reservations.

This module provides helper functions to calculate available stock dynamically
from lot_reservations instead of relying on the deprecated allocated_quantity column.
"""

from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Lot
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationStatus,
)


def get_confirmed_reserved_quantity(db: Session, lot_id: int) -> Decimal:
    """Get total CONFIRMED reserved quantity for a lot from lot_reservations.

    Only confirmed reservations affect Available Qty (per §1.2 invariant).
    Provisional (ACTIVE) reservations do NOT reduce Available Qty.
    """
    result = (
        db.query(func.coalesce(func.sum(LotReservation.reserved_qty), Decimal(0)))
        .filter(
            LotReservation.lot_id == lot_id,
            LotReservation.status == ReservationStatus.CONFIRMED,
        )
        .scalar()
    )
    return Decimal(result) if result else Decimal(0)


def get_provisional_quantity(db: Session, lot_id: int) -> Decimal:
    """Get total provisional (ACTIVE) reserved quantity for a lot.

    This is for UI display purposes only. Provisional reservations
    do NOT affect Available Qty calculations.
    """
    result = (
        db.query(func.coalesce(func.sum(LotReservation.reserved_qty), Decimal(0)))
        .filter(
            LotReservation.lot_id == lot_id,
            LotReservation.status == ReservationStatus.ACTIVE,
        )
        .scalar()
    )
    return Decimal(result) if result else Decimal(0)


def get_reserved_quantity(db: Session, lot_id: int) -> Decimal:
    """Get total reserved quantity for a lot from lot_reservations.

    DEPRECATED: Use get_confirmed_reserved_quantity for Available Qty calculation.
    This function now only returns CONFIRMED reservations for backward compatibility
    with the invariant: Available = Current - Locked - ConfirmedReserved.

    Note: Previously included both ACTIVE and CONFIRMED. Changed per §1.2 to only
    count CONFIRMED reservations.
    """
    return get_confirmed_reserved_quantity(db, lot_id)


def get_available_quantity(db: Session, lot: Lot) -> Decimal:
    """Calculate available quantity for a lot.

    available = current_quantity - reserved_quantity - locked_quantity
    """
    reserved = get_reserved_quantity(db, lot.id)
    locked = lot.locked_quantity or Decimal(0)
    current = lot.current_quantity or Decimal(0)
    return current - reserved - locked


def get_available_quantity_by_id(db: Session, lot_id: int) -> Decimal:
    """Calculate available quantity for a lot by ID.

    available = current_quantity - reserved_quantity - locked_quantity
    """
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        return Decimal(0)
    return get_available_quantity(db, lot)


def get_allocatable_quantity(db: Session, lot: Lot) -> Decimal:
    """Calculate allocatable quantity (excluding locked).

    allocatable = current_quantity - reserved_quantity
    Used for allocation where locked stock might still be considered.
    """
    reserved = get_reserved_quantity(db, lot.id)
    current = lot.current_quantity or Decimal(0)
    return current - reserved


# Subquery for use in SQLAlchemy queries
def reserved_quantity_subquery(db: Session):
    """Create a subquery that returns reserved_qty per lot_id.

    Usage in query:
        reserved_subq = reserved_quantity_subquery(db)
        query = (
            db.query(Lot, func.coalesce(reserved_subq.c.reserved_qty, 0))
            .outerjoin(reserved_subq, Lot.id == reserved_subq.c.lot_id)
        )
    """
    return (
        db.query(
            LotReservation.lot_id.label("lot_id"),
            func.sum(LotReservation.reserved_qty).label("reserved_qty"),
        )
        .filter(LotReservation.status == ReservationStatus.CONFIRMED)
        .group_by(LotReservation.lot_id)
        .subquery()
    )
