# backend/app/models/masters.py
"""
マスタテーブルのモデル定義（統合版）
倉庫、仕入先、得意先、製品
"""

from sqlalchemy import (
    Column,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .base_model import AuditMixin, Base


class Warehouse(AuditMixin, Base):
    """
    倉庫マスタ（統合版）
    - IDを主キーとする新スキーマに統一
    - warehouse_codeはユニーク制約
    """

    __tablename__ = "warehouse"

    id = Column(Integer, primary_key=True, autoincrement=True)
    warehouse_code = Column(String(32), unique=True, nullable=False, index=True)
    warehouse_name = Column(String(128), nullable=False)
    address = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)

    # リレーション
    lots = relationship(
        "Lot",
        back_populates="warehouse",
        foreign_keys="Lot.warehouse_id",
    )
    stock_movements = relationship(
        "StockMovement",
        back_populates="warehouse",
    )
    receipt_headers = relationship(
        "ReceiptHeader",
        back_populates="warehouse",
    )
    # OrderLineWarehouseAllocationはorders.pyで定義されている
    warehouse_allocations = relationship(
        "OrderLineWarehouseAllocation",
        back_populates="warehouse",
        cascade="all, delete-orphan",
    )


class Supplier(AuditMixin, Base):
    """仕入先マスタ"""

    __tablename__ = "suppliers"

    supplier_code = Column(Text, primary_key=True)
    supplier_name = Column(Text, nullable=False)
    address = Column(Text)

    # リレーション
    lots = relationship("Lot", back_populates="supplier")
    purchase_requests = relationship("PurchaseRequest", back_populates="supplier")


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
    maker_part_no = Column(Text)
    packaging_qty = Column(Numeric(10, 2), nullable=False, default=1)  # 包装数量
    packaging_unit = Column(String(20), nullable=False, default="EA")  # 包装単位
    internal_unit = Column(Text, nullable=False, default="EA")  # 内部管理単位
    base_unit = Column(String(10), nullable=False, default="EA")  # 基準単位
    assemble_div = Column(Text)
    next_div = Column(Text)
    shelf_life_days = Column(Integer)
    requires_lot_number = Column(Integer, default=1)

    # リレーション
    lots = relationship("Lot", back_populates="product")
    conversions = relationship(
        "ProductUomConversion", back_populates="product", cascade="all, delete-orphan"
    )
    unit_conversions = relationship(
        "UnitConversion", back_populates="product", cascade="all, delete-orphan"
    )
    order_lines = relationship("OrderLine", back_populates="product")
    forecasts = relationship("Forecast", back_populates="product")


class ProductUomConversion(AuditMixin, Base):
    """製品単位換算テーブル"""

    __tablename__ = "product_uom_conversions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)
    source_unit = Column(Text, nullable=False)
    source_value = Column(Float, nullable=False, default=1.0)
    internal_unit_value = Column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("product_code", "source_unit", name="uq_product_unit"),
    )

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
