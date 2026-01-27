"""ProductGroup schemas.

製品グループは supplier_items と customer_items を紐付けるグルーピングエンティティ。
業務識別子ではない。

2コード体系:
1. メーカー品番 (supplier_items.maker_part_no) - 在庫実体
2. 得意先品番 (customer_items.customer_part_no) - 注文入力
"""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.presentation.schemas.common.common_schema import ORMModel


class ProductGroupBase(BaseModel):
    """Shared product group fields."""

    product_code: str = Field(..., min_length=1)
    product_name: str = Field(..., min_length=1)
    maker_part_code: str = Field("", max_length=100, description="メーカー品番")
    base_unit: str = Field("EA", max_length=20, description="基本単位")
    consumption_limit_days: int | None = Field(None, description="消費期限日数")
    internal_unit: str = Field(default="CAN", min_length=1)
    external_unit: str = Field(default="KG", min_length=1)
    qty_per_internal_unit: float = Field(default=1.0, gt=0)


class ProductGroupCreate(ProductGroupBase):
    """Payload to create a product group."""

    # product_code は自動採番されるため任意
    product_code: str | None = None  # type: ignore[assignment]

    is_active: bool = True


class ProductGroupUpdate(BaseModel):
    """Payload to partially update a product group."""

    product_code: str | None = None
    product_name: str | None = None
    maker_part_code: str | None = None
    base_unit: str | None = None
    consumption_limit_days: int | None = None
    internal_unit: str | None = None
    external_unit: str | None = None
    qty_per_internal_unit: float | None = None
    is_active: bool | None = None


class ProductGroupOut(ORMModel):
    """Product group response model."""

    id: int
    product_code: str = Field(..., validation_alias="maker_part_code")
    product_name: str
    maker_part_code: str | None = None  # 既存データ互換性のためオプショナル
    base_unit: str | None = None  # 既存データ互換性のためオプショナル
    consumption_limit_days: int | None = None
    internal_unit: str
    external_unit: str
    qty_per_internal_unit: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    valid_to: date
    supplier_ids: list[int] = []


class ProductGroupBulkRow(ProductGroupBase):
    """Single row for product group bulk upsert."""

    pass  # ProductGroupBase already has all required fields


class ProductGroupBulkUpsertRequest(BaseModel):
    """Bulk upsert request for product groups."""

    rows: list[ProductGroupBulkRow] = Field(
        ..., min_length=1, description="List of product group rows to upsert"
    )


# Backward compatibility aliases
ProductBase = ProductGroupBase
ProductCreate = ProductGroupCreate
ProductUpdate = ProductGroupUpdate
ProductOut = ProductGroupOut
ProductBulkRow = ProductGroupBulkRow
ProductBulkUpsertRequest = ProductGroupBulkUpsertRequest
