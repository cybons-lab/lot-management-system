"""Customer items schemas (得意先品番マッピング)."""

from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class CustomerItemBase(BaseSchema):
    """Base schema for customer items."""

    customer_id: int = Field(..., description="得意先ID")
    external_product_code: str = Field(..., max_length=100, description="得意先品番")
    product_id: int = Field(..., description="製品ID")
    supplier_id: int | None = Field(None, description="仕入先ID")
    base_unit: str = Field(..., max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")


class CustomerItemCreate(CustomerItemBase):
    """Schema for creating a customer item mapping."""

    pass


class CustomerItemUpdate(BaseSchema):
    """Schema for updating a customer item mapping."""

    product_id: int | None = Field(None, description="製品ID")
    supplier_id: int | None = Field(None, description="仕入先ID")
    base_unit: str | None = Field(None, max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")


class CustomerItemResponse(CustomerItemBase):
    """Schema for customer item response."""

    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic config."""

        from_attributes = True
