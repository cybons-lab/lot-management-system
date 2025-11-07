# backend/app/models/orders.py
"""
販売関連のモデル定義

受注、受注明細、引当、出荷、倉庫配分を管理。

- Order: 受注ヘッダ
- OrderLine: 受注明細
- OrderLineWarehouseAllocation: 受注明細の倉庫別配分
- Allocation: ロット引当
- Shipping: 出荷実績
- PurchaseRequest: 発注依頼
- NextDivMap: 次工程区分マッピング
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import AuditMixin, Base

# 型チェック時のみインポート（循環インポート回避）
if TYPE_CHECKING:
    from .inventory import Lot, StockMovement
    from .masters import Warehouse


class Order(AuditMixin, Base):
    """
    受注ヘッダ
    
    顧客からの受注を表現。複数の受注明細（OrderLine）を持つ。
    
    Attributes:
        id: 内部ID（主キー）
        order_no: 受注番号（ユニーク）
        customer_code: 得意先コード（FK）
        order_date: 受注日
        status: ステータス（open, allocated, shipped, closed, cancelled）
        sap_order_id: SAP連携用受注ID
        sap_status: SAP連携ステータス
        customer_order_no: 顧客発注番号
        delivery_mode: 納入形態
    """

    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    order_no = Column(Text, unique=True, nullable=False)  # 受注番号
    customer_code = Column(Text, ForeignKey("customers.customer_code"), nullable=False)  # 得意先コード
    order_date = Column(Date)  # 受注日
    status = Column(Text, default="open")  # ステータス
    sap_order_id = Column(Text)  # SAP連携用受注ID
    sap_status = Column(Text)  # SAP連携ステータス
    sap_sent_at = Column(DateTime)  # SAP送信日時
    sap_error_msg = Column(Text)  # SAPエラーメッセージ
    customer_order_no = Column(Text)  # 顧客発注番号
    customer_order_no_last6 = Column(String(6))  # 顧客発注番号（下6桁）
    delivery_mode = Column(Text)  # 納入形態

    # リレーション
    customer: Mapped["Customer"] = relationship(
        "Customer",
        back_populates="orders",
        lazy="joined",  # 得意先情報は常に一緒に取得（頻繁にアクセス）
    )
    lines: Mapped[list["OrderLine"]] = relationship(
        "OrderLine",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",  # 明細は常に一緒に取得（N+1回避）
    )
    sap_sync_logs: Mapped[list["SapSyncLog"]] = relationship(
        "SapSyncLog",
        back_populates="order",
        lazy="noload",  # SAP連携ログは必要時のみ明示的に取得
    )


class OrderLine(AuditMixin, Base):
    """
    受注明細
    
    受注ヘッダに紐づく個別製品の受注情報。
    
    Attributes:
        id: 内部ID（主キー）
        order_id: 受注ヘッダID（FK）
        line_no: 明細行番号
        product_code: 製品コード（FK）
        quantity: 受注数量
        unit: 単位
        status: ステータス（open, allocated, shipped, closed）
        delivery_date: 納期
        forecast_id: フォーキャストID（FK）
    """

    __tablename__ = "order_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)  # 受注ヘッダID
    line_no = Column(Integer, nullable=False)  # 明細行番号
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)  # 製品コード
    quantity = Column(Float, nullable=False)  # 受注数量
    unit = Column(Text, nullable=True)  # 単位
    status = Column(Text, default="open")  # ステータス
    delivery_date = Column(Date, nullable=True)  # 納期
    forecast_id = Column(Integer, ForeignKey("forecasts.id"), nullable=True)  # フォーキャストID

    __table_args__ = (
        UniqueConstraint("order_id", "line_no", name="uq_order_line"),
        Index("ix_order_lines_order_id", "order_id"),
        Index("ix_order_lines_product_code", "product_code"),
    )

    # リレーション
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="lines",
        lazy="joined",  # 受注ヘッダ情報は常に一緒に取得
    )
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="order_lines",
        lazy="joined",  # 製品情報は常に一緒に取得（頻繁にアクセス）
    )
    allocations: Mapped[list["Allocation"]] = relationship(
        "Allocation",
        back_populates="order_line",
        cascade="all, delete-orphan",
        lazy="selectin",  # 引当情報は常に一緒に取得（N+1回避）
    )
    warehouse_allocations: Mapped[list["OrderLineWarehouseAllocation"]] = relationship(
        "OrderLineWarehouseAllocation",
        back_populates="order_line",
        cascade="all, delete-orphan",
        lazy="selectin",  # 倉庫配分は常に一緒に取得（N+1回避）
    )
    forecast: Mapped["Forecast"] = relationship(
        "Forecast",
        back_populates="order_lines",
        lazy="noload",  # フォーキャストは必要時のみ明示的に取得
    )


class OrderLineWarehouseAllocation(AuditMixin, Base):
    """
    受注明細の倉庫別配分
    
    受注明細を複数の倉庫に配分する際の配分数量を管理。
    
    Attributes:
        id: 内部ID（主キー）
        order_line_id: 受注明細ID（FK）
        warehouse_id: 倉庫ID（FK、BigInteger）
        quantity: 配分数量
    """

    __tablename__ = "order_line_warehouse_allocation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # 内部ID
    order_line_id: Mapped[int] = mapped_column(ForeignKey("order_lines.id"), nullable=False)  # 受注明細ID
    warehouse_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("warehouses.id"),
        nullable=False,
    )  # 倉庫ID
    quantity: Mapped[float] = mapped_column(Float, nullable=False)  # 配分数量

    __table_args__ = (
        UniqueConstraint("order_line_id", "warehouse_id", name="uq_orderline_warehouse"),
        Index("ix_olwa_order_line_id", "order_line_id"),
        Index("ix_olwa_warehouse_id", "warehouse_id"),
        CheckConstraint("quantity > 0", name="ck_olwa_quantity_positive"),
    )

    # リレーション
    order_line: Mapped["OrderLine"] = relationship(
        "OrderLine",
        back_populates="warehouse_allocations",
        lazy="joined",  # 受注明細は常に一緒に取得
    )
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse",
        back_populates="warehouse_allocations",
        lazy="joined",  # 倉庫情報は常に一緒に取得
    )


class Allocation(AuditMixin, Base):
    """
    ロット引当
    
    受注明細に対するロットの引当情報を管理。
    FEFO（先に期限が切れるものから）原則に基づく引当を実現。
    
    Attributes:
        id: 内部ID（主キー）
        order_line_id: 受注明細ID（FK）
        lot_id: ロットID（FK）
        allocated_qty: 引当数量
        destination_id: 納入場所ID（FK）
        allocation_date: 引当日時
    """

    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    order_line_id = Column(
        Integer, ForeignKey("order_lines.id", ondelete="CASCADE"), nullable=False
    )  # 受注明細ID
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)  # ロットID
    allocated_qty = Column(Float, nullable=False)  # 引当数量
    destination_id = Column(BigInteger, ForeignKey("delivery_places.id"), nullable=True)  # 納入場所ID
    allocation_date = Column(DateTime, server_default=func.now())  # 引当日時

    __table_args__ = (
        Index("ix_allocations_order_line", "order_line_id"),
        Index("ix_allocations_lot", "lot_id"),
    )

    # リレーション
    order_line: Mapped["OrderLine"] = relationship(
        "OrderLine",
        back_populates="allocations",
        lazy="joined",  # 受注明細は常に一緒に取得
    )
    lot: Mapped["Lot"] = relationship(
        "Lot",
        back_populates="allocations",
        lazy="joined",  # ロット情報は常に一緒に取得
    )
    destination: Mapped["DeliveryPlace"] = relationship(
        "DeliveryPlace",
        back_populates="allocations",
        lazy="noload",  # 納入場所は必要時のみ明示的に取得
    )


class Shipping(AuditMixin, Base):
    """
    出荷実績
    
    ロット単位での出荷実績を記録。配送先情報と追跡情報を保持。
    
    Attributes:
        id: 内部ID（主キー）
        lot_id: ロットID（FK）
        order_line_id: 受注明細ID（FK、任意）
        shipped_quantity: 出荷数量
        shipping_date: 出荷日
        destination_code: 配送先コード
        destination_name: 配送先名称
        tracking_number: 追跡番号
        carrier: 運送業者
    """

    __tablename__ = "shipping"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)  # ロットID
    order_line_id = Column(Integer, ForeignKey("order_lines.id"), nullable=True)  # 受注明細ID
    shipped_quantity = Column(Float, nullable=False)  # 出荷数量
    shipping_date = Column(Date, nullable=False)  # 出荷日
    destination_code = Column(Text, nullable=True)  # 配送先コード
    destination_name = Column(Text, nullable=True)  # 配送先名称
    destination_address = Column(Text, nullable=True)  # 配送先住所
    contact_person = Column(Text, nullable=True)  # 担当者名
    contact_phone = Column(Text, nullable=True)  # 担当者電話番号
    delivery_time_slot = Column(Text, nullable=True)  # 配達時間帯
    tracking_number = Column(Text, nullable=True)  # 追跡番号
    carrier = Column(Text, nullable=True)  # 運送業者
    carrier_service = Column(Text, nullable=True)  # 運送サービス
    notes = Column(Text, nullable=True)  # 備考


class PurchaseRequest(AuditMixin, Base):
    """
    発注依頼
    
    在庫不足時の発注依頼を記録。
    
    Attributes:
        id: 内部ID（主キー）
        product_code: 製品コード（FK）
        supplier_code: 仕入先コード（FK）
        requested_qty: 発注依頼数量
        requested_date: 発注依頼日
        status: ステータス（pending, ordered, cancelled）
    """

    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)  # 製品コード
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=False)  # 仕入先コード
    requested_qty = Column(Float, nullable=False)  # 発注依頼数量
    requested_date = Column(Date, nullable=False)  # 発注依頼日
    status = Column(Text, default="pending")  # ステータス


class NextDivMap(AuditMixin, Base):
    """
    次工程区分マッピング
    
    顧客の次工程区分から仕入先へのマッピングルールを管理。
    
    Attributes:
        id: 内部ID（主キー）
        from_customer: 発注元顧客
        from_next_div: 次工程区分
        target_supplier: 対象仕入先
    """

    __tablename__ = "next_div_map"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    from_customer = Column(Text, nullable=False)  # 発注元顧客
    from_next_div = Column(Text, nullable=False)  # 次工程区分
    target_supplier = Column(Text, nullable=False)  # 対象仕入先

    __table_args__ = (
        UniqueConstraint("from_customer", "from_next_div", name="uq_next_div_map"),
    )
