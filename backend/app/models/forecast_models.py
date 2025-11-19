"""Forecast models for v2.4 schema with forecast_current and forecast_history tables."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .masters_models import Customer, DeliveryPlace, Product


class ForecastCurrent(Base):
    """Current active forecast data.

    Each row represents a single forecast entry for customer × delivery_place × product × date.
    When a new snapshot is imported, existing rows are moved to forecast_history.
    """

    __tablename__ = "forecast_current"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    delivery_place_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="RESTRICT"),
        nullable=False,
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)
    forecast_quantity: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    snapshot_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index(
            "ix_forecast_current_key",
            "customer_id",
            "delivery_place_id",
            "product_id",
        ),
        Index(
            "ux_forecast_current_unique",
            "customer_id",
            "delivery_place_id",
            "product_id",
            "forecast_date",
            unique=True,
        ),
    )

    customer: Mapped[Customer] = relationship("Customer", back_populates="forecast_current")
    delivery_place: Mapped[DeliveryPlace] = relationship(
        "DeliveryPlace", back_populates="forecast_current"
    )
    product: Mapped[Product] = relationship("Product", back_populates="forecast_current")


class ForecastHistory(Base):
    """Historical forecast data archived when new snapshots are imported.

    Structure mirrors forecast_current with additional archived_at timestamp.
    """

    __tablename__ = "forecast_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    delivery_place_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    product_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)
    forecast_quantity: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    snapshot_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    archived_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    __table_args__ = (
        Index(
            "ix_forecast_history_key",
            "customer_id",
            "delivery_place_id",
            "product_id",
        ),
    )


# Backward compatibility alias
Forecast = ForecastCurrent
