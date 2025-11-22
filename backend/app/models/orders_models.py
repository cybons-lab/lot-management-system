"""Order management models aligned with DDL v2.2 (lot_management_ddl_v2_2_id.sql).

All models strictly follow the DDL as the single source of truth.
Legacy tables (order_line_warehouse_allocation, purchase_requests, sap_sync_logs) removed.
Legacy columns (sap_*, customer_order_no, delivery_mode, etc.) removed.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .inventory_models import Lot
    from .masters_models import Customer, Product


class Order(Base):
    """Order headers (受注ヘッダ).

    DDL: orders
    Primary key: id (BIGSERIAL)
    Foreign keys: customer_id -> customers(id), delivery_place_id -> delivery_places(id)
    """

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_number: Mapped[str] = mapped_column(String(50), nullable=False)
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )

    order_date: Mapped[date] = mapped_column(Date, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("order_number", name="uq_orders_order_number"),
        Index("idx_orders_customer", "customer_id"),
        Index("idx_orders_date", "order_date"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer", back_populates="orders")
    order_lines: Mapped[list[OrderLine]] = relationship(
        "OrderLine", back_populates="order", cascade="all, delete-orphan"
    )


class OrderLine(Base):
    """Order detail lines (受注明細).

    DDL: order_lines
    Primary key: id (BIGSERIAL)
    Foreign keys: order_id -> orders(id), product_id -> products(id)
    """

    __tablename__ = "order_lines"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    order_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    delivery_place_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'pending'")
    )
    version_id: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))

    __table_args__ = (
        Index("idx_order_lines_order", "order_id"),
        Index("idx_order_lines_product", "product_id"),
        Index("idx_order_lines_date", "delivery_date"),
        Index("idx_order_lines_delivery_place", "delivery_place_id"),
        Index("idx_order_lines_status", "status"),
        CheckConstraint(
            "status IN ('pending', 'allocated', 'shipped', 'completed', 'cancelled')",
            name="chk_order_lines_status",
        ),
    )

    __mapper_args__ = {"version_id_col": version_id}

    # Relationships
    order: Mapped[Order] = relationship("Order", back_populates="order_lines")
    product: Mapped[Product] = relationship("Product", back_populates="order_lines")
    allocations: Mapped[list[Allocation]] = relationship(
        "Allocation", back_populates="order_line", cascade="all, delete-orphan"
    )


class Allocation(Base):
    """Lot allocations for order lines (引当実績).

    DDL: allocations
    Primary key: id (BIGSERIAL)
    Foreign keys: order_line_id -> order_lines(id), lot_id -> lots(id)
    """

    __tablename__ = "allocations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_line_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("order_lines.id", ondelete="CASCADE"),
        nullable=False,
    )
    lot_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    allocated_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'allocated'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('allocated', 'shipped', 'cancelled')",
            name="chk_allocations_status",
        ),
        Index("idx_allocations_order_line", "order_line_id"),
        Index("idx_allocations_lot", "lot_id"),
        Index("idx_allocations_status", "status"),
    )

    # Relationships
    order_line: Mapped[OrderLine] = relationship("OrderLine", back_populates="allocations")
    lot: Mapped[Lot] = relationship("Lot", back_populates="allocations")
