"""Warehouse Delivery Route schemas (輸送経路マスタ)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# WarehouseDeliveryRoute (輸送経路マスタ)
# ============================================================


class WarehouseDeliveryRouteBase(BaseModel):
    """Base warehouse delivery route schema."""

    warehouse_id: int = Field(..., gt=0, description="出荷元倉庫ID")
    delivery_place_id: int = Field(..., gt=0, description="納入先ID")
    product_id: int | None = Field(None, gt=0, description="品番ID（NULLの場合は経路デフォルト）")
    transport_lead_time_days: int = Field(..., ge=0, description="輸送リードタイム（日）")
    is_active: bool = Field(default=True, description="有効フラグ")
    notes: str | None = Field(None, max_length=1000, description="備考")


class WarehouseDeliveryRouteCreate(WarehouseDeliveryRouteBase):
    """Create warehouse delivery route request."""

    pass


class WarehouseDeliveryRouteUpdate(BaseModel):
    """Update warehouse delivery route request."""

    transport_lead_time_days: int | None = Field(None, ge=0, description="輸送リードタイム（日）")
    is_active: bool | None = Field(None, description="有効フラグ")
    notes: str | None = Field(None, max_length=1000, description="備考")


class WarehouseDeliveryRouteResponse(WarehouseDeliveryRouteBase):
    """Warehouse delivery route response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    # Denormalized fields for display
    warehouse_code: str | None = None
    warehouse_name: str | None = None
    delivery_place_code: str | None = None
    delivery_place_name: str | None = None
    product_name: str | None = None
    maker_part_code: str | None = None


class WarehouseDeliveryRouteBulkRow(WarehouseDeliveryRouteBase):
    """Single row for bulk upsert."""

    pass


class WarehouseDeliveryRouteBulkUpsertRequest(BaseModel):
    """Bulk upsert request for warehouse delivery routes."""

    rows: list[WarehouseDeliveryRouteBulkRow] = Field(
        ..., min_length=1, description="List of routes to upsert"
    )


# ============================================================
# Transport Lead Time Query/Response
# ============================================================


class TransportLeadTimeQuery(BaseModel):
    """Query for transport lead time lookup."""

    warehouse_id: int = Field(..., gt=0)
    delivery_place_id: int = Field(..., gt=0)
    product_id: int | None = Field(None, gt=0)


class TransportLeadTimeResponse(BaseModel):
    """Transport lead time lookup response."""

    transport_lead_time_days: int | None = Field(
        None, description="輸送リードタイム（日）。該当なしの場合はNone"
    )
    source: str = Field(
        ...,
        description="LT取得元: 'route_product', 'route_default', 'warehouse_default', 'not_found'",
    )
