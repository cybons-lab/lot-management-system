"""Order management models aligned with the PostgreSQL schema."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Computed,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
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
    from .logs_models import SapSyncLog
    from .masters_models import Customer, DeliveryPlace, Product, Supplier, Warehouse


class Order(Base):
    """Order headers."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_no: Mapped[str] = mapped_column(Text, nullable=False)
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    sap_order_id: Mapped[str | None] = mapped_column(Text)
    sap_status: Mapped[str | None] = mapped_column(Text)
    sap_sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    sap_error_msg: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_by: Mapped[str | None] = mapped_column(String(50))
    updated_by: Mapped[str | None] = mapped_column(String(50))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    customer_order_no: Mapped[str | None] = mapped_column(Text)
    delivery_mode: Mapped[str | None] = mapped_column(Text)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), nullable=True
    )
    customer_code: Mapped[str | None] = mapped_column(Text)
    customer_order_no_last6: Mapped[str | None] = mapped_column(
        String(6), Computed("right(customer_order_no, 6)", persisted=True)
    )

    __table_args__ = (
        UniqueConstraint("order_no", name="orders_order_no_key"),
        CheckConstraint(
            "status IN ('draft','confirmed','shipped','closed')",
            name="ck_orders_status",
        ),
        CheckConstraint(
            "delivery_mode IS NULL OR delivery_mode IN ('normal','express','pickup')",
            name="ck_orders_delivery_mode",
        ),
        Index("ix_orders_customer_id_order_date", "customer_id", "order_date"),
        Index("ix_orders_customer_code", "customer_code"),
        Index(
            "uq_orders_customer_order_no_per_customer",
            "customer_id",
            "customer_order_no",
            unique=True,
            postgresql_where=text("customer_order_no IS NOT NULL"),
        ),
    )

    customer: Mapped[Customer | None] = relationship("Customer", back_populates="orders")
    order_lines: Mapped[list[OrderLine]] = relationship(
        "OrderLine", back_populates="order", cascade="all, delete-orphan"
    )
    sap_sync_logs: Mapped[list[SapSyncLog]] = relationship("SapSyncLog", back_populates="order")


class OrderLine(Base):
    """Order detail lines."""

    __tablename__ = "order_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    line_no: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    unit: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(String(50))
    updated_by: Mapped[str | None] = mapped_column(String(50))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=True
    )
    warehouse_id: Mapped[int | None] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=True
    )

    __table_args__ = (UniqueConstraint("order_id", "line_no", name="uq_order_line"),)

    order: Mapped[Order] = relationship("Order", back_populates="order_lines")
    product: Mapped[Product | None] = relationship("Product", back_populates="order_lines")
    warehouse: Mapped[Warehouse | None] = relationship("Warehouse", back_populates="order_lines")
    allocations: Mapped[list[Allocation]] = relationship("Allocation", back_populates="order_line")
    warehouse_allocations: Mapped[list[OrderLineWarehouseAllocation]] = relationship(
        "OrderLineWarehouseAllocation", back_populates="order_line"
    )
    purchase_requests: Mapped[list[PurchaseRequest]] = relationship(
        "PurchaseRequest", back_populates="order_line"
    )


class OrderLineWarehouseAllocation(Base):
    """Warehouse-level allocations for an order line."""

    __tablename__ = "order_line_warehouse_allocation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_line_id: Mapped[int] = mapped_column(
        ForeignKey("order_lines.id", ondelete="CASCADE"), nullable=False
    )
    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
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

    __table_args__ = (
        UniqueConstraint("order_line_id", "warehouse_id", name="uq_order_line_warehouse"),
        CheckConstraint("quantity > 0", name="ck_olwa_quantity_positive"),
    )

    order_line: Mapped[OrderLine] = relationship(
        "OrderLine", back_populates="warehouse_allocations"
    )
    warehouse: Mapped[Warehouse] = relationship("Warehouse", back_populates="warehouse_allocations")


class Allocation(Base):
    """Lot allocations for order lines."""

    __tablename__ = "allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_line_id: Mapped[int] = mapped_column(
        ForeignKey("order_lines.id", ondelete="CASCADE"), nullable=False
    )
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id", ondelete="CASCADE"), nullable=False)
    allocated_qty: Mapped[float] = mapped_column(Float, nullable=False)
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
    destination_id: Mapped[int | None] = mapped_column(
        ForeignKey("delivery_places.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'reserved'"))

    __table_args__ = (
        CheckConstraint(
            "status IN ('reserved','picked','committed','shipped')",
            name="ck_allocations_status",
        ),
        Index("ix_alloc_ol", "order_line_id"),
        Index("ix_alloc_lot", "lot_id"),
    )

    order_line: Mapped[OrderLine] = relationship("OrderLine", back_populates="allocations")
    lot: Mapped[Lot] = relationship("Lot", back_populates="allocations")
    destination: Mapped[DeliveryPlace | None] = relationship(
        "DeliveryPlace", back_populates="allocations"
    )


class PurchaseRequest(Base):
    """Purchase request records."""

    __tablename__ = "purchase_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requested_qty: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str | None] = mapped_column(Text)
    reason_code: Mapped[str] = mapped_column(Text, nullable=False)
    src_order_line_id: Mapped[int | None] = mapped_column(
        ForeignKey("order_lines.id"), nullable=True
    )
    requested_date: Mapped[date | None] = mapped_column(Date)
    desired_receipt_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str | None] = mapped_column(Text)
    sap_po_id: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_by: Mapped[str | None] = mapped_column(String(50))
    updated_by: Mapped[str | None] = mapped_column(String(50))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=True
    )
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=True
    )

    order_line: Mapped[OrderLine | None] = relationship(
        "OrderLine", back_populates="purchase_requests"
    )
    product: Mapped[Product | None] = relationship("Product", back_populates="purchase_requests")
    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="purchase_requests")
