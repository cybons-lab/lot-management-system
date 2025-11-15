"""Master data models matching the PostgreSQL schema."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
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
from .inventory_models import ExpiryRule


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .forecast_models import ForecastHeader, ForecastLine
    from .inbound_models import InboundPlan, InboundPlanLine
    from .inventory_models import InventoryItem, Lot, StockMovement
    from .orders_models import (
        Allocation,
        Order,
        OrderLine,
        OrderLineWarehouseAllocation,
        PurchaseRequest,
    )


class Warehouse(Base):
    """Warehouses master table."""

    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_code: Mapped[str] = mapped_column(Text, nullable=False)
    warehouse_name: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
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
        UniqueConstraint("warehouse_code", name="uq_warehouses_warehouse_code"),
        Index("uq_warehouses_id", "id", unique=True),
    )

    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="warehouse")
    stock_movements: Mapped[list[StockMovement]] = relationship(
        "StockMovement", back_populates="warehouse"
    )
    inventory_items: Mapped[list[InventoryItem]] = relationship(
        "InventoryItem", back_populates="warehouse"
    )
    order_lines: Mapped[list[OrderLine]] = relationship("OrderLine", back_populates="warehouse")
    warehouse_allocations: Mapped[list[OrderLineWarehouseAllocation]] = relationship(
        "OrderLineWarehouseAllocation", back_populates="warehouse"
    )


class Supplier(Base):
    """Suppliers master table."""

    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier_code: Mapped[str] = mapped_column(Text, nullable=False)
    supplier_name: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
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
        UniqueConstraint("supplier_code", name="uq_suppliers_supplier_code"),
        Index("ix_suppliers_supplier_code", "supplier_code"),
    )

    products: Mapped[list[Product]] = relationship("Product", back_populates="supplier")
    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="supplier")
    expiry_rules: Mapped[list[ExpiryRule]] = relationship("ExpiryRule", back_populates="supplier")
    purchase_requests: Mapped[list[PurchaseRequest]] = relationship(
        "PurchaseRequest", back_populates="supplier"
    )
    inbound_plans: Mapped[list[InboundPlan]] = relationship(
        "InboundPlan", back_populates="supplier"
    )


class Customer(Base):
    """Customers master table."""

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)  # int に統一
    customer_code: Mapped[str] = mapped_column(Text, nullable=False)
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
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
        UniqueConstraint("customer_code", name="uq_customers_customer_code"),
        Index("ix_customers_customer_code", "customer_code"),
    )

    orders: Mapped[list[Order]] = relationship("Order", back_populates="customer")
    forecast_headers: Mapped[list[ForecastHeader]] = relationship(
        "ForecastHeader", back_populates="customer"
    )


class DeliveryPlace(Base):
    """Delivery places master table."""

    __tablename__ = "delivery_places"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    delivery_place_code: Mapped[str] = mapped_column(String, nullable=False)
    delivery_place_name: Mapped[str] = mapped_column(String, nullable=False)
    address: Mapped[str | None] = mapped_column(String)
    postal_code: Mapped[str | None] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
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
        UniqueConstraint("delivery_place_code", name="uq_delivery_places_code"),
        Index("ix_delivery_places_delivery_place_code", "delivery_place_code"),
    )

    allocations: Mapped[list[Allocation]] = relationship("Allocation", back_populates="destination")
    products: Mapped[list[Product]] = relationship("Product", back_populates="delivery_place")
    forecast_headers: Mapped[list[ForecastHeader]] = relationship(
        "ForecastHeader", back_populates="delivery_place"
    )


class Product(Base):
    """Products master table."""

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_code: Mapped[str] = mapped_column(Text, nullable=False)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    customer_part_no: Mapped[str | None] = mapped_column(Text)
    maker_item_code: Mapped[str | None] = mapped_column(Text)
    internal_unit: Mapped[str] = mapped_column(Text, nullable=False)
    assemble_div: Mapped[str | None] = mapped_column(Text)
    next_div: Mapped[str | None] = mapped_column(Text)
    shelf_life_days: Mapped[int | None] = mapped_column(Integer)
    requires_lot_number: Mapped[int | None] = mapped_column(Integer)
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
    base_unit: Mapped[str] = mapped_column(String(10), nullable=False, server_default=text("'EA'"))
    packaging_qty: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, server_default=text("1")
    )
    packaging_unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'EA'"),
    )
    supplier_item_code: Mapped[str | None] = mapped_column(String)
    delivery_place_id: Mapped[int | None] = mapped_column(
        ForeignKey("delivery_places.id"), nullable=True
    )
    ji_ku_text: Mapped[str | None] = mapped_column(String)
    kumitsuke_ku_text: Mapped[str | None] = mapped_column(String)
    delivery_place_name: Mapped[str | None] = mapped_column(String)
    shipping_warehouse_name: Mapped[str | None] = mapped_column(String)
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("product_code", name="uq_products_product_code"),
        Index("ix_products_product_code", "product_code"),
    )

    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="products")
    delivery_place: Mapped[DeliveryPlace | None] = relationship(
        "DeliveryPlace", back_populates="products"
    )
    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="product")
    order_lines: Mapped[list[OrderLine]] = relationship("OrderLine", back_populates="product")
    expiry_rules: Mapped[list[ExpiryRule]] = relationship("ExpiryRule", back_populates="product")
    purchase_requests: Mapped[list[PurchaseRequest]] = relationship(
        "PurchaseRequest", back_populates="product"
    )
    stock_movements: Mapped[list[StockMovement]] = relationship(
        "StockMovement", back_populates="product"
    )
    unit_conversions: Mapped[list[UnitConversion]] = relationship(
        "UnitConversion", back_populates="product"
    )
    forecast_lines: Mapped[list[ForecastLine]] = relationship(
        "ForecastLine", back_populates="product"
    )
    inbound_plan_lines: Mapped[list[InboundPlanLine]] = relationship(
        "InboundPlanLine", back_populates="product"
    )
    inventory_items: Mapped[list[InventoryItem]] = relationship(
        "InventoryItem", back_populates="product"
    )


class UnitConversion(Base):
    """Unit conversion definitions."""

    __tablename__ = "unit_conversions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    from_unit: Mapped[str] = mapped_column(String(10), nullable=False)
    to_unit: Mapped[str] = mapped_column(String(10), nullable=False)
    factor: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
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
        UniqueConstraint("product_id", "from_unit", "to_unit", name="uq_product_units"),
    )

    product: Mapped[Product] = relationship("Product", back_populates="unit_conversions")


class CustomerItem(Base):
    """Customer-specific product mappings (得意先品番マッピング)."""

    __tablename__ = "customer_items"

    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), primary_key=True, nullable=False
    )
    external_product_code: Mapped[str] = mapped_column(
        String(100), primary_key=True, nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id", ondelete="SET NULL"))
    base_unit: Mapped[str] = mapped_column(String(20), nullable=False)
    pack_unit: Mapped[str | None] = mapped_column(String(20))
    pack_quantity: Mapped[int | None] = mapped_column(Integer)
    special_instructions: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_customer_items_customer_id", "customer_id"),
        Index("ix_customer_items_product_id", "product_id"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer")
    product: Mapped[Product] = relationship("Product")
    supplier: Mapped[Supplier | None] = relationship("Supplier")
