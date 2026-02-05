"""Master data models matching the DDL v2.2 schema
(lot_management_ddl_v2_2_id.sql).

All models strictly follow the actual PostgreSQL tables as the single source of truth. Legacy
columns (address, created_by, deleted_at, etc.) have been removed.

Soft Delete Support:
    Master models support soft delete via the `valid_to` column.
    Records with valid_to >= today are considered active.
    Use SoftDeleteMixin for common soft delete operations.

【設計意図】マスタデータモデルの設計判断:

1. なぜ Soft Delete パターンを採用するのか
   理由: マスタデータの削除は論理削除（Soft Delete）にすべき
   業務的背景:
   - 自動車部品商社: 過去の取引データ（受注、入荷）を保持
   - 例: 顧客Aとの取引が終了（削除）→ 過去の受注データも削除されると困る
   → 過去データを参照できなくなる
   解決:
   - valid_to カラムで論理削除（デフォルト: '9999-12-31'）
   - 削除時: valid_to を現在日付に更新
   → 過去データは保持され、参照可能

2. なぜ SoftDeleteMixin を使うのか
   理由: Soft Delete ロジックの共通化
   背景:
   - 全てのマスタテーブルで同じ Soft Delete ロジックが必要
   → 各モデルで実装すると、重複コードが発生
   解決:
   - SoftDeleteMixin: is_active() メソッドを提供
   → query.filter(Customer.valid_to >= today) を簡潔に記述
   メリット:
   - コードの再利用
   - テストの容易性

3. なぜ UniqueConstraint を使うのか
   理由: ビジネスキーの一意性を保証
   例:
   - Warehouse: warehouse_code（倉庫コード）がユニーク
   - Supplier: supplier_code（仕入先コード）がユニーク
   - Customer: customer_code（顧客コード）がユニーク
   → 業務上、同じコードで複数のマスタは存在しない
   実装:
   - UniqueConstraint("warehouse_code", name="uq_warehouses_warehouse_code")
   → データベースレベルで一意性を保証

4. なぜ valid_to にインデックスを作成するのか
   理由: 有効なマスタのみを高速に検索
   背景:
   - アクティブなマスタのみを表示するクエリが頻繁
   → WHERE valid_to >= today
   実装:
   - Index("idx_warehouses_valid_to", "valid_to")
   → valid_to での検索が高速化
   パフォーマンス:
   - インデックスなし: テーブル全件スキャン（O(n)）
   - インデックスあり: B-Tree検索（O(log n)）

5. なぜ Product に internal_unit と external_unit があるのか
   理由: 内部管理単位と外部表示単位の分離
   業務的背景:
   - 内部管理: 缶（CAN）単位で在庫管理
   - 外部表示: キログラム（KG）単位で受注・出荷
   → 単位の変換が必要
   実装:
   - internal_unit: "CAN"（引当単位）
   - external_unit: "KG"（表示単位）
   - qty_per_internal_unit: 20.0（1 CAN = 20 KG）
   用途:
   - 受注数量（KG）→ 引当数量（CAN）への変換

6. なぜ CustomerItem と ProductMapping の2テーブルがあるのか
   理由: 責務の分離
   CustomerItem（受注・出荷ドメイン）:
   - 顧客が使用する品番コードの変換
   - 出荷表テキスト、梱包注意書き、SAP連携
   ProductMapping（調達・発注ドメイン）:
   - 顧客+先方品番+製品+仕入先の4者マッピング
   - 将来: 仕入先別単価、リードタイム管理
   → 異なる業務ドメインで異なるマスタを使用

7. なぜ CustomerItem に SAP関連カラムがあるのか（L360-372）
   理由: SAP ERPとの連携データをキャッシュ
   業務的背景:
   - SAP ERP: 仕入先コード、倉庫コード、単位などを管理
   → SAP APIへの問い合わせは遅い（1件あたり数秒）
   解決:
   - sap_supplier_code, sap_warehouse_code 等をキャッシュ
   → SAP APIへの問い合わせ回数を削減
   用途:
   - 受注処理時に SAP データを参照（キャッシュから取得）

8. なぜ ProductUomConversion テーブルがあるのか
   理由: 製品ごとの単位変換係数を管理
   業務的背景:
   - 製品A: 1缶 = 20kg
   - 製品B: 1缶 = 15kg
   → 製品ごとに変換係数が異なる
   実装:
   - supplier_item_id: 製品ID
   - external_unit: 外部単位（例: "KG"）
   - factor: 変換係数（例: 20.0）
   用途:
   - quantity_service.py で単位変換時に使用

9. なぜ WarehouseDeliveryRoute テーブルがあるのか
   理由: 倉庫から納入先への輸送リードタイムを管理
   業務的背景:
   - 倉庫A → 納入先X: 2日
   - 倉庫A → 納入先Y: 5日
   → 納入先ごとにリードタイムが異なる
   実装:
   - warehouse_id: 倉庫ID
   - delivery_place_id: 納入先ID
   - transport_lead_time_days: 輸送リードタイム（日）
   用途:
   - 出荷日の計算: 納入日 - リードタイム = 出荷日

10. なぜ CustomerItemJikuMapping テーブルがあるのか
    理由: 顧客商品と納入先（次区コード）のマッピング
    業務的背景:
    - 自動車業界: 「次区（じく）」という納入先の分類が存在
    - 例: 顧客品番 P-001 → 次区A（工場A）、次区B（工場B）
    → 同じ品番でも、納入先によって配送先が異なる
    実装:
    - jiku_code: 次区コード
    - delivery_place_id: 納入先ID
    - is_default: デフォルト次区フラグ
    用途:
    - OCR読取結果から納入先を自動特定
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
    from .inbound_models import InboundPlan
    from .lot_master_model import LotMaster
    from .lot_receipt_models import LotReceipt
    from .orders_models import Order
    from .supplier_item_model import SupplierItem


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
    display_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="表示名（Excel同期用）"
    )
    warehouse_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    default_transport_lead_time_days: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="デフォルト輸送リードタイム（日）"
    )
    # B-Plan: short_name for compact display
    short_name: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="短縮表示名（UI省スペース用）"
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
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )

    __table_args__ = (
        UniqueConstraint("warehouse_code", name="uq_warehouses_warehouse_code"),
        CheckConstraint(
            "warehouse_type IS NULL OR warehouse_type IN ('internal', 'external', 'supplier')",
            name="chk_warehouse_type",
        ),
        Index("idx_warehouses_type", "warehouse_type"),
        Index("idx_warehouses_valid_to", "valid_to"),
    )

    # Relationships

    lot_receipts: Mapped[list[LotReceipt]] = relationship("LotReceipt", back_populates="warehouse")
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
    display_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="表示名（Excel同期用）"
    )
    # B-Plan: short_name for compact display
    short_name: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="短縮表示名（UI省スペース用）"
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
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )

    __table_args__ = (
        UniqueConstraint("supplier_code", name="uq_suppliers_supplier_code"),
        Index("idx_suppliers_valid_to", "valid_to"),
    )

    # Relationships (Phase1: removed customer_items - now linked via supplier_items)

    lot_masters: Mapped[list[LotMaster]] = relationship("LotMaster", back_populates="supplier")
    lot_receipts: Mapped[list[LotReceipt]] = relationship("LotReceipt", back_populates="supplier")
    inbound_plans: Mapped[list[InboundPlan]] = relationship(
        "InboundPlan", back_populates="supplier"
    )
    user_assignments: Mapped[list[UserSupplierAssignment]] = relationship(
        "UserSupplierAssignment", back_populates="supplier", cascade="all, delete-orphan"
    )
    supplier_items: Mapped[list[SupplierItem]] = relationship(
        "SupplierItem", back_populates="supplier", cascade="all, delete-orphan"
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
    display_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="表示名（Excel同期用）"
    )
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # B-Plan: short_name for compact display
    short_name: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="短縮表示名（UI省スペース用）"
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
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
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
    display_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="納入先略称（Excel同期用）"
    )
    # B-Plan: short_name for compact display
    short_name: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="短縮表示名（UI省スペース用）"
    )
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
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )

    __table_args__ = (
        UniqueConstraint("jiku_code", "delivery_place_code", name="uq_delivery_places_jiku_code"),
        Index("idx_delivery_places_customer", "customer_id"),
        Index("idx_delivery_places_valid_to", "valid_to"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer", back_populates="delivery_places")
    forecast_current: Mapped[list[ForecastCurrent]] = relationship(
        "ForecastCurrent", back_populates="delivery_place"
    )


class CustomerItem(SoftDeleteMixin, Base):
    """Customer-specific product mappings (得意先品番マッピング).

    【責務境界】受注・出荷ドメイン
    - 得意先が使用する品番コードの変換
    - 得意先とsupplier_itemの直接マッピング（Phase1以降）
    - 参照: v_order_line_details, 出荷表生成処理

    DDL: customer_items
    Primary key: id (BIGSERIAL) - サロゲートキー
    Business key: UNIQUE(customer_id, customer_part_no)
    Foreign keys: customer_id -> customers(id), supplier_item_id -> supplier_items(id)
    Supports soft delete via valid_to column.

    Phase1 cleanup:
    - Removed: supplier_item_id, supplier_id, is_primary
    - Now directly links to supplier_items via supplier_item_id (NOT NULL)
    """

    __tablename__ = "customer_items"

    # サロゲートキー
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    # 得意先品番（旧: external_product_code）
    customer_part_no: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="得意先品番（先方品番）",
    )
    # Phase1: supplier_item_id is now NOT NULL (direct link to supplier_items)
    supplier_item_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="SET NULL"),
        nullable=False,
        comment="仕入先品目ID (Phase1: required)",
    )
    base_unit: Mapped[str] = mapped_column(String(20), nullable=False)
    material_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="材質コード（Excel 2列目）"
    )
    order_flag: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="発注区分（Excel 6列目）"
    )
    order_existence: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="発注の有無（Excel 19列目）"
    )
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
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )

    __table_args__ = (
        # ビジネスキーの一意制約
        UniqueConstraint("customer_id", "customer_part_no", name="uq_customer_items_customer_part"),
        # Phase1: Only supplier_item_id index remains (obsolete indexes removed)
        Index("idx_customer_items_supplier_item", "supplier_item_id"),
        Index("idx_customer_items_valid_to", "valid_to"),
    )

    # Relationships (Phase1: simplified to only customer and supplier_item)
    customer: Mapped[Customer] = relationship("Customer", back_populates="customer_items")
    supplier_item: Mapped[SupplierItem] = relationship(
        "SupplierItem",
        foreign_keys="[CustomerItem.supplier_item_id]",
        back_populates="customer_items",
    )
    delivery_settings: Mapped[list[CustomerItemDeliverySetting]] = relationship(
        "CustomerItemDeliverySetting",
        back_populates="customer_item",
        cascade="all, delete-orphan",
    )
    jiku_mappings: Mapped[list[CustomerItemJikuMapping]] = relationship(
        "CustomerItemJikuMapping",
        back_populates="customer_item",
        cascade="all, delete-orphan",
    )


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
    supplier_item_id: Mapped[int] = mapped_column(
        "supplier_item_id",
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="RESTRICT"),
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
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
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
        Index("idx_product_mappings_supplier_item", "supplier_item_id"),
        Index("idx_product_mappings_valid_to", "valid_to"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer")
    supplier: Mapped[Supplier] = relationship("Supplier")


class ProductUomConversion(SoftDeleteMixin, Base):
    """Product UOM conversion table (製品単位換算マスタ).

    DDL: product_uom_conversions
    Primary key: conversion_id (BIGSERIAL)
    Foreign keys: supplier_item_id -> product_groups(id)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "product_uom_conversions"

    conversion_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    supplier_item_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="CASCADE"),
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
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )

    # Relationships
    supplier_item: Mapped[SupplierItem] = relationship(
        "SupplierItem", back_populates="uom_conversions"
    )

    __table_args__ = (
        UniqueConstraint(
            "supplier_item_id", "external_unit", name="uq_uom_conversions_supplier_item_unit"
        ),
        Index("idx_product_uom_conversions_valid_to", "valid_to"),
    )


class CustomerItemJikuMapping(Base):
    """Customer item - Jiku code mapping (顧客商品-次区マッピング).

    DDL: customer_item_jiku_mappings
    Primary key: id (BIGSERIAL)
    Foreign keys:
        customer_item_id -> customer_items(id)
        delivery_place_id -> delivery_places(id)
    """

    __tablename__ = "customer_item_jiku_mappings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_item_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customer_items.id", ondelete="CASCADE"),
        nullable=False,
    )
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
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )

    __table_args__ = (
        UniqueConstraint(
            "customer_item_id",
            "jiku_code",
            name="uq_customer_item_jiku",
        ),
        Index("idx_cijm_customer_item", "customer_item_id"),
    )

    # Relationships
    customer_item: Mapped[CustomerItem] = relationship(
        "CustomerItem", back_populates="jiku_mappings"
    )
    delivery_place: Mapped[DeliveryPlace] = relationship("DeliveryPlace")


class CustomerItemDeliverySetting(Base):
    """Customer item delivery settings (得意先品番-納入先別出荷設定).

    次区・納入先ごとの出荷テキスト、梱包注意書き、リードタイムなどを管理。
    SAP連携時の出荷表データ生成に使用される。

    DDL: customer_item_delivery_settings
    Primary key: id (BIGSERIAL)
    Foreign keys:
        customer_item_id -> customer_items(id)
        delivery_place_id -> delivery_places(id)
    """

    __tablename__ = "customer_item_delivery_settings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_item_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customer_items.id", ondelete="CASCADE"),
        nullable=False,
    )
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
    # Page-level notes for Excel View (メーカー品番 × 先方品番 × 納入先の組み合わせ)
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Excel View ページ全体のメモ"
    )
    valid_from: Mapped[date | None] = mapped_column(Date, nullable=True, comment="有効開始日")
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True, comment="有効終了日")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )

    __table_args__ = (
        UniqueConstraint(
            "customer_item_id",
            "delivery_place_id",
            "jiku_code",
            name="uq_customer_item_delivery_settings",
        ),
        Index("idx_cids_customer_item", "customer_item_id"),
        Index("idx_cids_delivery_place", "delivery_place_id"),
        Index("idx_cids_jiku_code", "jiku_code"),
    )

    # Relationships
    customer_item: Mapped[CustomerItem] = relationship(
        "CustomerItem", back_populates="delivery_settings"
    )
    delivery_place: Mapped[DeliveryPlace | None] = relationship("DeliveryPlace")

    @property
    def delivery_place_name(self) -> str | None:
        """Get delivery place name from relationship."""
        return self.delivery_place.delivery_place_name if self.delivery_place else None


class WarehouseDeliveryRoute(Base):
    """Warehouse delivery routes table (輸送経路マスタ).

    倉庫から納入先への輸送リードタイムを管理。
    品番別のLT設定も可能（supplier_item_id指定）。

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
    supplier_item_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="CASCADE"),
        nullable=True,
        comment="仕入先品目ID（NULLの場合は経路デフォルト）",
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
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )

    __table_args__ = (
        Index("idx_wdr_warehouse", "warehouse_id"),
        Index("idx_wdr_delivery_place", "delivery_place_id"),
        Index("idx_wdr_supplier_item", "supplier_item_id"),
        Index("idx_wdr_active", "is_active"),
    )

    # Relationships
    warehouse: Mapped[Warehouse] = relationship("Warehouse", back_populates="delivery_routes")
    delivery_place: Mapped[DeliveryPlace] = relationship("DeliveryPlace")
