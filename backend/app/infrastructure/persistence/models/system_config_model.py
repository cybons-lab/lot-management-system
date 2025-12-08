"""System configuration model (システム設定).

DDL: system_configs
All models strictly follow the DDL v2.2 (lot_management_ddl_v2_2_id.sql).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import Base


class SystemConfig(Base):
    """System configuration table (システム設定).

    DDL: system_configs
    Primary key: id (BIGSERIAL)
    """

    __tablename__ = "system_configs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    config_key: Mapped[str] = mapped_column(String(100), nullable=False)
    config_value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("config_key", name="uq_system_configs_key"),
        Index("idx_system_configs_key", "config_key"),
    )
