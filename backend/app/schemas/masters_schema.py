# backend/app/schemas/masters.py
"""マスタ関連のPydanticスキーマ."""

from decimal import Decimal

from pydantic import Field

from .base import BaseSchema


# --- Warehouse ---
class WarehouseBase(BaseSchema):
    warehouse_code: str
    warehouse_name: str
    address: str | None = None
    is_active: int = 1


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseSchema):
    warehouse_name: str | None = None
    address: str | None = None
    is_active: int | None = 1


class WarehouseResponse(WarehouseBase):
    pass


# --- Supplier ---
class SupplierBase(BaseSchema):
    supplier_code: str
    supplier_name: str
    address: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseSchema):
    supplier_name: str | None = None
    address: str | None = None


class SupplierResponse(SupplierBase):
    pass


# --- Customer ---
class CustomerBase(BaseSchema):
    customer_code: str
    customer_name: str
    address: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseSchema):
    customer_name: str | None = None
    address: str | None = None


class CustomerResponse(CustomerBase):
    pass


# --- Product ---
class ProductBase(BaseSchema):
    product_code: str
    product_name: str
    supplier_code: str | None = None
    customer_part_no: str | None = None
    maker_item_code: str | None = None
    supplier_item_code: str | None = None
    packaging_qty: Decimal = Field(..., gt=Decimal("0"))
    packaging_unit: str = Field(..., min_length=1)
    internal_unit: str = Field(..., min_length=1)
    base_unit: str = "EA"
    packaging: str | None = None
    assemble_div: str | None = None
    next_div: str | None = None
    ji_ku_text: str | None = None
    kumitsuke_ku_text: str | None = None
    shelf_life_days: int | None = None
    requires_lot_number: bool = True
    delivery_place_id: int | None = None
    delivery_place_name: str | None = None
    shipping_warehouse_name: str | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseSchema):
    product_name: str | None = None
    supplier_code: str | None = None
    customer_part_no: str | None = None
    maker_item_code: str | None = None
    supplier_item_code: str | None = None
    packaging_qty: Decimal | None = Field(default=None, gt=Decimal("0"))
    packaging_unit: str | None = None
    internal_unit: str | None = None
    base_unit: str | None = None
    packaging: str | None = None
    assemble_div: str | None = None
    next_div: str | None = None
    ji_ku_text: str | None = None
    kumitsuke_ku_text: str | None = None
    shelf_life_days: int | None = None
    requires_lot_number: bool | None = None
    delivery_place_id: int | None = None
    delivery_place_name: str | None = None
    shipping_warehouse_name: str | None = None


class ProductResponse(ProductBase):
    pass


# --- ProductUomConversion ---
class ProductUomConversionBase(BaseSchema):
    product_code: str
    source_unit: str
    source_value: float = 1.0
    internal_unit_value: float


class ProductUomConversionCreate(ProductUomConversionBase):
    pass


class ProductUomConversionUpdate(BaseSchema):
    source_value: float | None = None
    internal_unit_value: float | None = None


class ProductUomConversionResponse(ProductUomConversionBase):
    id: int


class MasterBulkLoadRequest(BaseSchema):
    """Bulk load payload for master data."""

    warehouses: list[WarehouseCreate] = Field(default_factory=list)
    suppliers: list[SupplierCreate] = Field(default_factory=list)
    customers: list[CustomerCreate] = Field(default_factory=list)
    products: list[ProductCreate] = Field(default_factory=list)


class MasterBulkLoadResponse(BaseSchema):
    """Bulk load result summary."""

    created: dict[str, list[str]] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
