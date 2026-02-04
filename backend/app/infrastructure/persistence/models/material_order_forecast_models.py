"""Material Order Forecast models.

材料発注フォーキャストデータモデル。
CSVの全データを1テーブルに保存し、既存マスタ（customer_items, makers, warehouses）と
LEFT JOIN で紐づけ。
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover
    from .auth_models import User
    from .maker_models import Maker
    from .masters_models import CustomerItem, Warehouse


class MaterialOrderForecast(Base):
    """Material Order Forecast data (材料発注フォーキャスト).

    CSV全データを保存し、既存マスタと LEFT JOIN で紐づけ。
    マスタにデータがなくても警告のみで保存継続。

    DDL: material_order_forecasts
    Primary key: id (BIGSERIAL)
    Foreign keys:
        customer_item_id -> customer_items(id) (LEFT JOIN)
        warehouse_id -> warehouses(id) (LEFT JOIN)
        maker_id -> makers(id) (LEFT JOIN)
        imported_by -> users(id) (LEFT JOIN)
    """

    __tablename__ = "material_order_forecasts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    # 対象月（YYYY-MM形式）
    target_month: Mapped[str] = mapped_column(String(7), nullable=False)

    # 既存マスタFK（LEFT JOIN用、NULL許可）
    customer_item_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("customer_items.id", ondelete="SET NULL"),
        nullable=True,
        comment="得意先品番ID（LEFT JOIN）",
    )
    warehouse_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("warehouses.id", ondelete="SET NULL"),
        nullable=True,
        comment="倉庫ID（LEFT JOIN）",
    )
    maker_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("makers.id", ondelete="SET NULL"),
        nullable=True,
        comment="メーカーID（LEFT JOIN）",
    )

    # CSV生データ（全列保存）
    material_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="材質コード（= 得意先品番）"
    )
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="単位")
    warehouse_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="倉庫コード"
    )
    jiku_code: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="次区コード（必須、納入先マスタとLEFT JOIN）"
    )
    delivery_place: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="納入先")
    support_division: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="支給先"
    )
    procurement_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="支購区分"
    )
    maker_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="メーカーコード（= 層別コード）"
    )
    maker_name: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="メーカー名")
    material_name: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="材質名")

    # 数量データ（月次集計）
    delivery_lot: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 3), nullable=True, comment="納入ロット"
    )
    order_quantity: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 3), nullable=True, comment="発注"
    )
    month_start_instruction: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 3), nullable=True, comment="月初指示"
    )
    manager_name: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="担当者名")
    monthly_instruction_quantity: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 3), nullable=True, comment="月間指示数量"
    )
    next_month_notice: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 3), nullable=True, comment="次月内示"
    )

    # 日別・期間別数量（JSONB）
    daily_quantities: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment='日別数量（1-31日）例: {"1": 10, "2": 20, ...}'
    )
    period_quantities: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment='期間別数量 例: {"1": 50, ..., "中旬": 200, "下旬": 300}'
    )

    # スナップショット情報
    snapshot_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    imported_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="インポート実行ユーザーID",
    )
    source_file_name: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="元CSVファイル名"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        Index("idx_mof_target_month", "target_month"),
        Index("idx_mof_material_code", "material_code"),
        Index("idx_mof_maker_code", "maker_code"),
        Index("idx_mof_jiku_code", "jiku_code"),
        Index("idx_mof_customer_item", "customer_item_id"),
        Index("idx_mof_maker", "maker_id"),
        Index("idx_mof_snapshot", "snapshot_at"),
        Index(
            "ux_mof_unique",
            "target_month",
            "material_code",
            "jiku_code",
            "maker_code",
            unique=True,
        ),
    )

    # Relationships (LEFT JOIN)
    customer_item: Mapped[CustomerItem | None] = relationship(
        "CustomerItem", foreign_keys=[customer_item_id]
    )
    warehouse: Mapped[Warehouse | None] = relationship("Warehouse", foreign_keys=[warehouse_id])
    maker: Mapped[Maker | None] = relationship("Maker", foreign_keys=[maker_id])
    imported_by_user: Mapped[User | None] = relationship("User", foreign_keys=[imported_by])
