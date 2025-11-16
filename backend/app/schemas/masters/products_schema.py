"""Product schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common.common_schema import ORMModel


class ProductBase(BaseModel):
    """Shared product fields."""

    product_code: str = Field(..., min_length=1)
    product_name: str = Field(..., min_length=1)
    internal_unit: str = Field(..., min_length=1)


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
    customer_part_no: str | None = None
    maker_item_code: str | None = None
    is_active: bool | None = None


class ProductOut(ORMModel):
    """Product response model."""

    id: int
    product_code: str
    product_name: str
    internal_unit: str
    customer_part_no: str | None
    maker_item_code: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
