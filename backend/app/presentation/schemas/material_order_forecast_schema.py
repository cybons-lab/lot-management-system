"""Material Order Forecast schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class MaterialOrderForecastResponse(BaseModel):
    """Material Order Forecast response schema."""

    id: int
    target_month: str = Field(..., description="対象月（YYYY-MM）")

    # マスタFK
    customer_item_id: int | None = None
    warehouse_id: int | None = None
    maker_id: int | None = None

    # CSV生データ
    material_code: str | None = None
    unit: str | None = None
    warehouse_code: str | None = None
    jiku_code: str
    delivery_place: str | None = None
    support_division: str | None = None
    procurement_type: str | None = None
    maker_code: str | None = None
    maker_name: str | None = None
    material_name: str | None = None

    # 数量データ
    delivery_lot: Decimal | None = None
    order_quantity: Decimal | None = None
    month_start_instruction: Decimal | None = None
    manager_name: str | None = None
    monthly_instruction_quantity: Decimal | None = None
    next_month_notice: Decimal | None = None

    # JSON数量
    daily_quantities: dict | None = None
    period_quantities: dict | None = None

    # メタ情報
    snapshot_at: datetime
    imported_by: int | None = None
    source_file_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaterialOrderForecastListResponse(BaseModel):
    """Material Order Forecast list response."""

    total_count: int
    items: list[MaterialOrderForecastResponse]


class MaterialOrderForecastImportRequest(BaseModel):
    """Material Order Forecast import request."""

    target_month: str | None = Field(None, description="対象月（YYYY-MM、互換入力用）")


class MaterialOrderForecastImportResponse(BaseModel):
    """Material Order Forecast import response."""

    success: bool
    imported_count: int
    target_month: str
    snapshot_at: str
    warnings: list[str] = Field(default_factory=list)


class MakerResponse(BaseModel):
    """Maker response schema."""

    id: int
    maker_code: str = Field(..., description="メーカーコード")
    maker_name: str = Field(..., description="メーカー名")
    display_name: str | None = None
    short_name: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    version: int

    model_config = {"from_attributes": True}


class MakerCreateRequest(BaseModel):
    """Maker create request schema."""

    maker_code: str = Field(..., min_length=1, max_length=50)
    maker_name: str = Field(..., min_length=1, max_length=200)
    display_name: str | None = Field(None, max_length=200)
    short_name: str | None = Field(None, max_length=50)
    notes: str | None = None


class MakerUpdateRequest(BaseModel):
    """Maker update request schema."""

    version: int = Field(..., description="楽観的ロック用バージョン")
    maker_name: str | None = Field(None, min_length=1, max_length=200)
    display_name: str | None = Field(None, max_length=200)
    short_name: str | None = Field(None, max_length=50)
    notes: str | None = None
