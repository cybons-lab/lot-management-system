"""System-related models (Logs, etc.).

DDL: system_client_logs
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


class ClientLog(Base):
    """Client-side logs stored on server (クライアントログ).

    DDL: system_client_logs
    """

    __tablename__ = "system_client_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    level: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'info'")
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        Index("idx_system_client_logs_created_at", "created_at"),
        Index("idx_system_client_logs_user_id", "user_id"),
    )
