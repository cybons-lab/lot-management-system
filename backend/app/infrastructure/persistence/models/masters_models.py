"""Master data models matching the DDL v2.2 schema
(lot_management_ddl_v2_2_id.sql).

All models strictly follow the DDL as the single source of truth. Legacy
columns (address, created_by, deleted_at, etc.) have been removed.

Soft Delete Support:
    Master models support soft delete via the `valid_to` column.
    Records with valid_to >= today are considered active.
    Use SoftDeleteMixin for common soft delete operations.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
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
from .soft_delete_mixin import SoftDeleteMixin


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .assignments.assignment_models import UserSupplierAssignment
    from .forecast_models import ForecastCurrent
    from .inbound_models import InboundPlan, InboundPlanLine
    from .inventory_models import Lot
    from .orders_models import Order, OrderLine
    from .product_supplier_models import ProductSupplier


class Warehouse(SoftDeleteMixin, Base):
    """Warehouses master table (倉庫マスタ).

    DDL: warehouses
    Primary key: id (BIGSERIAL)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    warehouse_code: Mapped[str] = mapped_column(String(50), nullable=False)
    warehouse_name: Mapped[str] = mapped_column(String(200), nullable=False)
    warehouse_type: Mapped[str] = mapped_column(String(20), nullable=False)
    default_transport_lead_time_days: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="デフォルト輸送リードタイム（日）"
    )
    valid_to: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=text("'9999-12-31'")
    )
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
        Index("idx_warehouses_type", "warehouse_type"),
        Index("idx_warehouses_valid_to", "valid_to"),
    )

    # Relationships
    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="warehouse")
    delivery_routes: Mapped[list[WarehouseDeliveryRoute]] = relationship(
        "WarehouseDeliveryRoute", back_populates="warehouse", cascade="all, delete-orphan"
    )


class Supplier(SoftDeleteMixin, Base):
    """Suppliers master table (仕入先マスタ).

    DDL: suppliers
    Primary key: id (BIGSERIAL)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    supplier_code: Mapped[str] = mapped_column(String(50), nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(200), nullable=False)
    valid_to: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=text("'9999-12-31'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("supplier_code", name="uq_suppliers_supplier_code"),
        Index("idx_suppliers_valid_to", "valid_to"),
    )

    # Relationships
    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="supplier")
    inbound_plans: Mapped[list[InboundPlan]] = relationship(
        "InboundPlan", back_populates="supplier"
    )
    customer_items: Mapped[list[CustomerItem]] = relationship(
        "CustomerItem", back_populates="supplier"
    )
    user_assignments: Mapped[list[UserSupplierAssignment]] = relationship(
        "UserSupplierAssignment", back_populates="supplier", cascade="all, delete-orphan"
    )
    product_suppliers: Mapped[list[ProductSupplier]] = relationship(
        "ProductSupplier", back_populates="supplier", cascade="all, delete-orphan"
    )


class Customer(SoftDeleteMixin, Base):
    """Customers master table (得意先マスタ).

    DDL: customers
    Primary key: id (BIGSERIAL)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_code: Mapped[str] = mapped_column(String(50), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    valid_to: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=text("'9999-12-31'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("customer_code", name="uq_customers_customer_code"),
        Index("idx_customers_valid_to", "valid_to"),
    )

    # Relationships
    orders: Mapped[list[Order]] = relationship("Order", back_populates="customer")
    forecast_current: Mapped[list[ForecastCurrent]] = relationship(
        "ForecastCurrent", back_populates="customer"
    )
    delivery_places: Mapped[list[DeliveryPlace]] = relationship(
        "DeliveryPlace", back_populates="customer"
    )
    customer_items: Mapped[list[CustomerItem]] = relationship(
        "CustomerItem", back_populates="customer"
    )


class DeliveryPlace(SoftDeleteMixin, Base):
    """Delivery places master table (納入先マスタ).

    DDL: delivery_places
    Primary key: id (BIGSERIAL)
    Foreign keys: customer_id -> customers(id)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "delivery_places"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    jiku_code: Mapped[str] = mapped_column(String(50), nullable=False, server_default="")
    delivery_place_code: Mapped[str] = mapped_column(String(50), nullable=False)
    delivery_place_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    valid_to: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=text("'9999-12-31'")
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
        Index("idx_delivery_places_valid_to", "valid_to"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer", back_populates="delivery_places")
    forecast_current: Mapped[list[ForecastCurrent]] = relationship(
        "ForecastCurrent", back_populates="delivery_place"
    )


class Product(SoftDeleteMixin, Base):
    """Products master table (製品マスタ).

    DDL: products
    Primary key: id (BIGSERIAL)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    maker_part_code: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    base_unit: Mapped[str] = mapped_column(String(20), nullable=False)
    consumption_limit_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    valid_to: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=text("'9999-12-31'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    # Unit Conversion Fields
    internal_unit: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="CAN"
    )  # e.g. "CAN" (Allocation Unit)
    external_unit: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="KG"
    )  # e.g. "KG" (Display/Input Unit)
    qty_per_internal_unit: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, server_default="1.0"
    )  # e.g. 20.0 (1 CAN = 20 KG)
    # External part numbers
    customer_part_no: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="先方品番（得意先の品番）"
    )
    maker_item_code: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="メーカー品番（仕入先の品番）"
    )

    __table_args__ = (
        UniqueConstraint("maker_part_code", name="uq_products_maker_part_code"),
        Index("idx_products_name", "product_name"),
        Index("idx_products_valid_to", "valid_to"),
    )

    # Relationships
    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="product")
    order_lines: Mapped[list[OrderLine]] = relationship("OrderLine", back_populates="product")
    forecast_current: Mapped[list[ForecastCurrent]] = relationship(
        "ForecastCurrent", back_populates="product"
    )
    inbound_plan_lines: Mapped[list[InboundPlanLine]] = relationship(
        "InboundPlanLine", back_populates="product"
    )
    customer_items: Mapped[list[CustomerItem]] = relationship(
        "CustomerItem", back_populates="product"
    )
    uom_conversions: Mapped[list[ProductUomConversion]] = relationship(
        "ProductUomConversion", back_populates="product"
    )
    product_suppliers: Mapped[list[ProductSupplier]] = relationship(
        "ProductSupplier", back_populates="product", cascade="all, delete-orphan"
    )


class CustomerItem(SoftDeleteMixin, Base):
    """Customer-specific product mappings (得意先品番マッピング).

    【責務境界】受注・出荷ドメイン
    - 得意先が使用する品番コードの変換
    - 出荷表テキスト、梱包注意書き、SAP連携
    - 参照: v_order_line_details, 出荷表生成処理

    DDL: customer_items
    Primary key: (customer_id, external_product_code)
    Foreign keys: customer_id -> customers(id), product_id -> products(id), supplier_id -> suppliers(id)
    Supports soft delete via valid_to column.
    See: docs/SCHEMA_GUIDE.md, docs/adr/ADR-003_customer_items_product_mappings.md
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
    shipping_document_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    sap_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    valid_to: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=text("'9999-12-31'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        Index("idx_customer_items_product", "product_id"),
        Index("idx_customer_items_supplier", "supplier_id"),
        Index("idx_customer_items_valid_to", "valid_to"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer", back_populates="customer_items")
    product: Mapped[Product] = relationship("Product", back_populates="customer_items")
    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="customer_items")


class ProductMapping(SoftDeleteMixin, Base):
    """Product mappings table (商品マスタ).

    【責務境界】調達・発注ドメイン
    - 顧客+先方品番+製品+仕入先の4者マッピング
    - 将来: 仕入先別単価、リードタイム管理
    - 参照: 発注処理、仕入先選定ロジック（将来）

    DDL: product_mappings
    Primary key: id (BIGSERIAL)
    Supports soft delete via valid_to column (migrated from is_active).
    See: docs/SCHEMA_GUIDE.md, docs/adr/ADR-003_customer_items_product_mappings.md
    """

    __tablename__ = "product_mappings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer_part_code: Mapped[str] = mapped_column(String(100), nullable=False)
    supplier_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    base_unit: Mapped[str] = mapped_column(String(20), nullable=False)
    pack_unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pack_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    special_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    valid_to: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=text("'9999-12-31'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint(
            "customer_id",
            "customer_part_code",
            "supplier_id",
            name="uq_product_mappings_cust_part_supp",
        ),
        Index("idx_product_mappings_customer", "customer_id"),
        Index("idx_product_mappings_supplier", "supplier_id"),
        Index("idx_product_mappings_product", "product_id"),
        Index("idx_product_mappings_valid_to", "valid_to"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer")
    supplier: Mapped[Supplier] = relationship("Supplier")
    product: Mapped[Product] = relationship("Product")


class ProductUomConversion(SoftDeleteMixin, Base):
    """Product UOM conversion table (製品単位換算マスタ).

    DDL: product_uom_conversions
    Primary key: conversion_id (BIGSERIAL)
    Foreign keys: product_id -> products(id)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "product_uom_conversions"

    conversion_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    external_unit: Mapped[str] = mapped_column(String(20), nullable=False)
    factor: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    valid_to: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=text("'9999-12-31'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("product_id", "external_unit", name="uq_uom_conversions_product_unit"),
        Index("idx_product_uom_conversions_valid_to", "valid_to"),
    )

    # Relationships
    product: Mapped[Product] = relationship("Product", back_populates="uom_conversions")


class CustomerItemJikuMapping(Base):
    """Customer item - Jiku code mapping (顧客商品-次区マッピング).

    DDL: customer_item_jiku_mappings
    Primary key: id (BIGSERIAL)
    Foreign keys:
        (customer_id, external_product_code) -> customer_items(customer_id, external_product_code)
        delivery_place_id -> delivery_places(id)
    """

    __tablename__ = "customer_item_jiku_mappings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    external_product_code: Mapped[str] = mapped_column(String(100), nullable=False)
    jiku_code: Mapped[str] = mapped_column(String(50), nullable=False)
    delivery_place_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_default: Mapped[bool | None] = mapped_column(Boolean, server_default="FALSE", nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=True
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["customer_id", "external_product_code"],
            ["customer_items.customer_id", "customer_items.external_product_code"],
            ondelete="CASCADE",
            name="fk_customer_item_jiku_mappings_customer_item",
        ),
        UniqueConstraint(
            "customer_id",
            "external_product_code",
            "jiku_code",
            name="uq_customer_item_jiku",
        ),
    )

    # Relationships
    delivery_place: Mapped[DeliveryPlace] = relationship("DeliveryPlace")


class CustomerItemDeliverySetting(Base):
    """Customer item delivery settings (得意先品番-納入先別出荷設定).

    次区・納入先ごとの出荷テキスト、梱包注意書き、リードタイムなどを管理。
    SAP連携時の出荷表データ生成に使用される。

    DDL: customer_item_delivery_settings
    Primary key: id (BIGSERIAL)
    Foreign keys:
        (customer_id, external_product_code) -> customer_items
        delivery_place_id -> delivery_places(id)
    """

    __tablename__ = "customer_item_delivery_settings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    external_product_code: Mapped[str] = mapped_column(String(100), nullable=False)
    delivery_place_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="SET NULL"),
        nullable=True,
        comment="納入先（NULLの場合はデフォルト設定）",
    )
    jiku_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="次区コード（NULLの場合は全次区共通）"
    )
    shipment_text: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="出荷表テキスト（SAP連携用）"
    )
    packing_note: Mapped[str | None] = mapped_column(Text, nullable=True, comment="梱包・注意書き")
    lead_time_days: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="リードタイム（日）"
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean, server_default="FALSE", nullable=False, comment="デフォルト設定フラグ"
    )
    valid_from: Mapped[date | None] = mapped_column(Date, nullable=True, comment="有効開始日")
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True, comment="有効終了日")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["customer_id", "external_product_code"],
            ["customer_items.customer_id", "customer_items.external_product_code"],
            ondelete="CASCADE",
            name="fk_customer_item_delivery_settings_customer_item",
        ),
        UniqueConstraint(
            "customer_id",
            "external_product_code",
            "delivery_place_id",
            "jiku_code",
            name="uq_customer_item_delivery_settings",
        ),
        Index("idx_cids_customer_item", "customer_id", "external_product_code"),
        Index("idx_cids_delivery_place", "delivery_place_id"),
        Index("idx_cids_jiku_code", "jiku_code"),
    )

    # Relationships
    delivery_place: Mapped[DeliveryPlace | None] = relationship("DeliveryPlace")


class WarehouseDeliveryRoute(Base):
    """Warehouse delivery routes table (輸送経路マスタ).

    倉庫から納入先への輸送リードタイムを管理。
    品番別のLT設定も可能（product_id指定）。

    直送（supplier warehouse_type）は対象外。
    """

    __tablename__ = "warehouse_delivery_routes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    warehouse_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
    )
    delivery_place_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=True,
        comment="品番（NULLの場合は経路デフォルト）",
    )
    transport_lead_time_days: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="輸送リードタイム（日）"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, server_default=text("true"), nullable=False, comment="有効フラグ"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, comment="備考")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        Index("idx_wdr_warehouse", "warehouse_id"),
        Index("idx_wdr_delivery_place", "delivery_place_id"),
        Index("idx_wdr_product", "product_id"),
        Index("idx_wdr_active", "is_active"),
    )

    # Relationships
    warehouse: Mapped[Warehouse] = relationship("Warehouse", back_populates="delivery_routes")
    delivery_place: Mapped[DeliveryPlace] = relationship("DeliveryPlace")
    product: Mapped[Product | None] = relationship("Product")
