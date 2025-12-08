"""Order management models aligned with DDL v2.2
(lot_management_ddl_v2_2_id.sql).

All models strictly follow the DDL as the single source of truth.

Updated 2025-12-08: Added business key columns for order management:
- order_group_id: References order_groups for logical grouping
- customer_order_no: Customer's 6-digit order number (business key)
- sap_order_item_no: SAP order item number (business key with sap_order_no)
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
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .auth_models import User
    from .forecast_models import ForecastCurrent
    from .inventory_models import Lot
    from .masters_models import Customer, Product
    from .order_groups_models import OrderGroup


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
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'open'"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    # Optimistic Locking
    locked_by_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    lock_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("order_number", name="uq_orders_order_number"),
        Index("idx_orders_customer", "customer_id"),
        Index("idx_orders_date", "order_date"),
        Index("idx_orders_locked_by", "locked_by_user_id"),
        Index(
            "idx_orders_lock_expires",
            "lock_expires_at",
            postgresql_where=text("lock_expires_at IS NOT NULL"),
        ),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer", back_populates="orders")
    order_lines: Mapped[list[OrderLine]] = relationship(
        "OrderLine", back_populates="order", cascade="all, delete-orphan"
    )
    locked_by_user: Mapped[User | None] = relationship("User", foreign_keys=[locked_by_user_id])

    @property
    def locked_by_user_name(self) -> str | None:
        """Flattened locked_by_user display_name for API response."""
        return self.locked_by_user.display_name if self.locked_by_user else None


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
    order_group_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("order_groups.id", ondelete="SET NULL"),
        nullable=True,
        comment="受注グループへの参照（得意先×製品×受注日）",
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    order_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    converted_quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3), nullable=True
    )  # Quantity in Product's internal_unit
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

    # 得意先側業務キー
    customer_order_no: Mapped[str | None] = mapped_column(
        String(6), nullable=True, comment="得意先6桁受注番号（業務キー）"
    )
    customer_order_line_no: Mapped[str | None] = mapped_column(
        String(10), nullable=True, comment="得意先側行番号"
    )

    # SAP側業務キー
    sap_order_no: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="SAP受注番号（業務キー）"
    )
    sap_order_item_no: Mapped[str | None] = mapped_column(
        String(6), nullable=True, comment="SAP明細番号（業務キー）"
    )
    shipping_document_text: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="出荷表テキスト"
    )

    # Forecast/Order integration
    order_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'ORDER'"),
        comment="需要種別: FORECAST_LINKED / KANBAN / SPOT / ORDER",
    )
    forecast_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("forecast_current.id", ondelete="SET NULL"),
        nullable=True,
        comment="紐づく予測ID（FORECAST_LINKEDの場合）",
    )

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'pending'")
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))

    __table_args__ = (
        Index("idx_order_lines_order", "order_id"),
        Index("idx_order_lines_product", "product_id"),
        Index("idx_order_lines_date", "delivery_date"),
        Index("idx_order_lines_delivery_place", "delivery_place_id"),
        Index("idx_order_lines_status", "status"),
        Index("idx_order_lines_order_type", "order_type"),
        Index("idx_order_lines_forecast_id", "forecast_id"),
        Index("idx_order_lines_order_group", "order_group_id"),
        Index(
            "idx_order_lines_sap_order_no",
            "sap_order_no",
            postgresql_where=text("sap_order_no IS NOT NULL"),
        ),
        Index(
            "idx_order_lines_customer_order_no",
            "customer_order_no",
            postgresql_where=text("customer_order_no IS NOT NULL"),
        ),
        CheckConstraint(
            "status IN ('pending', 'allocated', 'shipped', 'completed', 'cancelled')",
            name="chk_order_lines_status",
        ),
        CheckConstraint(
            "order_type IN ('FORECAST_LINKED', 'KANBAN', 'SPOT', 'ORDER')",
            name="chk_order_lines_order_type",
        ),
        # 業務キー制約: 同一グループ内での得意先受注番号の一意性
        UniqueConstraint(
            "order_group_id",
            "customer_order_no",
            name="uq_order_lines_customer_key",
        ),
    )

    __mapper_args__ = {"version_id_col": version}

    # Relationships
    order: Mapped[Order] = relationship("Order", back_populates="order_lines")
    order_group: Mapped[OrderGroup | None] = relationship(
        "OrderGroup", back_populates="order_lines"
    )
    product: Mapped[Product] = relationship("Product", back_populates="order_lines")
    forecast: Mapped[ForecastCurrent | None] = relationship(
        "ForecastCurrent", back_populates="order_lines"
    )
    allocations: Mapped[list[Allocation]] = relationship(
        "Allocation", back_populates="order_line", cascade="all, delete-orphan"
    )

    @property
    def allocated_quantity(self) -> Decimal:
        """Calculate total allocated quantity from allocations."""
        return sum((a.allocated_quantity for a in self.allocations), Decimal("0"))


class Allocation(Base):
    """Lot allocations for order lines (引当実績).

    DDL: allocations
    Primary key: id (BIGSERIAL)
    Foreign keys: order_line_id -> order_lines(id), lot_id -> lots(id),
                  inbound_plan_line_id -> inbound_plan_lines(id)

    Supports both regular allocations (with lot_id) and provisional allocations
    (with inbound_plan_line_id for planned inbound stock).
    """

    __tablename__ = "allocations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_line_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("order_lines.id", ondelete="CASCADE"),
        nullable=False,
    )
    lot_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("lots.id", ondelete="RESTRICT"),
        nullable=True,  # Nullable for provisional allocations
    )
    inbound_plan_line_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("inbound_plan_lines.id", ondelete="CASCADE"),
        nullable=True,  # Used for provisional allocations
    )
    allocated_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    allocation_type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        server_default=text("'soft'"),
        comment="Allocation type: soft (provisional) or hard (confirmed)",
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'allocated'")
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="Hard allocation confirmation timestamp"
    )
    confirmed_by: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="User who confirmed the allocation"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('allocated', 'provisional', 'shipped', 'cancelled')",
            name="chk_allocations_status",
        ),
        CheckConstraint(
            "allocation_type IN ('soft', 'hard')",
            name="chk_allocation_type",
        ),
        Index("idx_allocations_order_line", "order_line_id"),
        Index("idx_allocations_lot", "lot_id"),
        Index("idx_allocations_inbound_plan_line", "inbound_plan_line_id"),
        Index("idx_allocations_status", "status"),
        Index("idx_allocations_allocation_type", "allocation_type"),
    )

    # Relationships
    order_line: Mapped[OrderLine] = relationship("OrderLine", back_populates="allocations")
    lot: Mapped[Lot | None] = relationship("Lot", back_populates="allocations")

    @property
    def lot_number(self) -> str | None:
        """Flattened lot number for API response."""
        return self.lot.lot_number if self.lot else None
