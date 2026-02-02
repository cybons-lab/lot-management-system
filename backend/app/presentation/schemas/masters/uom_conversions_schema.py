# backend/app/schemas/masters/uom_conversions_schema.py
"""Product UOM conversion schemas (単位換算マスタ)."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class UomConversionBase(BaseSchema):
    """Base schema for UOM conversions."""

    supplier_item_id: int = Field(..., serialization_alias="product_group_id", description="製品ID")
    external_unit: str = Field(..., max_length=20, description="外部単位")
    factor: Decimal = Field(..., description="換算係数")


class UomConversionCreate(UomConversionBase):
    """Schema for creating a UOM conversion.

    Inherits all fields from UomConversionBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class UomConversionUpdate(BaseSchema):
    """Schema for updating a UOM conversion."""

    factor: Decimal | None = Field(None, description="換算係数")


class UomConversionResponse(UomConversionBase):
    """Schema for UOM conversion response."""

    conversion_id: int
    created_at: datetime
    updated_at: datetime
    valid_to: date

    class Config:
        """Pydantic config."""

        from_attributes = True


class UomConversionBulkRow(BaseSchema):
    """Single row for UOM conversion bulk upsert.

    Upsert uses composite key: (product_code, external_unit)
    """

    product_code: str = Field(..., description="製品コード")
    external_unit: str = Field(..., max_length=20, description="外部単位")
    factor: Decimal = Field(..., description="換算係数")


class UomConversionBulkUpsertRequest(BaseSchema):
    """Bulk upsert request for UOM conversions."""

    rows: list[UomConversionBulkRow] = Field(
        ..., min_length=1, description="List of UOM conversion rows to upsert"
    )
