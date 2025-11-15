"""Logging and integration models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .orders_models import Order


class OperationLog(Base):
    """操作ログ（監査証跡）."""

    __tablename__ = "operation_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL")
    )
    operation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_table: Mapped[str] = mapped_column(String(50), nullable=False)
    target_id: Mapped[int | None] = mapped_column(BigInteger)
    changes: Mapped[dict | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "operation_type IN ('create', 'update', 'delete', 'login', 'logout', 'export')",
            name="chk_operation_logs_type",
        ),
    )


class MasterChangeLog(Base):
    """マスタ変更履歴."""

    __tablename__ = "master_change_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    table_name: Mapped[str] = mapped_column(String(50), nullable=False)
    record_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    change_type: Mapped[str] = mapped_column(String(20), nullable=False)
    old_values: Mapped[dict | None] = mapped_column(JSONB)
    new_values: Mapped[dict | None] = mapped_column(JSONB)
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
    )


class BusinessRule(Base):
    """業務ルール設定."""

    __tablename__ = "business_rules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rule_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    rule_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False)
    rule_parameters: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "rule_type IN ('allocation', 'expiry_warning', 'kanban', 'other')",
            name="chk_business_rules_type",
        ),
    )


class BatchJob(Base):
    """バッチジョブ管理."""

    __tablename__ = "batch_jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_name: Mapped[str] = mapped_column(String(100), nullable=False)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'pending'")
    )
    parameters: Mapped[dict | None] = mapped_column(JSONB)
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
    )


class InboundSubmission(Base):
    """Inbound submission logs."""

    __tablename__ = "inbound_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    submission_id: Mapped[str | None] = mapped_column(Text)
    source_uri: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'ocr'"))
    operator: Mapped[str | None] = mapped_column(Text)
    submission_date: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str | None] = mapped_column(Text)
    total_records: Mapped[int | None] = mapped_column(Integer)
    processed_records: Mapped[int | None] = mapped_column(Integer)
    failed_records: Mapped[int | None] = mapped_column(Integer)
    skipped_records: Mapped[int | None] = mapped_column(Integer)
    error_details: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(String(50))
    updated_by: Mapped[str | None] = mapped_column(String(50))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))

    __table_args__ = (
        UniqueConstraint("submission_id", name="ocr_submissions_submission_id_key"),
        CheckConstraint(
            "source IN ('ocr','manual','edi')",
            name="ck_inbound_submissions_source",
        ),
    )


class SapSyncLog(Base):
    """SAP synchronisation logs."""

    __tablename__ = "sap_sync_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"))
    payload: Mapped[str | None] = mapped_column(Text)
    result: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(Text)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(String(50))
    updated_by: Mapped[str | None] = mapped_column(String(50))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))

    order: Mapped[Order | None] = relationship("Order", back_populates="sap_sync_logs")


OcrSubmission = InboundSubmission
