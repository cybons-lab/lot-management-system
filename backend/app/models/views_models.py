"""Database view models (read-only)."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Column, Date, Integer, Numeric, String, Table
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import Base


class VLotAvailableQty(Base):
    """
    v_lot_available_qty ビュー（読み取り専用）.

    利用可能なロットの数量情報を提供するビュー。
    - 期限切れのロットを除外
    - ロックされていないロット
    - 利用可能なロットのみ
    """

    __tablename__ = "v_lot_available_qty"
    __table_args__ = {"info": {"is_view": True}}

    lot_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer)
    warehouse_id: Mapped[int] = mapped_column(Integer)
    available_qty: Mapped[Decimal] = mapped_column(Numeric(15, 4))
    receipt_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    lot_status: Mapped[str] = mapped_column(String)
    is_locked: Mapped[bool]


class VOrderLineContext(Base):
    """
    v_order_line_context ビュー（読み取り専用）.

    注文行のコンテキスト情報を提供するビュー。
    """

    __tablename__ = "v_order_line_context"
    __table_args__ = {"info": {"is_view": True}}

    order_line_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(Integer)
    customer_id: Mapped[int | None] = mapped_column(Integer)
    product_id: Mapped[int | None] = mapped_column(Integer)
    warehouse_id: Mapped[int | None] = mapped_column(Integer)
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4))


class VCandidateLotsByOrderLine(Base):
    """
    v_candidate_lots_by_order_line ビュー（読み取り専用）.

    注文行ごとの候補ロット一覧を提供するビュー。
    FEFO（先入先出）順にソートされている。
    """

    __tablename__ = "v_candidate_lots_by_order_line"
    __table_args__ = {"info": {"is_view": True}}

    # 複合主キー（order_line_id + lot_id）
    order_line_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lot_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer)
    warehouse_id: Mapped[int | None] = mapped_column(Integer)
    available_qty: Mapped[Decimal] = mapped_column(Numeric(15, 4))
    receipt_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
