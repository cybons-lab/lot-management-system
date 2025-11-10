"""Logging and integration models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .orders_models import Order


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
