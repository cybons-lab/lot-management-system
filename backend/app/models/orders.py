# backend/app/models/orders.py
"""
販売関連のモデル定義（修正版）
受注、受注明細、引当、出荷、倉庫配分
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import (
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

# 🔧 修正: 型チェック時のみインポート（循環インポートを回避）
if TYPE_CHECKING:
    from .masters import Warehouse


class Order(AuditMixin, Base):
    """受注ヘッダ"""

    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(Text, unique=True, nullable=False)
    customer_code = Column(Text, ForeignKey("customers.customer_code"), nullable=False)
    order_date = Column(Date)
    status = Column(Text, default="open")  # open, allocated, shipped, closed, cancelled
    sap_order_id = Column(Text)
    sap_status = Column(Text)
    sap_sent_at = Column(DateTime)
    sap_error_msg = Column(Text)
    customer_order_no = Column(Text)
    customer_order_no_last6 = Column(String(6))
    delivery_mode = Column(Text)

    # リレーション
    customer = relationship("Customer", back_populates="orders")
    lines = relationship(
        "OrderLine", back_populates="order", cascade="all, delete-orphan"
    )
    sap_sync_logs = relationship("SapSyncLog", back_populates="order")


class OrderLine(AuditMixin, Base):
    """受注明細"""

    __tablename__ = "order_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    line_no = Column(Integer, nullable=False)
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(Text)
    due_date = Column(Date)
    next_div = Column(Text)

    # フォーキャスト連携メタデータ
    forecast_id = Column(Integer, ForeignKey("forecasts.id"), nullable=True)
    forecast_granularity = Column(Text, nullable=True)
    forecast_match_status = Column(Text, nullable=True)
    forecast_qty = Column(Float, nullable=True)
    forecast_version_no = Column(Integer, nullable=True)
    forecast_matched_at = Column(DateTime, nullable=True)
    forecast_version = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("order_id", "line_no", name="uq_order_line"),
    )

    # リレーション
    order = relationship("Order", back_populates="lines")
    product = relationship("Product", back_populates="order_lines")
    allocations = relationship(
        "Allocation", back_populates="order_line", cascade="all, delete-orphan"
    )
    forecast = relationship("Forecast", back_populates="order_lines")
    warehouse_allocations = relationship(
        "OrderLineWarehouseAllocation",
        back_populates="order_line",
        cascade="all, delete-orphan",
    )


class OrderLineWarehouseAllocation(AuditMixin, Base):
    """
    受注明細の倉庫配分
    各受注明細に対してどの倉庫からいくつ出荷するかを管理
    """

    __tablename__ = "order_line_warehouse_allocation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_line_id: Mapped[int] = mapped_column(
        ForeignKey("order_lines.id"), nullable=False
    )
    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouse.id"), nullable=False
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)

    # リレーション
    order_line: Mapped["OrderLine"] = relationship(
        "OrderLine", back_populates="warehouse_allocations"
    )
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse", back_populates="warehouse_allocations"
    )


class Allocation(AuditMixin, Base):
    """ロット引当"""

    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_line_id = Column(
        Integer, ForeignKey("order_lines.id", ondelete="CASCADE"), nullable=False
    )
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    allocated_qty = Column(Float, nullable=False)
    allocation_date = Column(DateTime, server_default=func.now())
    status = Column(Text, default="active")  # active, shipped, cancelled

    __table_args__ = (
        Index("ix_alloc_ol", "order_line_id"),
        Index("ix_alloc_lot", "lot_id"),
    )

    # リレーション
    order_line = relationship("OrderLine", back_populates="allocations")
    lot = relationship("Lot", back_populates="allocations")


class Shipping(AuditMixin, Base):
    """出荷"""

    __tablename__ = "shipping"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    order_line_id = Column(Integer, ForeignKey("order_lines.id"))
    shipped_qty = Column(Float, nullable=False)
    shipped_date = Column(Date, default=func.current_date())
    shipping_address = Column(Text)
    contact_person = Column(Text)
    contact_phone = Column(Text)
    delivery_time_slot = Column(Text)
    tracking_number = Column(Text)
    carrier = Column(Text)
    carrier_service = Column(Text)
    notes = Column(Text)


class PurchaseRequest(AuditMixin, Base):
    """仮発注（在庫不足時）"""

    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=False)
    requested_qty = Column(Float, nullable=False)
    unit = Column(Text)
    reason_code = Column(Text, nullable=False)  # stock_out, forecast_shortage, etc.
    src_order_line_id = Column(Integer, ForeignKey("order_lines.id"))
    requested_date = Column(Date, server_default=func.current_date())
    desired_receipt_date = Column(Date)
    status = Column(Text, default="draft")  # draft, submitted, approved, ordered
    sap_po_id = Column(Text)
    notes = Column(Text)

    # リレーション
    supplier = relationship("Supplier", back_populates="purchase_requests")


class NextDivMap(AuditMixin, Base):
    """次区マッピング（得意先・納入先・製品ごとの次区設定）。"""

    __tablename__ = "next_div_map"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_code = Column(Text, nullable=False)
    ship_to_code = Column(Text, nullable=False)
    product_code = Column(Text, nullable=False)
    next_div = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "customer_code",
            "ship_to_code",
            "product_code",
            name="uq_next_div_map_customer_ship_to_product",
        ),
    )
