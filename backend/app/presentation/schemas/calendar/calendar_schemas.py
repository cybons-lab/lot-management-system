"""Calendar-related schemas (holiday, company calendar, original delivery dates)."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class HolidayCalendarBase(BaseSchema):
    """Base schema for holiday calendar."""

    holiday_date: date = Field(..., description="祝日")
    holiday_name: str | None = Field(None, max_length=100, description="祝日名")


class HolidayCalendarCreate(HolidayCalendarBase):
    """Create request for holiday calendar.

    Inherits all fields from HolidayCalendarBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class HolidayCalendarUpdate(BaseSchema):
    """Update request for holiday calendar."""

    holiday_date: date | None = Field(None, description="祝日")
    holiday_name: str | None = Field(None, max_length=100, description="祝日名")


class HolidayCalendarResponse(HolidayCalendarBase):
    """Response schema for holiday calendar."""

    id: int
    created_at: datetime
    updated_at: datetime


class CompanyCalendarBase(BaseSchema):
    """Base schema for company calendar."""

    calendar_date: date = Field(..., description="会社カレンダー日")
    is_workday: bool = Field(..., description="稼働日ならtrue、休日ならfalse")
    description: str | None = Field(None, max_length=200, description="説明")


class CompanyCalendarCreate(CompanyCalendarBase):
    """Create request for company calendar.

    Inherits all fields from CompanyCalendarBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class CompanyCalendarUpdate(BaseSchema):
    """Update request for company calendar."""

    calendar_date: date | None = Field(None, description="会社カレンダー日")
    is_workday: bool | None = Field(None, description="稼働日ならtrue、休日ならfalse")
    description: str | None = Field(None, max_length=200, description="説明")


class CompanyCalendarResponse(CompanyCalendarBase):
    """Response schema for company calendar."""

    id: int
    created_at: datetime
    updated_at: datetime


class OriginalDeliveryCalendarBase(BaseSchema):
    """Base schema for original delivery calendar."""

    delivery_date: date = Field(..., description="配信日")
    description: str | None = Field(None, max_length=200, description="説明")


class OriginalDeliveryCalendarCreate(OriginalDeliveryCalendarBase):
    """Create request for original delivery calendar.

    Inherits all fields from OriginalDeliveryCalendarBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class OriginalDeliveryCalendarUpdate(BaseSchema):
    """Update request for original delivery calendar."""

    delivery_date: date | None = Field(None, description="配信日")
    description: str | None = Field(None, max_length=200, description="説明")


class OriginalDeliveryCalendarResponse(OriginalDeliveryCalendarBase):
    """Response schema for original delivery calendar."""

    id: int
    created_at: datetime
    updated_at: datetime


class BusinessDayCalculationRequest(BaseSchema):
    """Request for business day calculation."""

    start_date: date = Field(..., description="起算日")
    days: int = Field(..., ge=0, description="営業日数")
    direction: str = Field(..., pattern="^(after|before)$", description="after/before")
    include_start: bool = Field(False, description="起算日を含める")


class BusinessDayCalculationResponse(BaseSchema):
    """Response for business day calculation."""

    start_date: date
    result_date: date
    days: int
    direction: str
    include_start: bool


class HolidayImportRequest(BaseSchema):
    """Request for holiday import (TSV format)."""

    tsv_data: str = Field(..., description="タブ区切りの祝日データ (日付 [Tab] 祝日名)")
