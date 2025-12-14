"""Allocation compatibility adapter for Phase 1 migration.

This module provides an adapter to convert LotReservation data
into the legacy Allocation-like response format for API compatibility.

P3: This adapter is temporary and will be removed after Phase 3.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


@dataclass
class AllocationCompatDTO:
    """DTO matching legacy Allocation response format.

    This provides backward compatibility for API consumers
    expecting the old allocations format.
    """

    id: int
    order_line_id: int
    lot_id: int | None
    lot_number: str | None
    allocated_quantity: Decimal
    allocation_type: str  # "soft" or "hard"
    status: str  # "allocated", "provisional", "shipped", "cancelled"
    confirmed_at: datetime | None
    confirmed_by: str | None
    created_at: datetime
    updated_at: datetime | None
    sap_document_no: str | None = None


def reservation_status_to_allocation_type(status: ReservationStatus) -> str:
    """Convert LotReservation status to legacy allocation_type.

    Args:
        status: ReservationStatus enum

    Returns:
        "soft" or "hard"
    """
    if status == ReservationStatus.CONFIRMED:
        return "hard"
    return "soft"


def reservation_status_to_allocation_status(status: ReservationStatus) -> str:
    """Convert LotReservation status to legacy allocation status.

    Args:
        status: ReservationStatus enum

    Returns:
        "allocated", "provisional", or "cancelled"
    """
    mapping = {
        ReservationStatus.TEMPORARY: "provisional",
        ReservationStatus.ACTIVE: "allocated",
        ReservationStatus.CONFIRMED: "allocated",
        ReservationStatus.RELEASED: "cancelled",
    }
    return mapping.get(status, "allocated")


def reservation_to_allocation_dto(
    reservation: LotReservation,
    lot_number: str | None = None,
) -> AllocationCompatDTO:
    """Convert LotReservation to AllocationCompatDTO.

    Args:
        reservation: LotReservation to convert
        lot_number: Optional lot number (resolved from lot relationship)

    Returns:
        AllocationCompatDTO with legacy-compatible fields
    """
    # Get lot_number from relationship if available
    resolved_lot_number = lot_number
    if resolved_lot_number is None and reservation.lot:
        resolved_lot_number = reservation.lot.lot_number

    return AllocationCompatDTO(
        id=reservation.id,
        order_line_id=reservation.source_id or 0,
        lot_id=reservation.lot_id,
        lot_number=resolved_lot_number,
        allocated_quantity=reservation.reserved_qty,
        allocation_type=reservation_status_to_allocation_type(
            ReservationStatus(reservation.status)
        ),
        status=reservation_status_to_allocation_status(ReservationStatus(reservation.status)),
        confirmed_at=reservation.confirmed_at,
        confirmed_by=None,  # Not tracked in lot_reservations
        created_at=reservation.created_at,
        updated_at=reservation.updated_at,
        sap_document_no=reservation.sap_document_no,
    )


def get_allocations_for_order_line(
    db: Session,
    order_line_id: int,
) -> list[AllocationCompatDTO]:
    """Get allocations for an order line from lot_reservations.

    P3: This is the new way to get allocations using lot_reservations
    as the single source of truth.

    Args:
        db: Database session
        order_line_id: Order line ID

    Returns:
        List of AllocationCompatDTO
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

    return [reservation_to_allocation_dto(r) for r in reservations]


def get_allocation_by_id(
    db: Session,
    reservation_id: int,
) -> AllocationCompatDTO | None:
    """Get a single allocation by ID from lot_reservations.

    Args:
        db: Database session
        reservation_id: LotReservation ID

    Returns:
        AllocationCompatDTO or None if not found
    """
    reservation = db.get(LotReservation, reservation_id)
    if not reservation:
        return None
    return reservation_to_allocation_dto(reservation)
