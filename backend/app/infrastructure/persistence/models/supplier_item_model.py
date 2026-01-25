"""SupplierItem model (formerly ProductSupplier) for supplier-product relationships.

仕入先品目マスタ: 仕入先から仕入れる品目の情報を管理。
- maker_part_no: メーカー品番（仕入先の品番）
- product_id: 内部製品マスタへの参照
- is_primary: 主要仕入先フラグ（1製品につき1つ）

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
    from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
    from app.infrastructure.persistence.models.masters_models import (
        CustomerItem,
        Product,
        Supplier,
    )


class SupplierItem(SoftDeleteMixin, Base):
    """仕入先品目マスタ (旧 ProductSupplier).

    仕入先から仕入れる品目の情報を管理。
    1製品に対して複数の仕入先を紐づけ可能。is_primary=True の仕入先が主要仕入先（1製品につき1つ）。

    DDL: supplier_items
    Primary key: id (BIGSERIAL)
    Business key: UNIQUE(supplier_id, maker_part_no)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "supplier_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=True,
    )
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
    base_unit: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="基本単位（在庫単位）",
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
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    lead_time_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="リードタイム（日）",
    )
    display_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        comment="表示名（省略時はメーカー品番を使用）",
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
        # 1製品につき1つのis_primary=trueを保証
        Index(
            "idx_supplier_items_is_primary",
            "product_id",
            unique=True,
            postgresql_where=text("is_primary = true"),
        ),
        Index("idx_supplier_items_valid_to", "valid_to"),
        Index("idx_supplier_items_maker_part", "maker_part_no"),
        Index("idx_supplier_items_product", "product_id"),
        Index("idx_supplier_items_supplier", "supplier_id"),
    )

    # Relationships
    product: Mapped[Product] = relationship(
        "Product",
        back_populates="supplier_items",
    )
    supplier: Mapped[Supplier] = relationship(
        "Supplier",
        back_populates="supplier_items",
    )
    customer_items: Mapped[list[CustomerItem]] = relationship(
        "CustomerItem",
        back_populates="supplier_item",
    )
    lot_receipts: Mapped[list[LotReceipt]] = relationship(
        "LotReceipt",
        back_populates="supplier_item",
    )

    def __repr__(self) -> str:
        return (
            f"<SupplierItem(id={self.id}, supplier_id={self.supplier_id}, "
            f"maker_part_no={self.maker_part_no}, is_primary={self.is_primary})>"
        )


# Backward compatibility alias
ProductSupplier = SupplierItem
