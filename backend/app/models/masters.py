# backend/app/models/masters.py
"""
マスタテーブルのモデル定義（統合版）
倉庫、仕入先、得意先、製品
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


class Warehouse(AuditMixin, Base):
    """
    倉庫マスタ（統合版）
    - IDを主キーとする新スキーマに統一
    - warehouse_codeはユニーク制約
    """

    __tablename__ = "warehouses"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    warehouse_code = Column(String(32), unique=True, nullable=False, index=True)
    warehouse_name = Column(String(128), nullable=False)
    address = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)

    # リレーション
    stock_movements = relationship(
        "StockMovement",
        back_populates="warehouse",
    )
    receipt_headers = relationship(
        "ReceiptHeader",
        back_populates="warehouse",
    )
    # OrderLineWarehouseAllocationはorders.pyで定義されている
    warehouse_allocations: Mapped[list["OrderLineWarehouseAllocation"]] = relationship(
        "OrderLineWarehouseAllocation",
        back_populates="warehouse",
    )
    lots: Mapped[list["Lot"]] = relationship(
        "Lot",
        back_populates="warehouse",
        foreign_keys="Lot.warehouse_id",
    )


# 型チェッカ専用の前方参照（実行時には評価されない）
if TYPE_CHECKING:
    from .inventory import Lot
    from .orders import OrderLineWarehouseAllocation


class Supplier(AuditMixin, Base):
    """仕入先マスタ"""

    __tablename__ = "suppliers"

    supplier_code = Column(Text, primary_key=True)
    supplier_name = Column(Text, nullable=False)
    address = Column(Text)

    # リレーション
    lots = relationship("Lot", back_populates="supplier")
    purchase_requests = relationship("PurchaseRequest", back_populates="supplier")
    products = relationship("Product", back_populates="supplier")


class DeliveryPlace(AuditMixin, Base):
    """納入先マスタ（SAP納入先のローカルコピー）"""

    __tablename__ = "delivery_places"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    delivery_place_code = Column(String, nullable=False, unique=True, index=True)
    delivery_place_name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")

    # リレーション
    products = relationship("Product", back_populates="delivery_place")
    order_lines = relationship("OrderLine", back_populates="destination")
    allocations = relationship("Allocation", back_populates="destination")


class Customer(AuditMixin, Base):
    """得意先マスタ"""

    __tablename__ = "customers"

    customer_code = Column(Text, primary_key=True)
    customer_name = Column(Text, nullable=False)
    address = Column(Text)

    # リレーション
    orders = relationship("Order", back_populates="customer")


class Product(AuditMixin, Base):
    """製品マスタ"""

    __tablename__ = "products"

    product_code = Column(Text, primary_key=True)
    product_name = Column(Text, nullable=False)
    customer_part_no = Column(Text)
    maker_item_code = Column(String, nullable=True)
    supplier_item_code = Column(String, nullable=True)
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=True)
    packaging_qty = Column(Numeric(10, 2), nullable=False, default=1)  # 包装数量
    packaging_unit = Column(String(20), nullable=False, default="EA")  # 包装単位
    internal_unit = Column(Text, nullable=False, default="EA")  # 内部管理単位
    base_unit = Column(String(10), nullable=False, default="EA")  # 基準単位
    assemble_div = Column(Text)
    next_div = Column(Text)
    shelf_life_days = Column(Integer)
    requires_lot_number = Column(Integer, default=1)
    delivery_place_id = Column(BigInteger, ForeignKey("delivery_places.id"), nullable=True)
    ji_ku_text = Column(String, nullable=True)
    kumitsuke_ku_text = Column(String, nullable=True)
    delivery_place_name = Column(String, nullable=True)
    shipping_warehouse_name = Column(String, nullable=True)

    # リレーション
    lots = relationship("Lot", back_populates="product")
    conversions = relationship(
        "ProductUomConversion", back_populates="product", cascade="all, delete-orphan"
    )
    unit_conversions = relationship(
        "UnitConversion", back_populates="product", cascade="all, delete-orphan"
    )
    order_lines = relationship("OrderLine", back_populates="product")
    supplier = relationship("Supplier", back_populates="products")
    delivery_place = relationship("DeliveryPlace", back_populates="products")

    maker_part_no = synonym("maker_item_code")

    __table_args__ = (
        UniqueConstraint(
            "supplier_code", "maker_item_code", name="uq_products_supplier_maker_item"
        ),
        UniqueConstraint(
            "supplier_code", "supplier_item_code", name="uq_products_supplier_supplier_item"
        ),
    )


class ProductUomConversion(AuditMixin, Base):
    """製品単位換算テーブル"""

    __tablename__ = "product_uom_conversions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)
    source_unit = Column(Text, nullable=False)
    source_value = Column(Float, nullable=False, default=1.0)
    internal_unit_value = Column(Float, nullable=False)

    __table_args__ = (UniqueConstraint("product_code", "source_unit", name="uq_product_unit"),)

    # リレーション
    product = relationship("Product", back_populates="conversions")


class UnitConversion(AuditMixin, Base):
    """
    単位換算マスタ（新規追加）
    製品ごとの単位換算係数を管理
    """

    __tablename__ = "unit_conversions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)
    from_unit = Column(String(10), nullable=False)
    to_unit = Column(String(10), nullable=False)
    factor = Column(Float, nullable=False)  # from_unit * factor = to_unit

    __table_args__ = (
        UniqueConstraint("product_code", "from_unit", "to_unit", name="uq_unit_conv"),
    )

    # リレーション
    product = relationship("Product", back_populates="unit_conversions")
