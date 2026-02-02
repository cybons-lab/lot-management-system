"""Cloud Flow models for job execution management."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.models.base_model import Base


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.auth_models import User


class CloudFlowJobStatus:
    """Cloud Flow Job status constants."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class CloudFlowConfig(Base):
    """Cloud Flowの設定（URL等）を保存.

    同じURLを複数回呼び出す場合に、設定として登録しておく。
    """

    __tablename__ = "cloud_flow_configs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    config_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    config_value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )


class CloudFlowJob(Base):
    """Cloud Flow ジョブ実行履歴.

    ジョブキュー形式で実行を管理。
    成功/失敗の結果も記録。
    """

    __tablename__ = "cloud_flow_jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'progress_download' etc.
    status: Mapped[str] = mapped_column(
        String(30), server_default=text("'pending'"), nullable=False
    )

    # 実行パラメータ
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    # 実行情報
    requested_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    requested_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 結果（成功/失敗記録）
    result_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    __table_args__ = (
        Index("idx_cloud_flow_jobs_type", "job_type"),
        Index("idx_cloud_flow_jobs_status", "status"),
        Index("idx_cloud_flow_jobs_requested_at", "requested_at"),
    )

    # Relationships
    requested_by_user: Mapped[User | None] = relationship(
        "User", foreign_keys=[requested_by_user_id]
    )
