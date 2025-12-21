"""Lot reservation history model for audit logging.

Records all changes to lot_reservations table with before/after values.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import Base


class HistoryOperation(str, PyEnum):
    """Operation type for history records."""

    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class LotReservationHistory(Base):
    """Audit log for lot_reservations changes.

    Records all INSERT, UPDATE, DELETE operations with before/after values.
    Enables full reconstruction of reservation state at any point in time.
    """

    __tablename__ = "lot_reservation_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    reservation_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    operation: Mapped[str] = mapped_column(String(10), nullable=False)

    # New values (for INSERT and UPDATE)
    lot_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    source_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    reserved_qty: Mapped[Decimal | None] = mapped_column(Numeric(15, 3), nullable=True)
    status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sap_document_no: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Old values (for UPDATE and DELETE)
    old_lot_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    old_source_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    old_source_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    old_reserved_qty: Mapped[Decimal | None] = mapped_column(Numeric(15, 3), nullable=True)
    old_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    old_sap_document_no: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Metadata
    changed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    change_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "operation IN ('INSERT', 'UPDATE', 'DELETE')",
            name="chk_lot_reservation_history_operation",
        ),
        Index("idx_lot_reservation_history_reservation", "reservation_id"),
        Index("idx_lot_reservation_history_lot", "lot_id"),
        Index("idx_lot_reservation_history_changed_at", "changed_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<LotReservationHistory(id={self.id}, reservation_id={self.reservation_id}, "
            f"operation={self.operation}, status={self.old_status}→{self.status})>"
        )
