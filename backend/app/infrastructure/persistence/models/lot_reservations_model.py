"""Lot reservation model for decoupled reservation management.

This model represents lot reservations as defined in the decoupling
migration plan. All lot reservations (forecast, order, manual) are
managed through this table.

See: docs/architecture/system_invariants.md
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover
    from .inventory_models import Lot


class ReservationSourceType(str, PyEnum):
    """Source type for lot reservations.

    Defines the origin of the reservation:
    - FORECAST: Reserved for forecast demand
    - ORDER: Reserved for confirmed orders
    - MANUAL: Manually reserved (e.g., for samples, special cases)
    """

    FORECAST = "forecast"
    ORDER = "order"
    MANUAL = "manual"


class ReservationStatus(str, PyEnum):
    """Status of a lot reservation.

    State machine:
    - TEMPORARY: Short-lived reservation (may expire)
    - ACTIVE: Valid reservation, included in available qty calculation
    - CONFIRMED: Finalized reservation (hard allocation)
    - RELEASED: Reservation released, no longer affects available qty
    """

    TEMPORARY = "temporary"
    ACTIVE = "active"
    CONFIRMED = "confirmed"
    RELEASED = "released"


class LotReservation(Base):
    """Represents a reservation against a lot.

    All lot reservations (forecast, order, manual) are managed through
    this table. This replaces direct updates to Lot.allocated_quantity.

    Invariants (from system_invariants.md):
    - reserved_qty must be positive
    - Only 'active' and 'confirmed' reservations affect available qty
    - source_type + source_id identify the reservation origin
    """

    __tablename__ = "lot_reservations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    lot_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lots.id", ondelete="RESTRICT"),
        nullable=False,
    )

    source_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Reservation source: 'forecast' | 'order' | 'manual'",
    )

    source_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
        comment="ID of the source entity (order_line_id, forecast_group_id, etc.)",
    )

    reserved_qty: Mapped[Decimal] = mapped_column(
        Numeric(15, 3),
        nullable=False,
        comment="Reserved quantity (must be positive)",
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'active'"),
        comment="Reservation status: 'temporary' | 'active' | 'confirmed' | 'released'",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        onupdate=func.current_timestamp(),
        comment="Timestamp of last update",
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Expiration time for temporary reservations",
    )

    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Timestamp when reservation was confirmed",
    )

    released_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Timestamp when reservation was released",
    )

    # SAP Registration markers (P3: explicit CONFIRMED signal)
    sap_document_no: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="SAP document number (set on successful SAP registration)",
    )

    sap_registered_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Timestamp when reservation was registered in SAP",
    )

    __table_args__ = (
        # Check constraints
        CheckConstraint(
            "reserved_qty > 0",
            name="chk_lot_reservations_qty_positive",
        ),
        CheckConstraint(
            "source_type IN ('forecast', 'order', 'manual')",
            name="chk_lot_reservations_source_type",
        ),
        CheckConstraint(
            "status IN ('temporary', 'active', 'confirmed', 'released')",
            name="chk_lot_reservations_status",
        ),
        # Indexes
        Index("idx_lot_reservations_lot_status", "lot_id", "status"),
        Index("idx_lot_reservations_source", "source_type", "source_id"),
        Index("idx_lot_reservations_status", "status"),
        Index(
            "idx_lot_reservations_expires_at",
            "expires_at",
            postgresql_where=text("expires_at IS NOT NULL"),
        ),
    )

    # Relationships
    lot: Mapped[Lot] = relationship("Lot", back_populates="reservations")

    def __repr__(self) -> str:
        return (
            f"<LotReservation(id={self.id}, lot_id={self.lot_id}, "
            f"source_type={self.source_type}, qty={self.reserved_qty}, "
            f"status={self.status})>"
        )

    @property
    def is_active(self) -> bool:
        """Check if reservation affects available quantity."""
        return self.status in (ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED)
