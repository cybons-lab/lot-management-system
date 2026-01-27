"""LotMaster model for lot number consolidation.

B-Plan: Lot number consolidation master - allows multiple receipts per lot number.

Design rationale:
1. なぜ lot_master を分離するのか
   - 同一ロット番号の小分け入荷を許可するため
   - lot_number + product_group_id でユニーク、複数の lot_receipts が紐づく

2. supplier_id の扱い
   - ユニーク制約には含めない（NULLになるケースがあるため）
   - サンプル/内部移動では supplier_id = NULL

3. first_receipt_date / latest_expiry_date
   - 表示用のキャッシュ値
   - lot_receipts の MIN/MAX から自動更新可能（トリガーまたはアプリ側）
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.models.base_model import Base


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
    from app.infrastructure.persistence.models.masters_models import ProductGroup, Supplier


class LotMaster(Base):
    """Lot number consolidation master.

    Allows multiple receipts (lot_receipts) to share the same lot number.
    Unique constraint: (lot_number, product_group_id)
    """

    __tablename__ = "lot_master"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # Lot identification
    lot_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="ロット番号（仕入先発番）",
    )
    product_group_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("product_groups.id", ondelete="RESTRICT"),
        nullable=False,
    )
    supplier_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Aggregated values
    total_quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3),
        nullable=False,
        server_default=text("0"),
        comment="合計入荷数量（受け入れ時）",
    )

    # Cached aggregate values (for display)
    first_receipt_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="初回入荷日（自動更新）",
    )
    latest_expiry_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="傘下receiptの最長有効期限（表示用）",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    # Relationships
    product_group: Mapped[ProductGroup] = relationship("ProductGroup", back_populates="lot_masters")
    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="lot_masters")
    receipts: Mapped[list[LotReceipt]] = relationship(
        "LotReceipt",
        back_populates="lot_master",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "lot_number", "product_group_id", name="uq_lot_master_number_product_group"
        ),
        Index("idx_lot_master_product_group", "product_group_id"),
        Index("idx_lot_master_lot_number", "lot_number"),
        Index("idx_lot_master_supplier", "supplier_id"),
        {"comment": "ロット番号名寄せマスタ - 同一ロット番号の複数入荷を許可"},
    )

    def __repr__(self) -> str:
        return (
            f"<LotMaster(id={self.id}, lot_number={self.lot_number}, "
            f"product_group_id={self.product_group_id})>"
        )

    def update_aggregate_dates(self) -> None:
        """Update cached aggregate dates from receipts.

        Should be called after adding/removing receipts.
        """
        if not self.receipts:
            self.first_receipt_date = None
            self.latest_expiry_date = None
            return

        received_dates = [r.received_date for r in self.receipts if r.received_date]
        expiry_dates = [r.expiry_date for r in self.receipts if r.expiry_date]

        self.first_receipt_date = min(received_dates) if received_dates else None
        self.latest_expiry_date = max(expiry_dates) if expiry_dates else None
