"""Logging and integration models (DDL v2.2).

All models strictly follow the DDL as the single source of truth.
Legacy models (InboundSubmission/OcrSubmission, SapSyncLog) have been removed.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import Base


class OperationLog(Base):
    """操作ログ（監査証跡）.

    DDL: operation_logs
    Primary key: id (BIGSERIAL)
    Foreign key: user_id -> users(id)
    """

    __tablename__ = "operation_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL")
    )
    operation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_table: Mapped[str] = mapped_column(String(50), nullable=False)
    target_id: Mapped[int | None] = mapped_column(BigInteger)
    changes: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    ip_address: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "operation_type IN ('create', 'update', 'delete', 'login', 'logout', 'export')",
            name="chk_operation_logs_type",
        ),
        Index("idx_operation_logs_user", "user_id"),
        Index("idx_operation_logs_type", "operation_type"),
        Index("idx_operation_logs_table", "target_table"),
        Index("idx_operation_logs_created", "created_at"),
    )


class MasterChangeLog(Base):
    """マスタ変更履歴.

    DDL: master_change_logs
    Primary key: id (BIGSERIAL)
    Foreign key: changed_by -> users(id)
    """

    __tablename__ = "master_change_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    table_name: Mapped[str] = mapped_column(String(50), nullable=False)
    record_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    change_type: Mapped[str] = mapped_column(String(20), nullable=False)
    old_values: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    new_values: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    changed_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "change_type IN ('insert', 'update', 'delete')",
            name="chk_master_change_logs_type",
        ),
        Index("idx_master_change_logs_table", "table_name"),
        Index("idx_master_change_logs_record", "record_id"),
        Index("idx_master_change_logs_user", "changed_by"),
        Index("idx_master_change_logs_changed", "changed_at"),
    )


class BusinessRule(Base):
    """業務ルール設定.

    DDL: business_rules
    Primary key: id (BIGSERIAL)
    """

    __tablename__ = "business_rules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rule_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    rule_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False)
    rule_parameters: Mapped[dict] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "rule_type IN ('allocation', 'expiry_warning', 'kanban', 'inventory_sync_alert', 'other')",
            name="chk_business_rules_type",
        ),
        Index("idx_business_rules_code", "rule_code"),
        Index("idx_business_rules_type", "rule_type"),
        Index(
            "idx_business_rules_active",
            "is_active",
            postgresql_where=text("is_active = TRUE"),
        ),
    )


class BatchJob(Base):
    """バッチジョブ管理.

    DDL: batch_jobs
    Primary key: id (BIGSERIAL)
    """

    __tablename__ = "batch_jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_name: Mapped[str] = mapped_column(String(100), nullable=False)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'pending'")
    )
    parameters: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    result_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'running', 'completed', 'failed')",
            name="chk_batch_jobs_status",
        ),
        CheckConstraint(
            "job_type IN ('allocation_suggestion', 'allocation_finalize', "
            "'inventory_sync', 'data_import', 'report_generation')",
            name="chk_batch_jobs_type",
        ),
        Index("idx_batch_jobs_status", "status"),
        Index("idx_batch_jobs_type", "job_type"),
        Index("idx_batch_jobs_created", "created_at"),
    )
