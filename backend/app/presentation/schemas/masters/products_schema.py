"""Product schemas."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.presentation.schemas.common.common_schema import ORMModel


class ProductBase(BaseModel):
    """Shared product fields."""

    product_code: str = Field(..., min_length=1)
    product_name: str = Field(..., min_length=1)
    maker_part_code: str = Field("", max_length=100, description="メーカー品番")
    base_unit: str = Field("EA", max_length=20, description="基本単位")
    consumption_limit_days: int | None = Field(None, description="消費期限日数")
    internal_unit: str = Field(default="CAN", min_length=1)
    external_unit: str = Field(default="KG", min_length=1)
    qty_per_internal_unit: float = Field(default=1.0, gt=0)


class ProductCreate(ProductBase):
    """Payload to create a product."""

    # product_code は自動採番されるため任意
    product_code: str | None = None

    # 以下2つは必須
    customer_part_no: str = Field(..., min_length=1, description="先方品番")
    maker_item_code: str = Field(
        ..., min_length=1, description="メーカー品番（旧メーカー品目コード）"
    )

    is_active: bool = True


class ProductUpdate(BaseModel):
    """Payload to partially update a product."""

    product_code: str | None = None
    product_name: str | None = None
    maker_part_code: str | None = None
    base_unit: str | None = None
    consumption_limit_days: int | None = None
    internal_unit: str | None = None
    external_unit: str | None = None
    qty_per_internal_unit: float | None = None
    customer_part_no: str | None = None
    maker_item_code: str | None = None
    is_active: bool | None = None


class ProductOut(ORMModel):
    """Product response model."""

    id: int
    product_code: str
    product_name: str
    maker_part_code: str | None = None  # 既存データ互換性のためオプショナル
    base_unit: str | None = None  # 既存データ互換性のためオプショナル
    consumption_limit_days: int | None = None
    internal_unit: str
    external_unit: str
    qty_per_internal_unit: float
    customer_part_no: str | None
    maker_item_code: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    valid_to: date
    supplier_ids: list[int] = []


class ProductBulkRow(ProductBase):
    """Single row for product bulk upsert."""

    pass  # ProductBase already has all required fields


class ProductBulkUpsertRequest(BaseModel):
    """Bulk upsert request for products."""

    rows: list[ProductBulkRow] = Field(
        ..., min_length=1, description="List of product rows to upsert"
    )
