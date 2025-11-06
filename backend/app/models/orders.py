# backend/app/models/orders.py
"""
販売関連のモデル定義（修正版）
受注、受注明細、引当、出荷、倉庫配分
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

# 🔧 修正: 型チェック時のみインポート（循環インポートを回避）
if TYPE_CHECKING:
    from .inventory import Lot, StockMovement
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
    lines = relationship("OrderLine", back_populates="order", cascade="all, delete-orphan")
    sap_sync_logs = relationship("SapSyncLog", back_populates="order")


class OrderLine(AuditMixin, Base):
    """受注明細"""

    __tablename__ = "order_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    line_no = Column(Integer, nullable=False)
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(Text, nullable=True)
    status = Column(Text, default="open")
    delivery_date = Column(Date, nullable=True)
    forecast_id = Column(Integer, ForeignKey("forecasts.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("order_id", "line_no", name="uq_order_line"),
        Index("ix_order_lines_order_id", "order_id"),
        Index("ix_order_lines_product_code", "product_code"),
    )

    # リレーション
    order = relationship("Order", back_populates="lines")
    product = relationship("Product", back_populates="order_lines")
    allocations = relationship("Allocation", back_populates="order_line", cascade="all, delete-orphan")
    warehouse_allocations = relationship(
        "OrderLineWarehouseAllocation",
        back_populates="order_line",
        cascade="all, delete-orphan",
    )
    forecast = relationship("Forecast", back_populates="order_lines")


class OrderLineWarehouseAllocation(AuditMixin, Base):
    """受注明細の倉庫別配分"""

    __tablename__ = "order_line_warehouse_allocation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_line_id: Mapped[int] = mapped_column(ForeignKey("order_lines.id"), nullable=False)
    warehouse_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("warehouses.id"),
        nullable=False,
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("order_line_id", "warehouse_id", name="uq_orderline_warehouse"),
        Index("ix_olwa_order_line_id", "order_line_id"),
        Index("ix_olwa_warehouse_id", "warehouse_id"),
        CheckConstraint("quantity > 0", name="ck_olwa_quantity_positive"),
    )

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
    destination_id = Column(BigInteger, ForeignKey("delivery_places.id"), nullable=True)
    allocation_date = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_allocations_order_line", "order_line_id"),
        Index("ix_allocations_lot", "lot_id"),
    )

    # リレーション
    order_line: Mapped["OrderLine"] = relationship("OrderLine", back_populates="allocations")
    lot: Mapped["Lot"] = relationship("Lot", back_populates="allocations")
    destination = relationship("DeliveryPlace", back_populates="allocations")


class Shipping(AuditMixin, Base):
    """出荷実績"""

    __tablename__ = "shipping"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    order_line_id = Column(Integer, ForeignKey("order_lines.id"), nullable=True)
    shipped_quantity = Column(Float, nullable=False)
    shipping_date = Column(Date, nullable=False)
    destination_code = Column(Text, nullable=True)
    destination_name = Column(Text, nullable=True)
    destination_address = Column(Text, nullable=True)
    contact_person = Column(Text, nullable=True)
    contact_phone = Column(Text, nullable=True)
    delivery_time_slot = Column(Text, nullable=True)
    tracking_number = Column(Text, nullable=True)
    carrier = Column(Text, nullable=True)
    carrier_service = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)


class PurchaseRequest(AuditMixin, Base):
    """発注依頼"""

    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_code = Column(Text, ForeignKey("products.product_code"), nullable=False)
    supplier_code = Column(Text, ForeignKey("suppliers.supplier_code"), nullable=False)
    requested_qty = Column(Float, nullable=False)
    requested_date = Column(Date, nullable=False)
    status = Column(Text, default="pending")


class NextDivMap(AuditMixin, Base):
    """次工程区分マッピング"""

    __tablename__ = "next_div_map"

    id = Column(Integer, primary_key=True, autoincrement=True)
    from_customer = Column(Text, nullable=False)
    from_next_div = Column(Text, nullable=False)
    target_supplier = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("from_customer", "from_next_div", name="uq_next_div_map"),
    )
