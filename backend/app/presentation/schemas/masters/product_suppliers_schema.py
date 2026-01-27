"""ProductSupplier schemas."""

from datetime import datetime

from pydantic import BaseModel

from app.presentation.schemas.common.common_schema import ORMModel


class ProductSupplierBase(BaseModel):
    """Shared product-supplier fields."""

    product_group_id: int
    supplier_id: int
    is_primary: bool = False
    lead_time_days: int | None = None


class ProductSupplierCreate(ProductSupplierBase):
    """Payload to create a product-supplier relationship."""

    pass


class ProductSupplierUpdate(BaseModel):
    """Payload to partially update a product-supplier relationship."""

    is_primary: bool | None = None
    lead_time_days: int | None = None


class ProductSupplierResponse(ORMModel):
    """Product-supplier relationship response model."""

    id: int
    product_group_id: int
    supplier_id: int
    is_primary: bool
    lead_time_days: int | None
    created_at: datetime
    updated_at: datetime


class ProductSupplierWithDetails(ProductSupplierResponse):
    """Product-supplier with related entity details."""

    supplier_code: str | None = None
    supplier_name: str | None = None
    product_code: str | None = None
    product_name: str | None = None
