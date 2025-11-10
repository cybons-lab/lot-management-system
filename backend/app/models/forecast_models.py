"""Forecast models aligned with the PostgreSQL schema."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .masters_models import Customer, Product


class Forecast(Base):
    """Demand forecast records."""

    __tablename__ = "forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    forecast_id: Mapped[str] = mapped_column(String(36), nullable=False)
    granularity: Mapped[str] = mapped_column(String(16), nullable=False)
    date_day: Mapped[date | None] = mapped_column(Date)
    date_dekad_start: Mapped[date | None] = mapped_column(Date)
    year_month: Mapped[str | None] = mapped_column(String(7))
    qty_forecast: Mapped[int] = mapped_column(Integer, nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    version_issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source_system: Mapped[str] = mapped_column(String(32), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(50))
    updated_by: Mapped[str | None] = mapped_column(String(50))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("forecast_id", name="forecast_forecast_id_key"),
        CheckConstraint(
            "granularity IN ('daily','dekad','monthly')",
            name="ck_forecast_granularity",
        ),
        CheckConstraint(
            "(granularity='daily' AND date_day IS NOT NULL AND date_dekad_start IS NULL AND year_month IS NULL)"
            " OR (granularity='dekad' AND date_dekad_start IS NOT NULL AND date_day IS NULL AND year_month IS NULL)"
            " OR (granularity='monthly' AND year_month IS NOT NULL AND date_day IS NULL AND date_dekad_start IS NULL)",
            name="ck_forecast_period_key_exclusivity",
        ),
        CheckConstraint("qty_forecast >= 0", name="ck_forecast_qty_nonneg"),
    )

    product: Mapped[Product] = relationship("Product", back_populates="forecasts")
    customer: Mapped[Customer] = relationship("Customer", back_populates="forecasts")
