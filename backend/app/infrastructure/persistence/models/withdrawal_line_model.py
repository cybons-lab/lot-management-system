"""WithdrawalLine model for FIFO withdrawal tracking.

B-Plan: Records which lot_receipts were consumed by a withdrawal.
Enables multiple receipts to be used for a single withdrawal (FIFO).

Design rationale:
1. なぜ withdrawal_lines が必要か
   - FIFO出庫で複数の lot_receipt から消費する場合に対応
   - 1出庫 = N明細 で「どのreceiptから何個出庫したか」を記録

2. 在庫残量の計算
   - lot_receipts.received_quantity - SUM(withdrawal_lines.quantity) = 残量
   - 集計で算出（将来キャッシュ化への備えあり）

3. lot_receipt_id の ON DELETE RESTRICT
   - 出庫履歴がある lot_receipt は削除不可
   - データ整合性を保証
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.models.base_model import Base


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
    from app.infrastructure.persistence.models.withdrawal_models import Withdrawal


class WithdrawalLine(Base):
    """Withdrawal line - records consumption from a specific lot_receipt.

    Enables FIFO withdrawals where multiple receipts may be consumed.
    """

    __tablename__ = "withdrawal_lines"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # Parent withdrawal
    withdrawal_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("withdrawals.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Source receipt
    lot_receipt_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lot_receipts.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Quantity consumed from this receipt
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3),
        nullable=False,
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    # Relationships
    withdrawal: Mapped[Withdrawal] = relationship(
        "Withdrawal",
        back_populates="lines",
    )
    lot_receipt: Mapped[LotReceipt] = relationship(
        "LotReceipt",
        back_populates="withdrawal_lines",
    )

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_withdrawal_lines_quantity"),
        Index("idx_withdrawal_lines_withdrawal", "withdrawal_id"),
        Index("idx_withdrawal_lines_lot_receipt", "lot_receipt_id"),
        Index("idx_withdrawal_lines_receipt_date", "lot_receipt_id", "created_at"),
        {"comment": "出庫明細 - どのreceiptから何個出庫したか"},
    )

    def __repr__(self) -> str:
        return (
            f"<WithdrawalLine(id={self.id}, withdrawal_id={self.withdrawal_id}, "
            f"lot_receipt_id={self.lot_receipt_id}, quantity={self.quantity})>"
        )
