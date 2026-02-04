"""Maker (manufacturer) master model.

メーカーマスタ（層別コード統合）
旧 layer_code_mappings をリネーム・拡張したテーブル。
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Index, String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import Base
from .soft_delete_mixin import SoftDeleteMixin


class Maker(SoftDeleteMixin, Base):
    """Makers master table (メーカーマスタ).

    旧 layer_code_mappings を makers にリネーム・拡張。
    maker_code = layer_code（層別コード）として統合。

    DDL: makers
    Primary key: id (BIGSERIAL)
    Supports soft delete via valid_to column.
    """

    __tablename__ = "makers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    maker_code: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="メーカーコード（= 層別コード）"
    )
    maker_name: Mapped[str] = mapped_column(String(200), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="表示名")
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="短縮表示名")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, comment="備考")
    valid_to: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=text("'9999-12-31'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("maker_code", name="uq_makers_maker_code"),
        Index("idx_makers_valid_to", "valid_to"),
    )
