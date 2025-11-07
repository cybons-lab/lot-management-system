# backend/app/models/masters.py
"""
マスタテーブルのモデル定義

業務運用の基盤となるマスタデータを管理。

- Warehouse: 倉庫マスタ（統合版、ID主キー）
- Supplier: 仕入先マスタ
- Customer: 得意先マスタ
- DeliveryPlace: 納入場所マスタ
- Product: 製品マスタ（包装情報、単位情報含む）
- ProductUomConversion: 製品別単位変換マスタ
- UnitConversion: グローバル単位変換マスタ
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, relationship, synonym

from .base_model import AuditMixin, Base

# 型チェック時のみインポート（循環インポート回避）
if TYPE_CHECKING:
    from .inventory import Lot, StockMovement, ReceiptHeader
    from .orders import OrderLineWarehouseAllocation


class Warehouse(AuditMixin, Base):
    """
    倉庫マスタ（統合版）
    
    出荷元となる倉庫を管理。IDを主キーとし、warehouse_codeをユニーク制約とする。
    
    Attributes:
        id: 内部ID（主キー、BigInteger）
        warehouse_code: 倉庫コード（業務キー、ユニーク）
        warehouse_name: 倉庫名称
        address: 住所
        is_active: 有効フラグ（1=有効、0=無効）
    """

    __tablename__ = "warehouses"

    id = Column(BigInteger, primary_key=True, autoincrement=True)  # 内部ID
    warehouse_code = Column(String(32), unique=True, nullable=False, index=True)  # 倉庫コード
    warehouse_name = Column(String(128), nullable=False)  # 倉庫名称
    address = Column(Text, nullable=True)  # 住所
    is_active = Column(Integer, default=1)  # 有効フラグ

    # リレーション（foreign_keys明示でSQLAlchemy警告回避）
    stock_movements: Mapped[list["StockMovement"]] = relationship(
        "StockMovement",
        back_populates="warehouse",
        foreign_keys="StockMovement.warehouse_id",
        lazy="noload",  # 在庫変動は必要時のみ明示的に取得
    )
    receipt_headers: Mapped[list["ReceiptHeader"]] = relationship(
        "ReceiptHeader",
        back_populates="warehouse",
        foreign_keys="ReceiptHeader.warehouse_id",
        lazy="noload",  # 入荷ヘッダは必要時のみ明示的に取得
    )
    warehouse_allocations: Mapped[list["OrderLineWarehouseAllocation"]] = relationship(
        "OrderLineWarehouseAllocation",
        back_populates="warehouse",
        lazy="noload",  # 倉庫配分は必要時のみ明示的に取得
    )
    lots: Mapped[list["Lot"]] = relationship(
        "Lot",
        back_populates="warehouse",
        foreign_keys="Lot.warehouse_id",
        lazy="noload",  # ロットは必要時のみ明示的に取得
    )


class Supplier(AuditMixin, Base):
    """
    仕入先マスタ
    
    製品の供給元を管理。
    
    Attributes:
        supplier_code: 仕入先コード（主キー）
        supplier_name: 仕入先名称
        address: 住所
    """

    __tablename__ = "suppliers"

    supplier_code = Column(Text, primary_key=True)  # 仕入先コード
    supplier_name = Column(Text, nullable=False)  # 仕入先名称
    address = Column(Text, nullable=True)  # 住所

    # リレーション
    lots: Mapped[list["Lot"]] = relationship(
        "Lot",
        back_populates="supplier",
        lazy="noload",  # ロットは必要時のみ明示的に取得
    )
    products: Mapped[list["Product"]] = relationship(
        "Product",
        back_populates="supplier",
        lazy="selectin",  # 製品情報は常に一緒に取得（N+1回避）
    )
    expiry_rules: Mapped[list["ExpiryRule"]] = relationship(
        "ExpiryRule",
        back_populates="supplier",
        lazy="selectin",  # 有効期限ルールは常に一緒に取得
    )


class Customer(AuditMixin, Base):
    """
    得意先マスタ
    
    受注の発注元を管理。
    
    Attributes:
        customer_code: 得意先コード（主キー）
        customer_name: 得意先名称
        address: 住所
    """

    __tablename__ = "customers"

    customer_code = Column(Text, primary_key=True)  # 得意先コード
    customer_name = Column(Text, nullable=False)  # 得意先名称
    address = Column(Text, nullable=True)  # 住所

    # リレーション
    orders: Mapped[list["Order"]] = relationship(
        "Order",
        back_populates="customer",
        lazy="noload",  # 受注は必要時のみ明示的に取得
    )


class DeliveryPlace(AuditMixin, Base):
    """
    納入場所マスタ
    
    製品の納入先を管理。引当時の納入先指定に使用。
    
    Attributes:
        id: 内部ID（主キー）
        place_code: 納入場所コード（業務キー、ユニーク）
        place_name: 納入場所名称
        address: 住所
        is_active: 有効フラグ（1=有効、0=無効）
    """

    __tablename__ = "delivery_places"

    id = Column(BigInteger, primary_key=True, autoincrement=True)  # 内部ID
    place_code = Column(String(64), unique=True, nullable=False, index=True)  # 納入場所コード
    place_name = Column(String(256), nullable=False)  # 納入場所名称
    address = Column(Text, nullable=True)  # 住所
    is_active = Column(Integer, nullable=False, default=1)  # 有効フラグ

    # リレーション
    allocations: Mapped[list["Allocation"]] = relationship(
        "Allocation",
        back_populates="destination",
        lazy="noload",  # 引当は必要時のみ明示的に取得
    )


class Product(AuditMixin, Base):
    """
    製品マスタ
    
    取り扱う製品の基本情報を管理。包装単位、内部単位、基準単位を保持。
    
    Attributes:
        product_code: 製品コード（主キー）
        product_name: 製品名称
        supplier_code: 仕入先コード（FK）
        packaging_qty: 包装数量
        packaging_unit: 包装単位（例: CAN）
        internal_unit: 内部管理単位（例: EA）
        base_unit: 基準単位（例: EA、KG）
        customer_part_no: 顧客品番
        maker_item_code: メーカー品番
        supplier_item_code: 仕入先品番
        shelf_life_days: 保管可能日数
        requires_lot_number: ロット番号必須フラグ
        delivery_place_id: デフォルト納入場所ID
    """

    __tablename__ = "products"

    product_code = Column(Text, primary_key=True)  # 製品コード
    product_name = Column(Text, nullable=False)  # 製品名称
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=True)  # 仕入先コード

    # 包装関連
    packaging_qty = Column(Numeric(15, 4), nullable=False, default=1.0)  # 包装数量
    packaging_unit = Column(Text, nullable=False, default="EA")  # 包装単位
    internal_unit = Column(Text, nullable=False, default="EA")  # 内部管理単位
    base_unit = Column(Text, nullable=False, default="EA")  # 基準単位

    # 製品情報
    customer_part_no = Column(Text, nullable=True)  # 顧客品番
    maker_item_code = Column(Text, nullable=True)  # メーカー品番
    supplier_item_code = Column(Text, nullable=True)  # 仕入先品番
    packaging = Column(Text, nullable=True)  # 包装形態
    assemble_div = Column(Text, nullable=True)  # 組立区分
    next_div = Column(Text, nullable=True)  # 次工程区分
    ji_ku_text = Column(Text, nullable=True)  # 自工区テキスト
    kumitsuke_ku_text = Column(Text, nullable=True)  # 組付区テキスト
    shelf_life_days = Column(Integer, nullable=True)  # 保管可能日数
    requires_lot_number = Column(Integer, nullable=False, default=1)  # ロット番号必須フラグ

    # 納入場所情報
    delivery_place_id = Column(BigInteger, ForeignKey("delivery_places.id"), nullable=True)  # デフォルト納入場所ID
    delivery_place_name = Column(Text, nullable=True)  # 納入場所名称（非正規化）
    shipping_warehouse_name = Column(Text, nullable=True)  # 出荷倉庫名称（非正規化）

    # リレーション
    supplier: Mapped["Supplier"] = relationship(
        "Supplier",
        back_populates="products",
        lazy="joined",  # 仕入先情報は常に一緒に取得（頻繁にアクセス）
    )
    lots: Mapped[list["Lot"]] = relationship(
        "Lot",
        back_populates="product",
        lazy="noload",  # ロットは必要時のみ明示的に取得
    )
    uom_conversions: Mapped[list["ProductUomConversion"]] = relationship(
        "ProductUomConversion",
        back_populates="product",
        lazy="selectin",  # 単位変換情報は常に一緒に取得（N+1回避）
    )
    expiry_rules: Mapped[list["ExpiryRule"]] = relationship(
        "ExpiryRule",
        back_populates="product",
        lazy="selectin",  # 有効期限ルールは常に一緒に取得
    )
    order_lines: Mapped[list["OrderLine"]] = relationship(
        "OrderLine",
        back_populates="product",
        lazy="noload",  # 受注明細は必要時のみ明示的に取得
    )


class ProductUomConversion(AuditMixin, Base):
    """
    製品別単位変換マスタ
    
    製品ごとの単位変換係数を管理（例: CAN→EA変換）。
    
    Attributes:
        id: 内部ID（主キー）
        product_code: 製品コード（FK）
        source_unit: 変換元単位（例: CAN）
        source_value: 変換元数量（例: 1.0）
        internal_unit_value: 内部管理単位換算値（例: 24.0）
    """

    __tablename__ = "product_uom_conversions"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)  # 製品コード
    source_unit = Column(Text, nullable=False)  # 変換元単位
    source_value = Column(Float, nullable=False, default=1.0)  # 変換元数量
    internal_unit_value = Column(Float, nullable=False)  # 内部管理単位換算値

    __table_args__ = (
        UniqueConstraint("product_code", "source_unit", name="uq_product_uom"),
        {"keep_existing": True},
    )

    # リレーション
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="uom_conversions",
        lazy="joined",  # 製品情報は常に一緒に取得
    )


class UnitConversion(AuditMixin, Base):
    """
    単位変換マスタ（グローバル）
    
    製品横断的な単位変換係数を管理（例: KG→G変換）。
    
    Attributes:
        id: 内部ID（主キー）
        product_id: 製品コード（NULL=全製品共通）
        from_unit: 変換元単位
        to_unit: 変換先単位
        conversion_factor: 変換係数
    """

    __tablename__ = "unit_conversions"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    product_id = Column(Text, ForeignKey("products.product_code"), nullable=True)  # 製品コード（NULL=全製品共通）
    from_unit = Column(Text, nullable=False)  # 変換元単位
    to_unit = Column(Text, nullable=False)  # 変換先単位
    conversion_factor = Column(Float, nullable=False)  # 変換係数

    __table_args__ = (
        UniqueConstraint("product_id", "from_unit", "to_unit", name="uq_unit_conversion"),
    )
