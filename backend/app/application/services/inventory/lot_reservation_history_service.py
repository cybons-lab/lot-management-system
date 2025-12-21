"""Lot reservation history service for audit logging.

Provides methods to record changes to lot_reservations table.
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.lot_reservation_history_model import (
    HistoryOperation,
    LotReservationHistory,
)


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.lot_reservations_model import LotReservation


class LotReservationHistoryService:
    """Service for recording lot reservation audit history."""

    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db

    def record_insert(
        self,
        reservation: LotReservation,
        changed_by: str | None = None,
        change_reason: str | None = None,
    ) -> LotReservationHistory:
        """Record a new reservation creation.

        Args:
            reservation: The newly created reservation
            changed_by: User or system identifier
            change_reason: Optional reason for the change

        Returns:
            The created history record
        """
        history = LotReservationHistory(
            reservation_id=reservation.id,
            operation=HistoryOperation.INSERT.value,
            lot_id=reservation.lot_id,
            source_type=reservation.source_type,
            source_id=reservation.source_id,
            reserved_qty=reservation.reserved_qty,
            status=reservation.status,
            sap_document_no=reservation.sap_document_no,
            changed_by=changed_by,
            changed_at=utcnow(),
            change_reason=change_reason or "New reservation created",
        )
        self.db.add(history)
        return history

    def record_update(
        self,
        reservation: LotReservation,
        old_status: str | None = None,
        old_reserved_qty: Decimal | None = None,
        old_sap_document_no: str | None = None,
        changed_by: str | None = None,
        change_reason: str | None = None,
    ) -> LotReservationHistory:
        """Record a reservation update.

        Args:
            reservation: The reservation after update
            old_status: Previous status value
            old_reserved_qty: Previous quantity value
            old_sap_document_no: Previous SAP document number
            changed_by: User or system identifier
            change_reason: Optional reason for the change

        Returns:
            The created history record
        """
        history = LotReservationHistory(
            reservation_id=reservation.id,
            operation=HistoryOperation.UPDATE.value,
            # New values
            lot_id=reservation.lot_id,
            source_type=reservation.source_type,
            source_id=reservation.source_id,
            reserved_qty=reservation.reserved_qty,
            status=reservation.status,
            sap_document_no=reservation.sap_document_no,
            # Old values
            old_lot_id=reservation.lot_id,  # lot_id doesn't change
            old_source_type=reservation.source_type,  # source doesn't change
            old_source_id=reservation.source_id,
            old_reserved_qty=old_reserved_qty,
            old_status=old_status,
            old_sap_document_no=old_sap_document_no,
            # Metadata
            changed_by=changed_by,
            changed_at=utcnow(),
            change_reason=change_reason,
        )
        self.db.add(history)
        return history

    def record_delete(
        self,
        reservation: LotReservation,
        changed_by: str | None = None,
        change_reason: str | None = None,
    ) -> LotReservationHistory:
        """Record a reservation deletion.

        Args:
            reservation: The reservation being deleted
            changed_by: User or system identifier
            change_reason: Optional reason for the deletion

        Returns:
            The created history record
        """
        history = LotReservationHistory(
            reservation_id=reservation.id,
            operation=HistoryOperation.DELETE.value,
            # Old values only
            old_lot_id=reservation.lot_id,
            old_source_type=reservation.source_type,
            old_source_id=reservation.source_id,
            old_reserved_qty=reservation.reserved_qty,
            old_status=reservation.status,
            old_sap_document_no=reservation.sap_document_no,
            # Metadata
            changed_by=changed_by,
            changed_at=utcnow(),
            change_reason=change_reason or "Reservation deleted",
        )
        self.db.add(history)
        return history

    def record_status_change(
        self,
        reservation: LotReservation,
        old_status: str,
        changed_by: str | None = None,
        change_reason: str | None = None,
    ) -> LotReservationHistory:
        """Convenience method for recording status changes.

        Args:
            reservation: The reservation after status change
            old_status: Previous status value
            changed_by: User or system identifier
            change_reason: Optional reason (auto-generated if not provided)

        Returns:
            The created history record
        """
        reason = change_reason or f"Status changed: {old_status} → {reservation.status}"
        return self.record_update(
            reservation=reservation,
            old_status=old_status,
            changed_by=changed_by,
            change_reason=reason,
        )
