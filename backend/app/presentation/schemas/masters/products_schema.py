"""Product schemas."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.presentation.schemas.common.common_schema import ORMModel


class ProductBase(BaseModel):
    """Shared product fields."""

    product_code: str = Field(..., min_length=1)
    product_name: str = Field(..., min_length=1)
    internal_unit: str = Field(default="CAN", min_length=1)
    external_unit: str = Field(default="KG", min_length=1)
    qty_per_internal_unit: float = Field(default=1.0, gt=0)


class ProductCreate(ProductBase):
    """Payload to create a product."""

    customer_part_no: str | None = None
    maker_item_code: str | None = None
    is_active: bool = True


class ProductUpdate(BaseModel):
    """Payload to partially update a product."""

    product_code: str | None = None
    product_name: str | None = None
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
