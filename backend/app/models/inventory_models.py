"""Inventory-related models aligned with the PostgreSQL schema."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .masters_models import Product, Supplier, Warehouse
    from .orders_models import Allocation


class StockMovementReason(str, PyEnum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"
    SCRAP = "scrap"


class Lot(Base):
    """Lot master records."""

    __tablename__ = "lots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lot_number: Mapped[str] = mapped_column(Text, nullable=False)
    receipt_date: Mapped[date] = mapped_column(Date, nullable=False)
    mfg_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    kanban_class: Mapped[str | None] = mapped_column(Text)
    sales_unit: Mapped[str | None] = mapped_column(Text)
    inventory_unit: Mapped[str | None] = mapped_column(Text)
    received_by: Mapped[str | None] = mapped_column(Text)
    source_doc: Mapped[str | None] = mapped_column(Text)
    qc_certificate_status: Mapped[str | None] = mapped_column(Text)
    qc_certificate_file: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_by: Mapped[str | None] = mapped_column(String(50))
    updated_by: Mapped[str | None] = mapped_column(String(50))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    warehouse_code_old: Mapped[str | None] = mapped_column(Text)
    lot_unit: Mapped[str | None] = mapped_column(String(10))
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    lock_reason: Mapped[str | None] = mapped_column(Text)
    inspection_date: Mapped[date | None] = mapped_column(Date)
    inspection_result: Mapped[str | None] = mapped_column(Text)
    warehouse_id: Mapped[int | None] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=True
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=True
    )
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=True
    )
    product_code: Mapped[str | None] = mapped_column(Text)
    supplier_code: Mapped[str | None] = mapped_column(Text)
    warehouse_code: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        Index("ix_lots_warehouse_id", "warehouse_id"),
        Index("ix_lots_product_code", "product_code"),
        Index("ix_lots_supplier_code", "supplier_code"),
        Index("ix_lots_warehouse_code", "warehouse_code"),
    )

    warehouse: Mapped[Warehouse | None] = relationship("Warehouse", back_populates="lots")
    product: Mapped[Product | None] = relationship("Product", back_populates="lots")
    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="lots")
    stock_movements: Mapped[list[StockMovement]] = relationship(
        "StockMovement",
        back_populates="lot",
        cascade="all, delete-orphan",
    )
    allocations: Mapped[list[Allocation]] = relationship(
        "Allocation",
        back_populates="lot",
        cascade="all, delete-orphan",
    )
    current_stock: Mapped[LotCurrentStock | None] = relationship(
        "LotCurrentStock",
        foreign_keys="[LotCurrentStock.lot_id]",
        primaryjoin="Lot.id == LotCurrentStock.lot_id",
        uselist=False,
        viewonly=True,  # VIEWなので読み取り専用
    )


class LotCurrentStock(Base):
    """Current stock aggregated per lot (VIEW)."""

    __tablename__ = "lot_current_stock"
    __table_args__ = {"info": {"is_view": True}}

    # VIEWをSELECT可能にするため複合主キー相当で指定
    lot_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    current_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime)

    # VIEWなので書き込み用カラム/監査系カラム/relationshipは不要


class StockMovement(Base):
    """Stock movement history."""

    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lot_id: Mapped[int | None] = mapped_column(ForeignKey("lots.id"))
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    quantity_delta: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(String(50))
    updated_by: Mapped[str | None] = mapped_column(String(50))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False
    )
    source_table: Mapped[str | None] = mapped_column(String(50))
    source_id: Mapped[int | None] = mapped_column(Integer)
    batch_id: Mapped[str | None] = mapped_column(String(100))
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )

    __table_args__ = (
        Index("idx_stock_movements_occurred_at", "occurred_at"),
        Index("idx_stock_movements_product_warehouse", "product_id", "warehouse_id"),
        Index("ix_stock_movements_lot", "lot_id"),
    )

    lot: Mapped[Lot | None] = relationship("Lot", back_populates="stock_movements")
    warehouse: Mapped[Warehouse] = relationship("Warehouse", back_populates="stock_movements")
    product: Mapped[Product] = relationship("Product", back_populates="stock_movements")


class ExpiryRule(Base):
    """Shelf-life calculation rules."""

    __tablename__ = "expiry_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rule_type: Mapped[str] = mapped_column(Text, nullable=False)
    days: Mapped[int | None] = mapped_column(Integer)
    fixed_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(String(50))
    updated_by: Mapped[str | None] = mapped_column(String(50))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True
    )

    product: Mapped[Product | None] = relationship("Product", back_populates="expiry_rules")
    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="expiry_rules")
