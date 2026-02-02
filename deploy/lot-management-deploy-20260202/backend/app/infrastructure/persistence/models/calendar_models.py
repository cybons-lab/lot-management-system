"""Calendar-related models (holiday, company calendar, original delivery dates)."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import Base


class HolidayCalendar(Base):
    """Holiday calendar (祝日カレンダー).

    DDL: holiday_calendars
    """

    __tablename__ = "holiday_calendars"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False)
    holiday_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("holiday_date", name="uq_holiday_calendars_date"),
        Index("idx_holiday_calendars_date", "holiday_date"),
    )


class CompanyCalendar(Base):
    """Company holidays / workdays calendar (会社の休日・稼働日).

    DDL: company_calendars
    """

    __tablename__ = "company_calendars"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    calendar_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_workday: Mapped[bool] = mapped_column(Boolean, nullable=False)
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("calendar_date", name="uq_company_calendars_date"),
        Index("idx_company_calendars_date", "calendar_date"),
        Index("idx_company_calendars_is_workday", "is_workday"),
    )


class OriginalDeliveryCalendar(Base):
    """Original delivery date calendar (オリジナル配信日カレンダー).

    DDL: original_delivery_calendars
    """

    __tablename__ = "original_delivery_calendars"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint("delivery_date", name="uq_original_delivery_calendars_date"),
        Index("idx_original_delivery_calendars_date", "delivery_date"),
    )
