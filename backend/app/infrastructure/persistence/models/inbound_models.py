"""Inbound planning related SQLAlchemy models."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .inventory_models import Lot
    from .masters_models import Product, Supplier


class InboundPlanStatus(str, PyEnum):
    """Valid status values for inbound plans."""

    PLANNED = "planned"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class InboundPlan(Base):
    """Inbound plan header details."""

    __tablename__ = "inbound_plans"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    plan_number: Mapped[str] = mapped_column(String(50), nullable=False)
    sap_po_number: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        unique=True,
        comment="SAP購買発注番号（業務キー）",
    )
    supplier_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    planned_arrival_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[InboundPlanStatus] = mapped_column(
        String(20), nullable=False, server_default=text("'planned'")
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("plan_number", name="uq_inbound_plans_plan_number"),
        UniqueConstraint("sap_po_number", name="uq_inbound_plans_sap_po_number"),
        CheckConstraint(
            "status IN ('planned','partially_received','received','cancelled')",
            name="chk_inbound_plans_status",
        ),
        Index("idx_inbound_plans_supplier", "supplier_id"),
        Index(
            "idx_inbound_plans_date",
            "planned_arrival_date",
        ),
        Index("idx_inbound_plans_status", "status"),
    )

    supplier: Mapped[Supplier] = relationship("Supplier", back_populates="inbound_plans")
    lines: Mapped[list[InboundPlanLine]] = relationship(
        "InboundPlanLine",
        back_populates="inbound_plan",
        cascade="all, delete-orphan",
    )


class InboundPlanLine(Base):
    """Inbound plan line items."""

    __tablename__ = "inbound_plan_lines"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    inbound_plan_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("inbound_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    planned_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index("idx_inbound_plan_lines_plan", "inbound_plan_id"),
        Index("idx_inbound_plan_lines_product", "product_id"),
    )

    inbound_plan: Mapped[InboundPlan] = relationship("InboundPlan", back_populates="lines")
    product: Mapped[Product] = relationship("Product", back_populates="inbound_plan_lines")
    expected_lots: Mapped[list[ExpectedLot]] = relationship(
        "ExpectedLot", back_populates="inbound_plan_line", cascade="all, delete-orphan"
    )
    # P3: Provisional reservations moved to LotReservation (removed)


class ExpectedLot(Base):
    """Expected lots associated with inbound plan lines."""

    __tablename__ = "expected_lots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    inbound_plan_line_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "inbound_plan_lines.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )
    expected_lot_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expected_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    expected_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index("idx_expected_lots_line", "inbound_plan_line_id"),
        Index("idx_expected_lots_number", "expected_lot_number"),
    )

    inbound_plan_line: Mapped[InboundPlanLine] = relationship(
        "InboundPlanLine", back_populates="expected_lots"
    )
    lot: Mapped[Lot | None] = relationship("Lot", back_populates="expected_lot", uselist=False)
