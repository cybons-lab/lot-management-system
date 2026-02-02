"""SupplierItem model for managing supplier products.

仕入先品目マスタ: 仕入先から仕入れる品目の情報を管理。
2コード体系における「メーカー品番」の実体。

- maker_part_no: メーカー品番（仕入先の品番、在庫実体キー）
- display_name: 製品名
- base_unit: 基本単位（在庫単位）
- internal_unit, external_unit, qty_per_internal_unit: 単位変換情報
- consumption_limit_days: 消費期限日数
- requires_lot_number: ロット番号管理要否

Business key: UNIQUE(supplier_id, maker_part_no)
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.base_model import Base
from app.infrastructure.persistence.models.soft_delete_mixin import SoftDeleteMixin


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.forecast_models import ForecastCurrent
    from app.infrastructure.persistence.models.inbound_models import InboundPlanLine
    from app.infrastructure.persistence.models.lot_master_model import LotMaster
    from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
    from app.infrastructure.persistence.models.masters_models import (
        CustomerItem,
        Supplier,
    )
    from app.infrastructure.persistence.models.orders_models import OrderLine


class SupplierItem(SoftDeleteMixin, Base):
    """仕入先品目マスタ (メーカー品番マスタ).

    2コード体系における「メーカー品番」の実体。
    仕入先から仕入れる品目の情報（品番、単位、リードタイムなど）を管理。

    DDL: supplier_items
    Primary key: id (BIGSERIAL)
    Business key: UNIQUE(supplier_id, maker_part_no)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "supplier_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    supplier_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    maker_part_no: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="メーカー品番（仕入先の品番）",
    )
    display_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="製品名（必須）",
    )
    base_unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="基本単位（在庫単位、必須）",
    )
    # Unit conversion fields
    internal_unit: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="社内単位/引当単位（例: CAN）",
    )
    external_unit: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="外部単位/表示単位（例: KG）",
    )
    qty_per_internal_unit: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 4),
        nullable=True,
        comment="内部単位あたりの数量（例: 1 CAN = 20.0 KG）",
    )
    # Product attributes
    consumption_limit_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="消費期限日数",
    )
    requires_lot_number: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="ロット番号管理が必要",
    )
    net_weight: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 3),
        nullable=True,
        comment="正味重量",
    )
    weight_unit: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="重量単位",
    )
    lead_time_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="リードタイム（日）",
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="備考",
    )
    valid_to: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        server_default=text("'9999-12-31'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    __table_args__ = (
        # Business key: supplier_id + maker_part_no でユニーク
        UniqueConstraint(
            "supplier_id",
            "maker_part_no",
            name="uq_supplier_items_supplier_maker",
        ),
        Index("idx_supplier_items_valid_to", "valid_to"),
        Index("idx_supplier_items_maker_part", "maker_part_no"),
        Index("idx_supplier_items_supplier", "supplier_id"),
    )

    # Relationships
    supplier: Mapped[Supplier] = relationship(
        "Supplier",
        back_populates="supplier_items",
    )
    # Phase1: Only one customer_items relationship remains (via supplier_item_id)
    customer_items: Mapped[list[CustomerItem]] = relationship(
        "CustomerItem",
        foreign_keys="[CustomerItem.supplier_item_id]",
        back_populates="supplier_item",
    )
    lot_receipts: Mapped[list[LotReceipt]] = relationship(
        "LotReceipt",
        foreign_keys="[LotReceipt.supplier_item_id]",
        back_populates="supplier_item",
    )

    # Additional relationships from removed ProductGroup model (via product_group_id)
    forecast_current: Mapped[list[ForecastCurrent]] = relationship(
        "ForecastCurrent",
        foreign_keys="[ForecastCurrent.supplier_item_id]",
        back_populates="supplier_item",
    )
    lot_masters: Mapped[list[LotMaster]] = relationship(
        "LotMaster",
        foreign_keys="[LotMaster.supplier_item_id]",
        back_populates="supplier_item",
    )
    order_lines: Mapped[list[OrderLine]] = relationship(
        "OrderLine",
        foreign_keys="[OrderLine.supplier_item_id]",
        back_populates="supplier_item",
    )
    inbound_plan_lines: Mapped[list[InboundPlanLine]] = relationship(
        "InboundPlanLine",
        foreign_keys="[InboundPlanLine.supplier_item_id]",
        back_populates="supplier_item",
    )

    def __repr__(self) -> str:
        return (
            f"<SupplierItem(id={self.id}, supplier_id={self.supplier_id}, "
            f"maker_part_no={self.maker_part_no}, display_name={self.display_name})>"
        )


# Backward compatibility alias
ProductSupplier = SupplierItem
