# backend/app/models/inventory.py
"""
在庫関連のモデル定義（修正版）
ロット、在庫変動、現在在庫、入荷、有効期限ルール
"""

from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from .base_model import AuditMixin, Base


class StockMovementReason(PyEnum):
    """在庫変動理由"""

    RECEIPT = "RECEIPT"  # 入荷
    SHIPMENT = "SHIPMENT"  # 出荷
    ALLOCATION_HOLD = "ALLOCATION_HOLD"  # 引当（在庫確保）
    ALLOCATION_RELEASE = "ALLOCATION_RELEASE"  # 引当解除
    ADJUSTMENT = "ADJUSTMENT"  # 棚卸調整


class Lot(AuditMixin, Base):
    """
    ロットマスタ（修正版）
    - warehouse_idのみを使用（Integer型、新warehouseテーブル参照）
    - warehouse_codeは削除
    """

    __tablename__ = "lots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=False)
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)
    lot_number = Column(Text, nullable=False)
    receipt_date = Column(Date, nullable=False)
    mfg_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)

    # 🔽 修正: warehouse_idのみ使用（Integer型）
    warehouse_id = Column(Integer, ForeignKey("warehouse.id"), nullable=False)

    lot_unit = Column(String(10), nullable=True)  # ロット単位（例: CAN, KG）
    kanban_class = Column(Text, nullable=True)
    sales_unit = Column(Text, nullable=True)
    inventory_unit = Column(Text, nullable=True)
    received_by = Column(Text, nullable=True)
    source_doc = Column(Text, nullable=True)
    qc_certificate_status = Column(Text, nullable=True)
    qc_certificate_file = Column(Text, nullable=True)
    is_locked = Column(Boolean, nullable=False, default=False)
    lock_reason = Column(Text, nullable=True)
    inspection_date = Column(Date, nullable=True)
    inspection_result = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "supplier_code",
            "product_code",
            "lot_number",
            name="uq_lot_supplier_product_no",
        ),
    )

    # リレーション
    supplier = relationship("Supplier", back_populates="lots")
    product = relationship("Product", back_populates="lots")
    warehouse = relationship("Warehouse", back_populates="lots")
    stock_movements = relationship(
        "StockMovement", back_populates="lot", cascade="all, delete-orphan"
    )
    current_stock = relationship(
        "LotCurrentStock",
        back_populates="lot",
        uselist=False,
        cascade="all, delete-orphan",
    )
    allocations = relationship("Allocation", back_populates="lot", cascade="all, delete-orphan")
    receipt_lines = relationship("ReceiptLine", back_populates="lot")
    warehouse = relationship("Warehouse", back_populates="lots")


class StockMovement(AuditMixin, Base):
    """
    在庫変動履歴（イベントソーシング）
    全ての在庫変動を記録
    """

    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouse.id"), nullable=False)
    movement_type = Column(Enum(StockMovementReason), nullable=False)  # receipt, shipment, etc.
    quantity = Column(Float, nullable=False)  # 正: 入庫, 負: 出庫
    related_id = Column(Text, nullable=True)  # 関連伝票番号
    notes = Column(Text, nullable=True)
    movement_date = Column(DateTime, nullable=False, server_default=func.now())

    __table_args__ = (Index("ix_stock_movements_lot", "lot_id"),)

    # リレーション
    lot = relationship("Lot", back_populates="stock_movements")
    warehouse = relationship("Warehouse", back_populates="stock_movements")


class LotCurrentStock(AuditMixin, Base):
    """
    現在在庫（サマリテーブル）
    パフォーマンス最適化のため
    """

    __tablename__ = "lot_current_stock"

    lot_id = Column(Integer, ForeignKey("lots.id", ondelete="CASCADE"), primary_key=True)
    current_quantity = Column(Float, nullable=False, default=0.0)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # リレーション
    lot = relationship("Lot", back_populates="current_stock")


class ReceiptHeader(AuditMixin, Base):
    """入荷伝票ヘッダ"""

    __tablename__ = "receipt_headers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    receipt_no = Column(Text, unique=True)
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=False)

    # 🔽 修正: warehouse_idを使用
    warehouse_id = Column(Integer, ForeignKey("warehouse.id"), nullable=False)

    receipt_date = Column(Date, nullable=False)
    created_by = Column(Text)
    notes = Column(Text)

    # リレーション
    warehouse = relationship("Warehouse", back_populates="receipt_headers")
    lines = relationship("ReceiptLine", back_populates="header", cascade="all, delete-orphan")


class ReceiptLine(AuditMixin, Base):
    """入荷伝票明細"""

    __tablename__ = "receipt_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    header_id = Column(
        Integer, ForeignKey("receipt_headers.id", ondelete="CASCADE"), nullable=False
    )
    line_no = Column(Integer, nullable=False)
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(Text)
    notes = Column(Text)

    __table_args__ = (UniqueConstraint("header_id", "line_no", name="uq_receipt_line"),)

    # リレーション
    header = relationship("ReceiptHeader", back_populates="lines")
    lot = relationship("Lot", back_populates="receipt_lines")


class ExpiryRule(AuditMixin, Base):
    """有効期限ルール"""

    __tablename__ = "expiry_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_code = Column(Text, ForeignKey("products.product_code"))
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"))
    rule_type = Column(Text, nullable=False)  # fixed_days, fixed_date, mfg_based
    days = Column(Integer)  # 有効期限日数
    fixed_date = Column(Date)  # 固定日付
    is_active = Column(Integer, default=1)
    priority = Column(Integer, nullable=False, default=10)
