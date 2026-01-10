"""Pydantic schemas for forecast v2.4 (forecast_current / forecast_history)."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema, TimestampMixin
from app.presentation.schemas.common.common_schema import ListResponse
from app.presentation.schemas.orders.orders_schema import OrderWithLinesResponse


class ForecastBase(BaseSchema):
    """Common attributes for forecast entries."""

    customer_id: int
    delivery_place_id: int
    product_id: int
    forecast_date: date
    forecast_quantity: Decimal
    unit: str | None = None
    forecast_period: str | None = None


class ForecastCreate(ForecastBase):
    """Payload for creating a new forecast entry."""

    pass


class ForecastUpdate(BaseSchema):
    """Mutable fields for updating a forecast entry."""

    forecast_quantity: Decimal | None = None
    unit: str | None = None


class ForecastResponse(ForecastBase, TimestampMixin):
    """API response model for forecast_current entries."""

    id: int
    snapshot_at: datetime
    forecast_period: str
    # Joined master data
    customer_code: str | None = None
    customer_name: str | None = None
    delivery_place_code: str | None = None
    delivery_place_name: str | None = None
    product_code: str | None = None
    product_name: str | None = None


class ForecastHistoryResponse(ForecastBase):
    """API response model for forecast_history entries."""

    id: int
    snapshot_at: datetime
    archived_at: datetime
    created_at: datetime
    updated_at: datetime
    forecast_period: str
    # Joined master data
    customer_code: str | None = None
    customer_name: str | None = None
    delivery_place_code: str | None = None
    delivery_place_name: str | None = None
    product_code: str | None = None
    product_name: str | None = None


class ForecastGroupKey(BaseSchema):
    """Group key for customer × delivery_place × product."""

    customer_id: int
    delivery_place_id: int
    product_id: int
    customer_code: str | None = None
    customer_name: str | None = None
    delivery_place_code: str | None = None
    delivery_place_name: str | None = None
    product_code: str | None = None
    product_name: str | None = None


class ForecastGroupResponse(BaseSchema):
    """Grouped forecasts by customer × delivery_place × product."""

    group_key: ForecastGroupKey
    forecasts: list[ForecastResponse] = Field(default_factory=list)
    snapshot_at: datetime | None = None
    related_orders: list[OrderWithLinesResponse] = Field(default_factory=list)


# Using generic ListResponse[T] for consistency
ForecastListResponse = ListResponse[ForecastGroupResponse]
"""List response with grouped forecasts."""


class ForecastBulkImportItem(BaseSchema):
    """Single item for bulk import."""

    customer_code: str
    delivery_place_code: str
    product_code: str
    forecast_date: date
    forecast_quantity: Decimal
    unit: str | None = None
    forecast_period: str


class ForecastBulkImportRequest(BaseSchema):
    """Bulk import request payload."""

    items: list[ForecastBulkImportItem]
    replace_existing: bool = Field(
        default=True,
        description="If true, archive existing forecasts before importing new ones",
    )


class ForecastBulkImportSummary(BaseSchema):
    """Aggregated summary of bulk import outcomes."""

    imported_count: int
    archived_count: int
    skipped_count: int = 0
    errors: list[str] = Field(default_factory=list)


# Rebuild models to resolve forward references
ForecastGroupResponse.model_rebuild()
ForecastListResponse.model_rebuild()
