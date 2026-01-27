"""Master data Pydantic schemas (DDL v2.2 compliant).

All schemas strictly follow the DDL as the single source of truth.
Legacy fields have been removed.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema
from app.presentation.schemas.common.common_schema import ListResponse
from app.presentation.schemas.masters.product_groups_schema import (
    ProductGroupCreate as ProductCreate,
)
from app.presentation.schemas.masters.product_groups_schema import (
    ProductGroupOut as ProductOut,
)


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
    default_transport_lead_time_days: int | None = Field(
        None, ge=0, description="デフォルト輸送リードタイム（日）"
    )
    short_name: str | None = Field(None, max_length=50, description="短縮表示名")


class WarehouseCreate(WarehouseBase):
    """Create warehouse request."""

    pass


class WarehouseUpdate(BaseSchema):
    """Update warehouse request."""

    warehouse_code: str | None = Field(None, min_length=1, max_length=50)
    warehouse_name: str | None = Field(None, min_length=1, max_length=200)
    warehouse_type: str | None = Field(
        None, pattern="^(internal|external|supplier)$", description="internal/external/supplier"
    )
    default_transport_lead_time_days: int | None = Field(
        None, ge=0, description="デフォルト輸送リードタイム（日）"
    )
    short_name: str | None = Field(None, max_length=50, description="短縮表示名")


class WarehouseResponse(WarehouseBase):
    """Warehouse response (DDL: warehouses)."""

    id: int
    created_at: datetime
    updated_at: datetime
    valid_to: date


class WarehouseBulkRow(WarehouseBase):
    """Single row for warehouse bulk upsert."""

    pass  # WarehouseBase already has all required fields


class WarehouseBulkUpsertRequest(BaseSchema):
    """Bulk upsert request for warehouses."""

    rows: list[WarehouseBulkRow] = Field(
        ..., min_length=1, description="List of warehouse rows to upsert"
    )


# ============================================================
# Supplier (仕入先マスタ)
# ============================================================


class SupplierBase(BaseSchema):
    """Base supplier schema (DDL: suppliers)."""

    supplier_code: str = Field(..., min_length=1, max_length=50)
    supplier_name: str = Field(..., min_length=1, max_length=200)
    short_name: str | None = Field(None, max_length=50, description="短縮表示名")


class SupplierCreate(SupplierBase):
    """Create supplier request."""

    pass


class SupplierUpdate(BaseSchema):
    """Update supplier request."""

    supplier_code: str | None = Field(None, min_length=1, max_length=50)
    supplier_name: str | None = Field(None, min_length=1, max_length=200)
    short_name: str | None = Field(None, max_length=50, description="短縮表示名")


class SupplierResponse(SupplierBase):
    """Supplier response (DDL: suppliers)."""

    id: int
    created_at: datetime
    updated_at: datetime
    valid_to: date


class SupplierBulkRow(SupplierBase):
    """Single row for supplier bulk upsert."""

    pass  # SupplierBase already has all required fields


class SupplierBulkUpsertRequest(BaseSchema):
    """Bulk upsert request for suppliers."""

    rows: list[SupplierBulkRow] = Field(
        ..., min_length=1, description="List of supplier rows to upsert"
    )


# ============================================================
# Customer (得意先マスタ)
# ============================================================


class CustomerBase(BaseSchema):
    """Base customer schema (DDL: customers)."""

    customer_code: str = Field(..., min_length=1, max_length=50)
    customer_name: str = Field(..., min_length=1, max_length=200)
    short_name: str | None = Field(None, max_length=50, description="短縮表示名")
    address: str | None = Field(None, max_length=500)
    contact_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=200)


class CustomerCreate(CustomerBase):
    """Create customer request."""

    pass


class CustomerUpdate(BaseSchema):
    """Update customer request."""

    customer_code: str | None = Field(None, min_length=1, max_length=50)
    customer_name: str | None = Field(None, min_length=1, max_length=200)
    short_name: str | None = Field(None, max_length=50, description="短縮表示名")
    address: str | None = Field(None, max_length=500)
    contact_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=200)


class CustomerResponse(CustomerBase):
    """Customer response (DDL: customers)."""

    id: int
    created_at: datetime
    updated_at: datetime
    valid_to: date


class CustomerBulkRow(CustomerBase):
    """Single row for customer bulk upsert."""

    pass  # CustomerBase already has all required fields


class CustomerBulkUpsertRequest(BaseSchema):
    """Bulk upsert request for customers."""

    rows: list[CustomerBulkRow] = Field(
        ..., min_length=1, description="List of customer rows to upsert"
    )


# ============================================================
# DeliveryPlace (納入先マスタ)
# ============================================================


class DeliveryPlaceBase(BaseSchema):
    """Base delivery place schema (DDL: delivery_places)."""

    jiku_code: str | None = Field(None, max_length=50, description="次区コード(SAP連携用)")
    delivery_place_code: str = Field(..., min_length=1, max_length=50)
    delivery_place_name: str = Field(..., min_length=1, max_length=200)
    short_name: str | None = Field(None, max_length=50, description="短縮表示名")
    customer_id: int = Field(..., gt=0)


class DeliveryPlaceCreate(DeliveryPlaceBase):
    """Create delivery place request."""

    pass


class DeliveryPlaceUpdate(BaseSchema):
    """Update delivery place request."""

    delivery_place_code: str | None = Field(None, min_length=1, max_length=50)
    jiku_code: str | None = Field(None, max_length=50)
    delivery_place_name: str | None = Field(None, min_length=1, max_length=200)
    short_name: str | None = Field(None, max_length=50, description="短縮表示名")
    customer_id: int | None = Field(None, gt=0)


class DeliveryPlaceResponse(DeliveryPlaceBase):
    """Delivery place response (DDL: delivery_places)."""

    id: int
    created_at: datetime
    updated_at: datetime
    valid_to: date


# ============================================================
# ProductMapping (商品マスタ)
# ============================================================


class ProductMappingBase(BaseSchema):
    """Base product mapping schema (DDL: product_mappings)."""

    customer_id: int = Field(..., gt=0, description="得意先ID")
    customer_part_code: str = Field(..., min_length=1, max_length=100, description="先方品番")
    supplier_id: int = Field(..., gt=0, description="仕入先ID")
    product_group_id: int = Field(..., gt=0, description="製品ID")
    base_unit: str = Field(..., min_length=1, max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, ge=0, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")
    is_active: bool = Field(True, description="有効フラグ")


class ProductMappingCreate(ProductMappingBase):
    """Create product mapping request."""

    pass


class ProductMappingUpdate(BaseSchema):
    """Update product mapping request."""

    customer_id: int | None = Field(None, gt=0)
    customer_part_code: str | None = Field(None, min_length=1, max_length=100)
    supplier_id: int | None = Field(None, gt=0)
    product_group_id: int | None = Field(None, gt=0)
    base_unit: str | None = Field(None, min_length=1, max_length=20)
    pack_unit: str | None = Field(None, max_length=20)
    pack_quantity: int | None = Field(None, ge=0)
    special_instructions: str | None = None
    is_active: bool | None = None


class ProductMappingResponse(ProductMappingBase):
    """Product mapping response (DDL: product_mappings)."""

    id: int
    created_at: datetime
    updated_at: datetime
    valid_to: date


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
# Bulk Upsert (一括登録・更新)
# ============================================================


class BulkUpsertSummary(BaseSchema):
    """Bulk upsert summary statistics."""

    total: int = Field(..., description="Total number of rows processed")
    created: int = Field(..., description="Number of newly created records")
    updated: int = Field(..., description="Number of updated records")
    failed: int = Field(..., description="Number of failed records")


class BulkUpsertResponse(BaseSchema):
    """Bulk upsert response."""

    status: str = Field(..., description="Overall status: success, partial, or failed")
    summary: BulkUpsertSummary
    errors: list[str] = Field(default_factory=list, description="List of error messages")


# ============================================================
# SupplierItem (仕入先品目マスタ) - 旧: SupplierProduct
# ============================================================


class SupplierItemBase(BaseSchema):
    """Base supplier item schema (DDL: supplier_items)."""

    product_group_id: int = Field(..., gt=0)
    supplier_id: int = Field(..., gt=0)
    maker_part_no: str = Field(..., min_length=1, max_length=100, description="メーカー品番")
    is_primary: bool = Field(False)
    lead_time_days: int | None = Field(None, ge=0)
    display_name: str | None = Field(None, max_length=200, description="表示名")
    notes: str | None = Field(None, description="備考")


class SupplierItemCreate(SupplierItemBase):
    """Create supplier item request."""

    pass


class SupplierItemUpdate(BaseSchema):
    """Update supplier item request."""

    maker_part_no: str | None = Field(None, min_length=1, max_length=100)
    is_primary: bool | None = None
    lead_time_days: int | None = Field(None, ge=0)
    display_name: str | None = Field(None, max_length=200)
    notes: str | None = None


class SupplierItemResponse(SupplierItemBase):
    """Supplier item response (DDL: supplier_items)."""

    id: int
    product_code: str
    product_name: str
    supplier_code: str
    supplier_name: str
    created_at: datetime
    updated_at: datetime
    valid_to: date


# Backward compatibility aliases
SupplierProductBase = SupplierItemBase
SupplierProductCreate = SupplierItemCreate
SupplierProductUpdate = SupplierItemUpdate
SupplierProductResponse = SupplierItemResponse


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

SupplierItemListResponse = ListResponse[SupplierItemResponse]
"""Supplier item list response."""

SupplierProductListResponse = SupplierItemListResponse
"""Backward compatibility alias."""
