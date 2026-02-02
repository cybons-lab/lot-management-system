"""Order Groups models - 業務キー中心の受注グループ管理.

業務キー方針に基づく受注論理グループ。
「得意先 × 製品 × 受注日」を業務キーとして扱う。
"""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:
    from .masters_models import Customer
    from .orders_models import OrderLine
    from .supplier_item_model import SupplierItem


class OrderGroup(Base):
    """受注グループ（論理ヘッダ）.

    業務キー: customer_id × product_group_id × order_date

    仮想的な受注ナンバーを別途採番するのではなく、
    「得意先 × 製品グループ × 受注日」を1つの受注グループとして扱う。
    """

    __tablename__ = "order_groups"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    product_group_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="RESTRICT"),
        nullable=False,
    )
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    source_file_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="取り込み元ファイル名"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint(
            "customer_id",
            "product_group_id",
            "order_date",
            name="uq_order_groups_business_key",
        ),
        Index("idx_order_groups_customer", "customer_id"),
        Index("idx_order_groups_product_group", "product_group_id"),
        Index("idx_order_groups_date", "order_date"),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer")
    supplier_item: Mapped[SupplierItem] = relationship("SupplierItem")
    order_lines: Mapped[list[OrderLine]] = relationship(
        "OrderLine",
        back_populates="order_group",
        foreign_keys="OrderLine.order_group_id",
    )
