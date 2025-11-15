"""引当推奨関連のPydanticスキーマ."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class AllocationSuggestionBase(BaseModel):
    """引当推奨基本スキーマ."""

    forecast_line_id: int = Field(..., description="フォーキャスト明細ID")
    lot_id: int = Field(..., description="ロットID")
    suggested_quantity: Decimal = Field(..., description="推奨数量")
    allocation_logic: str = Field(..., description="引当ロジック（FEFO/FIFO/MANUAL等）")


class AllocationSuggestionCreate(AllocationSuggestionBase):
    """引当推奨作成スキーマ."""

    pass


class AllocationSuggestionResponse(AllocationSuggestionBase):
    """引当推奨レスポンス."""

    suggestion_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AllocationSuggestionListResponse(BaseModel):
    """引当推奨一覧レスポンス."""

    suggestions: list[AllocationSuggestionResponse]
    total: int


class AllocationSuggestionWithDetails(AllocationSuggestionResponse):
    """引当推奨詳細レスポンス（ロット情報含む）."""

    lot_number: str | None = Field(None, description="ロット番号")
    product_name: str | None = Field(None, description="製品名")
    warehouse_name: str | None = Field(None, description="倉庫名")
    lot_expiry_date: datetime | None = Field(None, description="ロット有効期限")


class AllocationSuggestionGenerateRequest(BaseModel):
    """引当推奨生成リクエスト."""

    forecast_line_id: int = Field(..., description="フォーキャスト明細ID")
    logic: str = Field(default="FEFO", description="引当ロジック（FEFO/FIFO/MANUAL）")
    max_suggestions: int = Field(default=5, ge=1, le=20, description="最大推奨件数")


class AllocationSuggestionGenerateResponse(BaseModel):
    """引当推奨生成レスポンス."""

    forecast_line_id: int
    suggestions_created: int
    suggestions: list[AllocationSuggestionResponse]
