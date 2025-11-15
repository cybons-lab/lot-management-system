"""Pydantic schemas for forecast headers and lines."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import Field

from .base import BaseSchema, TimestampMixin


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


# ---------------------------------------------------------------------------
# Legacy (deprecated) schemas kept temporarily for backward compatibility.
# These will be removed once the forecast API is fully migrated to the new
# header/line structure. They intentionally mirror the former single-table
# forecast schema so existing routes keep type hints until refactored.
# ---------------------------------------------------------------------------


class LegacyForecastBase(BaseSchema):
    """Deprecated: historical schema for the single-table forecast model."""

    product_id: str
    customer_id: str
    granularity: str
    qty_forecast: int
    version_no: int = 1
    source_system: str = "external"
    is_active: bool = True
    date_day: date | None = None
    date_dekad_start: date | None = None
    year_month: str | None = None


class LegacyForecastCreate(LegacyForecastBase):
    """Deprecated create payload for legacy forecasts."""

    version_issued_at: datetime


class LegacyForecastUpdate(BaseSchema):
    """Deprecated update payload for legacy forecasts."""

    qty_forecast: int | None = None
    is_active: bool | None = None


class LegacyForecastResponse(LegacyForecastBase, TimestampMixin):
    """Deprecated response schema for legacy forecasts."""

    id: int
    forecast_id: int | None = None
    supplier_id: str | None = None
    version_issued_at: datetime


class LegacyForecastBulkImportRequest(BaseSchema):
    """Deprecated bulk import request for legacy forecasts."""

    version_no: int
    version_issued_at: datetime
    source_system: str = "external"
    deactivate_old_version: bool = True
    forecasts: list[LegacyForecastCreate]


class LegacyForecastBulkImportResponse(BaseSchema):
    """Deprecated bulk import response for legacy forecasts."""

    success: bool
    message: str
    version_no: int
    imported_count: int
    skipped_count: int
    error_count: int
    error_details: str | None = None


class LegacyForecastMatchRequest(BaseSchema):
    """Deprecated match request for legacy forecasts."""

    order_id: int | None = None
    order_ids: list[int] | None = None
    date_from: date | None = None
    date_to: date | None = None
    force_rematch: bool = False


class LegacyForecastMatchResult(BaseSchema):
    """Deprecated match result for legacy forecasts."""

    order_line_id: int
    order_no: str  # Note: バックエンドでorder_numberに変換してから返すこと
    line_no: int  # Note: DDL v2.2ではline_noフィールドは削除されました（idを使用）
    product_code: str  # Note: バックエンドでmaker_part_codeから変換して返すこと
    matched: bool
    forecast_id: int | None = None
    forecast_granularity: str | None = None
    forecast_match_status: str | None = None
    forecast_qty: float | None = None


class LegacyForecastMatchResponse(BaseSchema):
    """Deprecated match response for legacy forecasts."""

    success: bool
    message: str
    total_lines: int
    matched_lines: int
    unmatched_lines: int
    results: list[LegacyForecastMatchResult] = []


class LegacyForecastVersionInfo(BaseSchema):
    """Deprecated version information schema."""

    version_no: int
    version_issued_at: datetime
    is_active: bool
    forecast_count: int
    source_system: str


class LegacyForecastVersionListResponse(BaseSchema):
    """Deprecated version listing schema."""

    versions: list[LegacyForecastVersionInfo]


class LegacyForecastActivateRequest(BaseSchema):
    """Deprecated activation request for legacy forecasts."""

    version_no: int
    deactivate_others: bool = True


class LegacyForecastActivateResponse(BaseSchema):
    """Deprecated activation response for legacy forecasts."""

    success: bool
    message: str
    activated_version: int
    deactivated_versions: list[int] = []


class LegacyForecastItemOut(BaseSchema):
    """Deprecated list item schema used by legacy UI mocks."""

    id: int
    product_code: str
    product_name: str
    customer_code: str
    supplier_code: str | None = None
    granularity: str
    version_no: int
    updated_at: datetime
    daily_data: dict[str, float] | None = None
    dekad_data: dict[str, float] | None = None
    monthly_data: dict[str, float] | None = None
    dekad_summary: dict[str, float] | None = None
    customer_name: str | None = "得意先A (ダミー)"
    supplier_name: str | None = "サプライヤーB (ダミー)"
    unit: str = "EA"
    version_history: list[dict] = []


class LegacyForecastListResponse(BaseSchema):
    """Deprecated list response for legacy forecasts."""

    items: list[LegacyForecastItemOut]


# Backwards-compatible aliases for legacy imports. New code should use the
# ForecastHeader*/ForecastLine* schemas defined above.
ForecastBase = LegacyForecastBase
ForecastCreate = LegacyForecastCreate
ForecastUpdate = LegacyForecastUpdate
ForecastResponse = LegacyForecastResponse
ForecastBulkImportRequest = LegacyForecastBulkImportRequest
ForecastBulkImportResponse = LegacyForecastBulkImportResponse
ForecastMatchRequest = LegacyForecastMatchRequest
ForecastMatchResult = LegacyForecastMatchResult
ForecastMatchResponse = LegacyForecastMatchResponse
ForecastVersionInfo = LegacyForecastVersionInfo
ForecastVersionListResponse = LegacyForecastVersionListResponse
ForecastActivateRequest = LegacyForecastActivateRequest
ForecastActivateResponse = LegacyForecastActivateResponse
ForecastItemOut = LegacyForecastItemOut
ForecastListResponse = LegacyForecastListResponse
