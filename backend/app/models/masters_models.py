"""Master data models matching the DDL v2.2 schema (lot_management_ddl_v2_2_id.sql).

All models strictly follow the DDL as the single source of truth.
Legacy columns (address, created_by, deleted_at, etc.) have been removed.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .forecast_models import ForecastHeader, ForecastLine
    from .inbound_models import InboundPlan, InboundPlanLine
    from .inventory_models import InventoryItem, Lot
    from .orders_models import Order, OrderLine


class Warehouse(Base):
    """Warehouses master table (倉庫マスタ).

    DDL: warehouses
    Primary key: id (BIGSERIAL)
    """

    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    warehouse_code: Mapped[str] = mapped_column(String(50), nullable=False)
    warehouse_name: Mapped[str] = mapped_column(String(200), nullable=False)
    warehouse_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("warehouse_code", name="uq_warehouses_warehouse_code"),
        CheckConstraint(
            "warehouse_type IN ('internal', 'external', 'supplier')",
            name="chk_warehouse_type",
        ),
        Index("idx_warehouses_code", "warehouse_code"),
        Index("idx_warehouses_type", "warehouse_type"),
    )

    # Relationships
    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="warehouse")
    inventory_items: Mapped[list[InventoryItem]] = relationship(
        "InventoryItem", back_populates="warehouse"
    )


class Supplier(Base):
    """Suppliers master table (仕入先マスタ).

    DDL: suppliers
    Primary key: id (BIGSERIAL)
    """

    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    supplier_code: Mapped[str] = mapped_column(String(50), nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("supplier_code", name="uq_suppliers_supplier_code"),
        Index("idx_suppliers_code", "supplier_code"),
    )

    # Relationships
    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="supplier")
    inbound_plans: Mapped[list[InboundPlan]] = relationship(
        "InboundPlan", back_populates="supplier"
    )
    customer_items: Mapped[list[CustomerItem]] = relationship(
        "CustomerItem", back_populates="supplier"
    )


class Customer(Base):
    """Customers master table (得意先マスタ).

    DDL: customers
    Primary key: id (BIGSERIAL)
    """

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_code: Mapped[str] = mapped_column(String(50), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("customer_code", name="uq_customers_customer_code"),
        Index("idx_customers_code", "customer_code"),
    )

    # Relationships
    orders: Mapped[list[Order]] = relationship("Order", back_populates="customer")
    forecast_headers: Mapped[list[ForecastHeader]] = relationship(
        "ForecastHeader", back_populates="customer"
    )
    delivery_places: Mapped[list[DeliveryPlace]] = relationship(
        "DeliveryPlace", back_populates="customer"
    )
    customer_items: Mapped[list[CustomerItem]] = relationship(
        "CustomerItem", back_populates="customer"
    )


class DeliveryPlace(Base):
    """Delivery places master table (納入先マスタ).

    DDL: delivery_places
    Primary key: id (BIGSERIAL)
    Foreign keys: customer_id -> customers(id)
    """

    __tablename__ = "delivery_places"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    jiku_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    delivery_place_code: Mapped[str] = mapped_column(String(50), nullable=False)
    delivery_place_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("delivery_place_code", name="uq_delivery_places_code"),
        Index("idx_delivery_places_customer", "customer_id"),
        Index("idx_delivery_places_code", "delivery_place_code"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer", back_populates="delivery_places")
    orders: Mapped[list[Order]] = relationship("Order", back_populates="delivery_place")
    forecast_headers: Mapped[list[ForecastHeader]] = relationship(
        "ForecastHeader", back_populates="delivery_place"
    )


class Product(Base):
    """Products master table (製品マスタ).

    DDL: products
    Primary key: id (BIGSERIAL)
    """

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    maker_part_code: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    base_unit: Mapped[str] = mapped_column(String(20), nullable=False)
    consumption_limit_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("maker_part_code", name="uq_products_maker_part_code"),
        Index("idx_products_code", "maker_part_code"),
        Index("idx_products_name", "product_name"),
    )

    # Relationships
    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="product")
    order_lines: Mapped[list[OrderLine]] = relationship("OrderLine", back_populates="product")
    forecast_lines: Mapped[list[ForecastLine]] = relationship(
        "ForecastLine", back_populates="product"
    )
    inbound_plan_lines: Mapped[list[InboundPlanLine]] = relationship(
        "InboundPlanLine", back_populates="product"
    )
    inventory_items: Mapped[list[InventoryItem]] = relationship(
        "InventoryItem", back_populates="product"
    )
    customer_items: Mapped[list[CustomerItem]] = relationship(
        "CustomerItem", back_populates="product"
    )


class CustomerItem(Base):
    """Customer-specific product mappings (得意先品番マッピング).

    DDL: customer_items
    Primary key: (customer_id, external_product_code)
    Foreign keys: customer_id -> customers(id), product_id -> products(id), supplier_id -> suppliers(id)
    """

    __tablename__ = "customer_items"

    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    external_product_code: Mapped[str] = mapped_column(
        String(100), primary_key=True, nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    supplier_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
    )
    base_unit: Mapped[str] = mapped_column(String(20), nullable=False)
    pack_unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pack_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    special_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        Index("idx_customer_items_product", "product_id"),
        Index("idx_customer_items_supplier", "supplier_id"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer", back_populates="customer_items")
    product: Mapped[Product] = relationship("Product", back_populates="customer_items")
    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="customer_items")
