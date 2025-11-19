"""Pydantic schemas for forecast headers and lines."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from enum import Enum

from pydantic import Field

from app.schemas.common.base import BaseSchema, TimestampMixin


class ForecastStatus(str, Enum):
    """Lifecycle states for :class:`ForecastHeader`."""

    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ForecastHeaderBase(BaseSchema):
    """Common attributes shared by create/update operations."""

    customer_id: int
    delivery_place_id: int
    forecast_number: str
    forecast_start_date: date
    forecast_end_date: date
    status: ForecastStatus = ForecastStatus.ACTIVE


class ForecastHeaderCreate(ForecastHeaderBase):
    """Payload for creating a new forecast header."""

    lines: list[ForecastLineCreate] | None = Field(
        default=None,
        description="Optional collection of forecast lines created together with the header.",
    )


class ForecastHeaderUpdate(BaseSchema):
    """Mutable fields on a forecast header."""

    delivery_place_id: int | None = None
    forecast_number: str | None = None
    forecast_start_date: date | None = None
    forecast_end_date: date | None = None
    status: ForecastStatus | None = None


class ForecastHeaderResponse(ForecastHeaderBase, TimestampMixin):
    """API response model for forecast headers."""

    id: int = Field(serialization_alias="forecast_id")


class ForecastHeaderDetailResponse(ForecastHeaderResponse):
    """Header representation bundled with its lines."""

    lines: list[ForecastLineResponse] = Field(default_factory=list)


class ForecastLineBase(BaseSchema):
    """Shared fields for forecast line payloads."""

    product_id: int
    delivery_date: date
    forecast_quantity: Decimal = Field(serialization_alias="quantity")
    unit: str


class ForecastLineCreate(ForecastLineBase):
    """Payload for adding a forecast line."""

    pass


class ForecastLineUpdate(BaseSchema):
    """Mutable fields for forecast lines."""

    delivery_date: date | None = None
    forecast_quantity: Decimal | None = None
    unit: str | None = None


class ForecastLineResponse(ForecastLineBase, TimestampMixin):
    """API response model for forecast lines."""

    id: int = Field(serialization_alias="forecast_line_id")
    forecast_id: int


class ForecastBulkImportResult(BaseSchema):
    """Result entry for bulk import operations."""

    header: ForecastHeaderResponse
    created_lines: list[ForecastLineResponse]


class ForecastBulkImportSummary(BaseSchema):
    """Aggregated summary of bulk import outcomes."""

    imported_headers: int
    imported_lines: int
    skipped_headers: int = 0
    skipped_lines: int = 0
