"""Execution queue models."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.models.base_model import Base


class ExecutionQueue(Base):
    """実行キューテーブル.

    SmartRead OCR, RPA, SAP同期などの重い処理を管理する。
    """

    __tablename__ = "execution_queue"
    __table_args__ = (
        Index(
            "ix_execution_queue_running_unique",
            "resource_type",
            "resource_id",
            unique=True,
            postgresql_where=text("status = 'running'"),
        ),
        Index("ix_execution_queue_lookup", "resource_type", "resource_id", "status"),
        Index("ix_execution_queue_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # リソース情報
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # 状態管理
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default=text("'pending'")
    )  # pending, running, completed, failed, cancelled

    # 実行要求者
    requested_by_user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False
    )

    # パラメータ
    parameters: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'")
    )

    # 優先度・順序
    priority: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    position: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 実行タイムスタンプ
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 設定・結果
    timeout_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=300, server_default=text("300")
    )
    result_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 作成日時
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
