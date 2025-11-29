"""Master data Pydantic schemas (DDL v2.2 compliant).

All schemas strictly follow the DDL as the single source of truth.
Legacy fields have been removed.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common.base import BaseSchema
from app.schemas.common.common_schema import ListResponse
from app.schemas.masters.products_schema import ProductCreate, ProductOut


# ============================================================
# Warehouse (倉庫マスタ)
# ============================================================


class WarehouseBase(BaseSchema):
    """Base warehouse schema (DDL: warehouses)."""

    warehouse_code: str = Field(..., min_length=1, max_length=50)
    warehouse_name: str = Field(..., min_length=1, max_length=200)
    warehouse_type: str = Field(
        ..., pattern="^(internal|external|supplier)$", description="internal/external/supplier"
    )


class WarehouseCreate(WarehouseBase):
    """Create warehouse request."""

    pass


class WarehouseUpdate(BaseSchema):
    """Update warehouse request."""

    warehouse_name: str | None = Field(None, min_length=1, max_length=200)
    warehouse_type: str | None = Field(
        None, pattern="^(internal|external|supplier)$", description="internal/external/supplier"
    )


class WarehouseResponse(WarehouseBase):
    """Warehouse response (DDL: warehouses)."""

    id: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# Supplier (仕入先マスタ)
# ============================================================


class SupplierBase(BaseSchema):
    """Base supplier schema (DDL: suppliers)."""

    supplier_code: str = Field(..., min_length=1, max_length=50)
    supplier_name: str = Field(..., min_length=1, max_length=200)


class SupplierCreate(SupplierBase):
    """Create supplier request."""

    pass


class SupplierUpdate(BaseSchema):
    """Update supplier request."""

    supplier_name: str | None = Field(None, min_length=1, max_length=200)


class SupplierResponse(SupplierBase):
    """Supplier response (DDL: suppliers)."""

    id: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# Customer (得意先マスタ)
# ============================================================


class CustomerBase(BaseSchema):
    """Base customer schema (DDL: customers)."""

    customer_code: str = Field(..., min_length=1, max_length=50)
    customer_name: str = Field(..., min_length=1, max_length=200)


class CustomerCreate(CustomerBase):
    """Create customer request."""

    pass


class CustomerUpdate(BaseSchema):
    """Update customer request."""

    customer_name: str | None = Field(None, min_length=1, max_length=200)


class CustomerResponse(CustomerBase):
    """Customer response (DDL: customers)."""

    id: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# DeliveryPlace (納入先マスタ)
# ============================================================


class DeliveryPlaceBase(BaseSchema):
    """Base delivery place schema (DDL: delivery_places)."""

    jiku_code: str | None = Field(None, max_length=50, description="次区コード(SAP連携用)")
    delivery_place_code: str = Field(..., min_length=1, max_length=50)
    delivery_place_name: str = Field(..., min_length=1, max_length=200)
    customer_id: int = Field(..., gt=0)


class DeliveryPlaceCreate(DeliveryPlaceBase):
    """Create delivery place request."""

    pass


class DeliveryPlaceUpdate(BaseSchema):
    """Update delivery place request."""

    jiku_code: str | None = Field(None, max_length=50)
    delivery_place_name: str | None = Field(None, min_length=1, max_length=200)
    customer_id: int | None = Field(None, gt=0)


class DeliveryPlaceResponse(DeliveryPlaceBase):
    """Delivery place response (DDL: delivery_places)."""

    id: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# Bulk Load (一括登録)
# ============================================================


class MasterBulkLoadRequest(BaseSchema):
    """Bulk load payload for master data."""

    warehouses: list[WarehouseCreate] = Field(default_factory=list)
    suppliers: list[SupplierCreate] = Field(default_factory=list)
    customers: list[CustomerCreate] = Field(default_factory=list)
    products: list[ProductCreate] = Field(default_factory=list)
    delivery_places: list[DeliveryPlaceCreate] = Field(default_factory=list)


class MasterBulkLoadResponse(BaseSchema):
    """Bulk load result summary."""

    created: dict[str, list[str]] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


# ============================================================
# List Responses
# ============================================================


# Using generic ListResponse[T] for consistency
CustomerListResponse = ListResponse[CustomerResponse]
"""Customer list response."""

ProductListResponse = ListResponse[ProductOut]
"""Product list response."""

SupplierListResponse = ListResponse[SupplierResponse]
"""Supplier list response."""

DeliveryPlaceListResponse = ListResponse[DeliveryPlaceResponse]
"""Delivery place list response."""
