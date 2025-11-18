"""Inventory and stock management models (DDL v2.2).

All models strictly follow the DDL as the single source of truth.
Legacy models (ExpiryRule) have been removed.
"""

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
    from .forecast_models import ForecastLine
    from .inbound_models import ExpectedLot
    from .masters_models import Product, Supplier, Warehouse
    from .orders_models import Allocation


class StockTransactionType(str, PyEnum):
    """Enumerates valid stock transaction types."""

    INBOUND = "inbound"
    ALLOCATION = "allocation"
    SHIPMENT = "shipment"
    ADJUSTMENT = "adjustment"
    RETURN = "return"


class Lot(Base):
    """Represents physical inventory lots (ロット在庫).

    DDL: lots
    Primary key: id (BIGSERIAL)
    Foreign keys: product_id, warehouse_id, supplier_id, expected_lot_id
    """

    __tablename__ = "lots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lot_number: Mapped[str] = mapped_column(String(100), nullable=False)
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    warehouse_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    supplier_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
    )
    expected_lot_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("expected_lots.id", ondelete="SET NULL"),
        nullable=True,
    )
    received_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    current_quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3), nullable=False, server_default=text("0")
    )
    allocated_quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3), nullable=False, server_default=text("0")
    )
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'active'"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    __table_args__ = (
        CheckConstraint("current_quantity >= 0", name="chk_lots_current_quantity"),
        CheckConstraint("allocated_quantity >= 0", name="chk_lots_allocated_quantity"),
        CheckConstraint(
            "allocated_quantity <= current_quantity",
            name="chk_lots_allocation_limit",
        ),
        CheckConstraint(
            "status IN ('active','depleted','expired','quarantine')",
            name="chk_lots_status",
        ),
        UniqueConstraint(
            "lot_number",
            "product_id",
            "warehouse_id",
            name="uq_lots_number_product_warehouse",
        ),
        Index("idx_lots_number", "lot_number"),
        Index("idx_lots_product_warehouse", "product_id", "warehouse_id"),
        Index("idx_lots_status", "status"),
        Index("idx_lots_supplier", "supplier_id"),
        Index("idx_lots_warehouse", "warehouse_id"),
        Index(
            "idx_lots_expiry_date",
            "expiry_date",
            postgresql_where=text("expiry_date IS NOT NULL"),
        ),
    )

    # Relationships
    product: Mapped[Product] = relationship("Product", back_populates="lots")
    warehouse: Mapped[Warehouse] = relationship("Warehouse", back_populates="lots")
    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="lots")
    expected_lot: Mapped[ExpectedLot | None] = relationship(
        "ExpectedLot", back_populates="lot", uselist=False
    )
    allocations: Mapped[list[Allocation]] = relationship(
        "Allocation", back_populates="lot", cascade="all, delete-orphan"
    )
    stock_history: Mapped[list[StockHistory]] = relationship(
        "StockHistory", back_populates="lot", cascade="all, delete-orphan"
    )
    adjustments: Mapped[list[Adjustment]] = relationship(
        "Adjustment", back_populates="lot", cascade="all, delete-orphan"
    )


class StockHistory(Base):
    """Tracks all stock transactions against lots (在庫履歴).

    DDL: stock_history
    Primary key: id (BIGSERIAL)
    Foreign key: lot_id -> lots(id)
    """

    __tablename__ = "stock_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lot_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lots.id", ondelete="CASCADE"),
        nullable=False,
    )
    transaction_type: Mapped[StockTransactionType] = mapped_column(
        String(20),
        nullable=False,
    )
    quantity_change: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    quantity_after: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('inbound','allocation','shipment','adjustment','return')",
            name="chk_stock_history_type",
        ),
        Index("idx_stock_history_lot", "lot_id"),
        Index("idx_stock_history_date", "transaction_date"),
        Index("idx_stock_history_type", "transaction_type"),
    )

    # Relationships
    lot: Mapped[Lot] = relationship("Lot", back_populates="stock_history")


class AdjustmentType(str, PyEnum):
    """Enumerates allowed adjustment reasons."""

    PHYSICAL_COUNT = "physical_count"
    DAMAGE = "damage"
    LOSS = "loss"
    FOUND = "found"
    OTHER = "other"


class Adjustment(Base):
    """Inventory adjustments linked to a lot (在庫調整).

    DDL: adjustments
    Primary key: id (BIGSERIAL)
    Foreign keys: lot_id -> lots(id), adjusted_by -> users(id)
    """

    __tablename__ = "adjustments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lot_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    adjustment_type: Mapped[AdjustmentType] = mapped_column(String(20), nullable=False)
    adjusted_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    adjusted_by: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    adjusted_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "adjustment_type IN ('physical_count','damage','loss','found','other')",
            name="chk_adjustments_type",
        ),
        Index("idx_adjustments_lot", "lot_id"),
        Index("idx_adjustments_date", "adjusted_at"),
    )

    # Relationships
    lot: Mapped[Lot] = relationship("Lot", back_populates="adjustments")


# REMOVED: InventoryItem model
# The inventory_items table has been deprecated in favor of real-time aggregation
# from the lots table. Inventory summaries are now computed on-demand using
# SQLAlchemy aggregation queries in the InventoryService layer.
# See: app/services/inventory/inventory_service.py
#
# Historical context:
# - Previously: inventory_items table stored aggregated inventory data
# - Now: Inventory summaries are computed from lots table using GROUP BY queries
# - Benefits: Single source of truth, no sync issues, always up-to-date


class AllocationSuggestion(Base):
    """引当推奨（システムが提案する引当案）.

    DDL: allocation_suggestions
    Primary key: id (BIGSERIAL)
    Foreign keys: forecast_line_id, lot_id
    """

    __tablename__ = "allocation_suggestions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    forecast_line_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("forecast_lines.id", ondelete="CASCADE"),
        nullable=False,
    )
    lot_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("lots.id", ondelete="CASCADE"), nullable=False
    )
    suggested_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    allocation_logic: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        Index("idx_allocation_suggestions_forecast", "forecast_line_id"),
        Index("idx_allocation_suggestions_lot", "lot_id"),
    )

    # Relationships
    forecast_line: Mapped[ForecastLine] = relationship("ForecastLine")
    lot: Mapped[Lot] = relationship("Lot")


# Backward compatibility aliases (to be removed in later refactors)
StockMovement = StockHistory
StockMovementReason = StockTransactionType

# REMOVED: LotCurrentStock alias
# LotCurrentStock was an alias for InventoryItem, which has been removed.
# Inventory summaries are now computed on-demand from the lots table.
# Use InventoryService to get aggregated inventory data.
