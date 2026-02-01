"""引当推奨関連のPydanticスキーマ."""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class AllocationSuggestionBase(BaseModel):
    """引当推奨基本スキーマ."""

    forecast_period: str = Field(..., description="対象期間 (YYYY-MM または YYYY-MM-DD)")
    customer_id: int = Field(..., description="得意先ID")
    delivery_place_id: int = Field(..., description="納入先ID")
    product_group_id: int = Field(..., description="製品ID")

    lot_id: int = Field(..., description="ロットID")
    quantity: Decimal = Field(..., description="引当数量")

    allocation_type: Literal["soft", "hard"] = Field(..., description="引当タイプ")
    source: str = Field(..., description="発生源 (forecast_import / order_preview)")

    order_line_id: int | None = Field(None, description="オーダー明細ID (Preview時など)")
    forecast_id: int | None = Field(None, description="予測ID (Forecast Link時)")
    priority: int = Field(0, description="引当優先順位 (1=High)")


class AllocationSuggestionCreate(AllocationSuggestionBase):
    """引当推奨作成スキーマ.

    Inherits all fields from AllocationSuggestionBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class AllocationSuggestionResponse(AllocationSuggestionBase):
    """引当推奨レスポンス."""

    id: int
    created_at: datetime
    updated_at: datetime

    # FE表示用補助 (Joined loadで取得想定)
    lot_number: str | None = Field(None, description="ロット番号")
    lot_expiry_date: datetime | None = Field(None, description="ロット有効期限")
    warehouse_name: str | None = Field(None, description="倉庫名")

    model_config = {"from_attributes": True}


class AllocationStatsPerKey(BaseModel):
    """キーごとの集計結果."""

    customer_id: int
    delivery_place_id: int
    product_group_id: int
    forecast_period: str

    forecast_quantity: Decimal
    allocated_quantity: Decimal
    shortage_quantity: Decimal


class AllocationGap(BaseModel):
    """不足情報."""

    customer_id: int
    delivery_place_id: int
    product_group_id: int
    forecast_period: str

    shortage_quantity: Decimal
    related_order_line_ids: list[int] | None = None


class AllocationStatsSummary(BaseModel):
    """全体集計."""

    total_forecast_quantity: Decimal
    total_allocated_quantity: Decimal
    total_shortage_quantity: Decimal
    per_key: list[AllocationStatsPerKey]


class AllocationSuggestionPreviewResponse(BaseModel):
    """プレビュー/生成結果レスポンス."""

    suggestions: list[AllocationSuggestionResponse]
    stats: AllocationStatsSummary
    gaps: list[AllocationGap]


# Request Models


class AllocationScopeForecast(BaseModel):
    forecast_periods: list[str]
    customer_ids: list[int] | None = None
    delivery_place_ids: list[int] | None = None
    product_ids: list[int] | None = None


class AllocationScopeOrder(BaseModel):
    order_line_id: int


class AllocationOptions(BaseModel):
    allocation_type: Literal["soft", "hard"] = "soft"
    fefo: bool = True
    allow_cross_warehouse: bool = False
    ignore_existing_suggestions: bool = False


class AllocationSuggestionRequest(BaseModel):
    """引当推奨生成/プレビューリクエスト."""

    mode: Literal["forecast", "order"]
    forecast_scope: AllocationScopeForecast | None = None
    order_scope: AllocationScopeOrder | None = None
    options: AllocationOptions = Field(default_factory=AllocationOptions)


class AllocationSuggestionListResponse(BaseModel):
    """引当推奨一覧レスポンス."""

    suggestions: list[AllocationSuggestionResponse]
    total: int


class AllocationSuggestionBatchUpdateItem(BaseModel):
    """一括更新用アイテム."""

    customer_id: int
    delivery_place_id: int
    product_group_id: int
    lot_id: int
    forecast_period: str
    quantity: Decimal


class AllocationSuggestionBatchUpdate(BaseModel):
    """一括更新リクエスト."""

    updates: list[AllocationSuggestionBatchUpdateItem]
