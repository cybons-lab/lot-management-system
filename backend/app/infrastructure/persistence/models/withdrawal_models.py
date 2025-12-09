"""Withdrawal models for manual lot withdrawal.

出庫（受注外出庫）の記録用モデル。
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover
    from .auth_models import User
    from .inventory_models import Lot
    from .masters_models import Customer, DeliveryPlace


class WithdrawalType(str, PyEnum):
    """出庫タイプ."""

    ORDER_MANUAL = "order_manual"  # 受注（手動）
    INTERNAL_USE = "internal_use"  # 社内使用
    DISPOSAL = "disposal"  # 廃棄処理
    RETURN = "return"  # 返品対応
    SAMPLE = "sample"  # サンプル出荷
    OTHER = "other"  # その他


class Withdrawal(Base):
    """出庫記録（受注外出庫）.

    DDL: withdrawals
    Primary key: id (BIGSERIAL)
    Foreign keys: lot_id, customer_id, delivery_place_id, withdrawn_by
    """

    __tablename__ = "withdrawals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    lot_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    withdrawal_type: Mapped[WithdrawalType] = mapped_column(String(20), nullable=False)
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    delivery_place_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="RESTRICT"),
        nullable=False,
    )
    ship_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    withdrawn_by: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    withdrawn_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_withdrawals_quantity"),
        CheckConstraint(
            "withdrawal_type IN ('order_manual','internal_use','disposal','return','sample','other')",
            name="chk_withdrawals_type",
        ),
        Index("idx_withdrawals_lot", "lot_id"),
        Index("idx_withdrawals_customer", "customer_id"),
        Index("idx_withdrawals_date", "ship_date"),
        Index("idx_withdrawals_type", "withdrawal_type"),
    )

    # Relationships
    lot: Mapped[Lot] = relationship("Lot")
    customer: Mapped[Customer] = relationship("Customer")
    delivery_place: Mapped[DeliveryPlace] = relationship("DeliveryPlace")
    user: Mapped[User] = relationship("User")
