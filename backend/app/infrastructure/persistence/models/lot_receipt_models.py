"""LotReceipt model (formerly Lot) - represents individual inbound receipts.

B-Plan: The lots table is renamed to lot_receipts.
- current_quantity → received_quantity (入荷数量)
- Links to lot_master via lot_master_id
- receipt_key for unique identification
- Remaining quantity computed from consumed_quantity (backfilled from withdrawal_lines)

Design rationale:
1. なぜ Lot を LotReceipt にリネームするか
   - 「ロット」の意味をより明確に
   - lot_master: ロット番号の名寄せ（1ロット番号=1レコード）
   - lot_receipt: 入荷の実体（1入荷=1レコード）

2. received_quantity の命名
   - 「入荷時の数量」を明確にする
   - current_quantity の誤解（「現在の残量」と混同）を避ける

3. receipt_key の役割
   - UUID で NOT NULL, UNIQUE
   - 入荷ごとの一意識別子
   - 重複登録防止

4. lot_master_id の追加
   - lot_master への外部キー
   - 同一ロット番号の小分け入荷を許可
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.models.base_model import Base


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.inbound_models import ExpectedLot
    from app.infrastructure.persistence.models.inventory_models import Adjustment, StockMovement
    from app.infrastructure.persistence.models.lot_master_model import LotMaster
    from app.infrastructure.persistence.models.lot_reservations_model import LotReservation
    from app.infrastructure.persistence.models.masters_models import (
        Supplier,
        Warehouse,
    )
    from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
    from app.infrastructure.persistence.models.withdrawal_line_model import WithdrawalLine


class LotReceipt(Base):
    """Represents individual inbound receipts (入荷実体).

    Formerly 'Lot' / 'lots' table, now renamed to 'LotReceipt' / 'lot_receipts'.

    DDL: lot_receipts
    Primary key: id (BIGSERIAL)
    Foreign keys: supplier_item_id, warehouse_id, supplier_id, expected_lot_id, lot_master_id
    """

    __tablename__ = "lot_receipts"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    # Lot identification (linked to lot_master)
    lot_master_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lot_master.id", ondelete="RESTRICT"),
        nullable=False,
        comment="lot_masterへのFK",
    )

    # Legacy: lot_number column is removed. Use lot_master.lot_number.
    @property
    def lot_number(self) -> str | None:
        """Get lot number from lot_master (read-only accessor)."""
        return self.lot_master.lot_number if self.lot_master else None

    order_no: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="発注NO（手入力）",
    )

    @hybrid_property
    def current_quantity(self) -> Decimal:
        """Get current remaining quantity (received - consumed)."""
        return self.received_quantity - self.consumed_quantity

    @current_quantity.expression
    def current_quantity_expr(cls):
        return cls.received_quantity - cls.consumed_quantity

    warehouse_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
        comment="倉庫ID",
    )

    supplier_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        comment="仕入先ID（仕入元）",
    )
    expected_lot_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("expected_lots.id", ondelete="SET NULL"),
        nullable=True,
    )

    # B-Plan: supplier_item_id (SSOT for supplier item reference)
    supplier_item_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="SET NULL"),
        nullable=True,
        comment="仕入先品目ID (SSOT)",
    )

    # Receipt details
    received_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Quantity: 入荷数量（初期入荷時の数量、変更されない）
    received_quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3),
        nullable=False,
        server_default=text("0"),
        comment="入荷数量（初期入荷時の数量）",
    )
    consumed_quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3),
        nullable=False,
        server_default=text("0"),
        comment="消費済み数量（出庫確定分の累積）",
    )

    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'active'"))
    lock_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    locked_quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3), nullable=False, server_default=text("0")
    )

    # Inspection certificate fields
    inspection_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'not_required'")
    )
    inspection_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    inspection_cert_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Financial and Logistical details (Phase 1 Expansion)
    shipping_date: Mapped[date | None] = mapped_column(Date, nullable=True, comment="出荷予定日")
    cost_price: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True, comment="仕入単価"
    )
    sales_price: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True, comment="販売単価"
    )
    tax_rate: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True, comment="適用税率"
    )

    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    # Origin tracking fields for non-order receipts
    origin_type: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'adhoc'")
    )
    origin_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Temporary lot registration support
    temporary_lot_key: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=True,
        unique=True,
        comment="仮入庫時の一意識別キー（UUID）",
    )

    # Remarks field (Phase 9.1)
    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="備考（ロットに関する付加情報）",
    )

    # B-Plan: receipt_key for unique identification
    receipt_key: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        server_default=text("gen_random_uuid()"),
        comment="入荷識別UUID（重複防止、NOT NULL）",
    )

    __table_args__ = (
        CheckConstraint("received_quantity >= 0", name="chk_lot_receipts_received_quantity"),
        CheckConstraint("consumed_quantity >= 0", name="chk_lot_receipts_consumed_quantity"),
        CheckConstraint("locked_quantity >= 0", name="chk_lot_receipts_locked_quantity"),
        CheckConstraint(
            "origin_type IN ('order','forecast','sample','safety_stock','adhoc')",
            name="chk_lot_receipts_origin_type",
        ),
        UniqueConstraint("receipt_key", name="uq_lot_receipts_receipt_key"),
        UniqueConstraint("temporary_lot_key", name="uq_lot_receipts_temporary_lot_key"),
        # Partial unique index for expected_lot_id (defined in migration)
        # idx_lot_receipts_number is removed (lot_number column dropped)
        Index("idx_lot_receipts_status", "status"),
        Index("idx_lot_receipts_supplier", "supplier_id"),
        Index("idx_lot_receipts_warehouse", "warehouse_id"),
        Index("idx_lot_receipts_origin_type", "origin_type"),
        Index("idx_lot_receipts_lot_master_warehouse", "lot_master_id", "warehouse_id"),
        Index("idx_lot_receipts_supplier_item", "supplier_item_id"),
        Index(
            "idx_lot_receipts_expiry_date",
            "expiry_date",
            postgresql_where=text("expiry_date IS NOT NULL"),
        ),
        UniqueConstraint(
            "lot_master_id",
            "received_date",
            name="uq_lot_receipts_lot_master_received_date",
        ),
        Index(
            "idx_lot_receipts_temporary_lot_key",
            "temporary_lot_key",
            postgresql_where=text("temporary_lot_key IS NOT NULL"),
        ),
        # Renamed to FEFO allocation and added expiry_date
        Index(
            "idx_lot_receipts_fefo_allocation",
            "supplier_item_id",
            "warehouse_id",
            "expiry_date",  # Added for FEFO
            "received_date",
            "id",
            postgresql_where=text(
                "status = 'active' AND inspection_status IN ('not_required', 'passed')"
            ),
        ),
        {"comment": "ロット入荷実体：個別の入荷記録を管理。在庫の単一ソース"},
    )

    __mapper_args__ = {"version_id_col": version}

    # Relationships
    lot_master: Mapped[LotMaster] = relationship("LotMaster", back_populates="receipts")
    warehouse: Mapped[Warehouse] = relationship("Warehouse", back_populates="lot_receipts")
    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="lot_receipts")
    supplier_item: Mapped[SupplierItem | None] = relationship(
        "SupplierItem", foreign_keys="[LotReceipt.supplier_item_id]", back_populates="lot_receipts"
    )
    expected_lot: Mapped[ExpectedLot | None] = relationship(
        "ExpectedLot", back_populates="lot_receipt", uselist=False
    )
    # B-Plan: stock_history and adjustments from inventory_models.py
    stock_history: Mapped[list[StockMovement]] = relationship(
        "StockMovement", back_populates="lot", cascade="all, delete-orphan"
    )
    adjustments: Mapped[list[Adjustment]] = relationship(
        "Adjustment", back_populates="lot", cascade="all, delete-orphan"
    )
    reservations: Mapped[list[LotReservation]] = relationship(
        "LotReservation", back_populates="lot_receipt", cascade="all, delete-orphan"
    )
    withdrawal_lines: Mapped[list[WithdrawalLine]] = relationship(
        "WithdrawalLine", back_populates="lot_receipt", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<LotReceipt(id={self.id}, lot_number={self.lot_number}, "
            f"received_qty={self.received_quantity})>"
        )
