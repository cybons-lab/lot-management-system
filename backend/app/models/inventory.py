# backend/app/models/inventory.py
"""
在庫関連のモデル定義

ロット管理、在庫変動、現在在庫、入荷、有効期限ルールを管理。

- StockMovementReason: 在庫変動理由のEnum
- Lot: ロットマスタ（在庫管理の最小単位）
- StockMovement: 在庫変動履歴（入出庫トレース）
- LotCurrentStock: ロット別現在在庫（集計ビュー）
- ReceiptHeader: 入荷ヘッダ
- ReceiptLine: 入荷明細
- ExpiryRule: 有効期限ルール
"""

from __future__ import annotations

from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, relationship

from .base_model import AuditMixin, Base

# 型チェック時のみインポート（循環インポート回避）
if TYPE_CHECKING:
    from .masters import Product, Supplier, Warehouse


class StockMovementReason(PyEnum):
    """
    在庫変動理由
    
    在庫変動の原因を区分するための列挙型。
    """

    RECEIPT = "RECEIPT"  # 入荷
    SHIPMENT = "SHIPMENT"  # 出荷
    ALLOCATION_HOLD = "ALLOCATION_HOLD"  # 引当（在庫確保）
    ALLOCATION_RELEASE = "ALLOCATION_RELEASE"  # 引当解除
    ADJUSTMENT = "ADJUSTMENT"  # 棚卸調整


class Lot(AuditMixin, Base):
    """
    ロットマスタ
    
    在庫管理の最小単位。仕入先・製品・ロット番号の組み合わせで一意に識別。
    倉庫IDを保持し、倉庫単位での在庫管理を可能にする。
    
    Attributes:
        id: 内部ID（主キー）
        supplier_code: 仕入先コード（FK）
        product_code: 製品コード（FK）
        lot_number: ロット番号
        receipt_date: 入庫日
        mfg_date: 製造日
        expiry_date: 有効期限
        warehouse_id: 倉庫ID（FK、BigInteger、warehouses.id参照）
        lot_unit: ロット単位（例: CAN、KG）
        is_locked: ロックフラグ（品質保留等）
        lock_reason: ロック理由
    """

    __tablename__ = "lots"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=False)  # 仕入先コード
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)  # 製品コード
    lot_number = Column(Text, nullable=False)  # ロット番号
    receipt_date = Column(Date, nullable=False)  # 入庫日
    mfg_date = Column(Date, nullable=True)  # 製造日
    expiry_date = Column(Date, nullable=True)  # 有効期限

    # 倉庫ID（BigInteger、warehouses.id参照）
    warehouse_id = Column(
        BigInteger, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=True, index=True
    )

    lot_unit = Column(String(10), nullable=True)  # ロット単位
    kanban_class = Column(Text, nullable=True)  # かんばん種別
    sales_unit = Column(Text, nullable=True)  # 販売単位
    inventory_unit = Column(Text, nullable=True)  # 在庫単位
    received_by = Column(Text, nullable=True)  # 受入担当者
    source_doc = Column(Text, nullable=True)  # 元伝票番号
    qc_certificate_status = Column(Text, nullable=True)  # 品質証明書ステータス
    qc_certificate_file = Column(Text, nullable=True)  # 品質証明書ファイルパス
    is_locked = Column(Boolean, nullable=False, default=False)  # ロックフラグ
    lock_reason = Column(Text, nullable=True)  # ロック理由
    inspection_date = Column(Date, nullable=True)  # 検査日
    inspection_result = Column(Text, nullable=True)  # 検査結果

    __table_args__ = (
        UniqueConstraint(
            "supplier_code",
            "product_code",
            "lot_number",
            name="uq_lot_supplier_product_no",
        ),
    )

    # リレーション
    supplier: Mapped["Supplier"] = relationship(
        "Supplier",
        back_populates="lots",
        lazy="joined",  # 仕入先情報は常に一緒に取得（頻繁にアクセス）
    )
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="lots",
        lazy="joined",  # 製品情報は常に一緒に取得（頻繁にアクセス）
    )
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse",
        back_populates="lots",
        foreign_keys=[warehouse_id],
        lazy="joined",  # 倉庫情報は常に一緒に取得
    )
    stock_movements: Mapped[list["StockMovement"]] = relationship(
        "StockMovement",
        back_populates="lot",
        cascade="all, delete-orphan",
        lazy="noload",  # 在庫変動履歴は必要時のみ明示的に取得
    )
    current_stock: Mapped["LotCurrentStock"] = relationship(
        "LotCurrentStock",
        back_populates="lot",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="joined",  # 現在在庫は常に一緒に取得（頻繁にアクセス）
    )
    allocations: Mapped[list["Allocation"]] = relationship(
        "Allocation",
        back_populates="lot",
        lazy="noload",  # 引当は必要時のみ明示的に取得
    )


class StockMovement(AuditMixin, Base):
    """
    在庫変動履歴
    
    入出庫・引当・調整等のすべての在庫変動を記録。
    在庫の増減理由とトレーサビリティを確保。
    
    Attributes:
        id: 内部ID（主キー）
        lot_id: ロットID（FK）
        warehouse_id: 倉庫ID（FK、BigInteger）
        movement_type: 変動種別（in=入庫、out=出庫）
        quantity: 変動数量
        reason: 変動理由（StockMovementReason）
        reference_doc_type: 参照伝票種別（例: order, receipt）
        reference_doc_id: 参照伝票ID
        movement_date: 変動日
    """

    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False, index=True)  # ロットID
    warehouse_id = Column(
        BigInteger, ForeignKey("warehouses.id"), nullable=False, index=True
    )  # 倉庫ID
    movement_type = Column(Text, nullable=False)  # 変動種別（in/out）
    quantity = Column(Float, nullable=False)  # 変動数量
    reason = Column(Text, nullable=False)  # 変動理由
    reference_doc_type = Column(Text, nullable=True)  # 参照伝票種別
    reference_doc_id = Column(Text, nullable=True)  # 参照伝票ID
    movement_date = Column(DateTime, nullable=False, server_default=func.now())  # 変動日

    __table_args__ = (
        Index("ix_stock_movements_lot_date", "lot_id", "movement_date"),
        Index("ix_stock_movements_warehouse_date", "warehouse_id", "movement_date"),
    )

    # リレーション
    lot: Mapped["Lot"] = relationship(
        "Lot",
        back_populates="stock_movements",
        lazy="joined",  # ロット情報は常に一緒に取得
    )
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse",
        back_populates="stock_movements",
        foreign_keys=[warehouse_id],
        lazy="joined",  # 倉庫情報は常に一緒に取得
    )


class LotCurrentStock(AuditMixin, Base):
    """
    ロット別現在在庫
    
    各ロットの現在在庫数量を集計保持。
    在庫変動の都度更新され、引当可能数量を高速に取得可能。
    
    Attributes:
        lot_id: ロットID（主キー、FK）
        available_quantity: 引当可能数量（物理在庫 - 引当済数量）
        allocated_quantity: 引当済数量
        physical_quantity: 物理在庫数量
        last_movement_id: 最終変動ID（整合性チェック用）
    """

    __tablename__ = "lot_current_stock"

    lot_id = Column(Integer, ForeignKey("lots.id"), primary_key=True)  # ロットID（主キー）
    available_quantity = Column(Float, nullable=False, default=0.0)  # 引当可能数量
    allocated_quantity = Column(Float, nullable=False, default=0.0)  # 引当済数量
    physical_quantity = Column(Float, nullable=False, default=0.0)  # 物理在庫数量
    last_movement_id = Column(Integer, nullable=True)  # 最終変動ID

    # リレーション
    lot: Mapped["Lot"] = relationship(
        "Lot",
        back_populates="current_stock",
        lazy="joined",  # ロット情報は常に一緒に取得
    )


class ReceiptHeader(AuditMixin, Base):
    """
    入荷ヘッダ
    
    入荷伝票の1件を表現。複数の入荷明細（ReceiptLine）を持つ。
    
    Attributes:
        id: 内部ID（主キー）
        receipt_no: 入荷番号（ユニーク）
        warehouse_id: 倉庫ID（FK、BigInteger）
        supplier_code: 仕入先コード（FK）
        receipt_date: 入荷日
        status: ステータス（pending, completed, cancelled）
        source_doc_no: 元伝票番号（発注番号等）
    """

    __tablename__ = "receipt_headers"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    receipt_no = Column(Text, unique=True, nullable=False)  # 入荷番号
    warehouse_id = Column(
        BigInteger, ForeignKey("warehouses.id"), nullable=False, index=True
    )  # 倉庫ID
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=False)  # 仕入先コード
    receipt_date = Column(Date, nullable=False)  # 入荷日
    status = Column(Text, default="pending")  # ステータス
    source_doc_no = Column(Text, nullable=True)  # 元伝票番号

    # リレーション
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse",
        back_populates="receipt_headers",
        foreign_keys=[warehouse_id],
        lazy="joined",  # 倉庫情報は常に一緒に取得
    )
    lines: Mapped[list["ReceiptLine"]] = relationship(
        "ReceiptLine",
        back_populates="header",
        cascade="all, delete-orphan",
        lazy="selectin",  # 明細は常に一緒に取得（N+1回避）
    )


class ReceiptLine(AuditMixin, Base):
    """
    入荷明細
    
    入荷ヘッダに紐づく個別製品の入荷情報。
    
    Attributes:
        id: 内部ID（主キー）
        receipt_header_id: 入荷ヘッダID（FK）
        line_no: 明細行番号
        lot_id: ロットID（FK）
        product_code: 製品コード（FK）
        quantity: 入荷数量
        unit: 単位
    """

    __tablename__ = "receipt_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    receipt_header_id = Column(
        Integer, ForeignKey("receipt_headers.id", ondelete="CASCADE"), nullable=False
    )  # 入荷ヘッダID
    line_no = Column(Integer, nullable=False)  # 明細行番号
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)  # ロットID
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)  # 製品コード
    quantity = Column(Float, nullable=False)  # 入荷数量
    unit = Column(Text, nullable=True)  # 単位

    __table_args__ = (
        UniqueConstraint("receipt_header_id", "line_no", name="uq_receipt_line"),
        Index("ix_receipt_lines_lot", "lot_id"),
    )

    # リレーション
    header: Mapped["ReceiptHeader"] = relationship(
        "ReceiptHeader",
        back_populates="lines",
        lazy="joined",  # ヘッダ情報は常に一緒に取得
    )
    lot: Mapped["Lot"] = relationship(
        "Lot",
        lazy="joined",  # ロット情報は常に一緒に取得
    )


class ExpiryRule(AuditMixin, Base):
    """
    有効期限ルール
    
    製品ごと・仕入先ごとの有効期限自動計算ルール。
    
    Attributes:
        id: 内部ID（主キー）
        product_code: 製品コード（FK）
        supplier_code: 仕入先コード（FK）
        shelf_life_days: 保管可能日数
        warning_days: 警告日数（期限切れ前の通知閾値）
    """

    __tablename__ = "expiry_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)  # 製品コード
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=False)  # 仕入先コード
    shelf_life_days = Column(Integer, nullable=False)  # 保管可能日数
    warning_days = Column(Integer, nullable=True, default=7)  # 警告日数

    __table_args__ = (
        UniqueConstraint("product_code", "supplier_code", name="uq_expiry_rule"),
    )

    # リレーション
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="expiry_rules",
        lazy="joined",  # 製品情報は常に一緒に取得
    )
    supplier: Mapped["Supplier"] = relationship(
        "Supplier",
        back_populates="expiry_rules",
        lazy="joined",  # 仕入先情報は常に一緒に取得
    )
