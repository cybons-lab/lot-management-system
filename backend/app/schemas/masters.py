# backend/app/schemas/masters.py
"""
マスタ関連のPydanticスキーマ
"""

from typing import Optional

from .base import BaseSchema


# --- Warehouse ---
class WarehouseBase(BaseSchema):
    warehouse_code: str
    warehouse_name: str
    address: Optional[str] = None
    is_active: int = 1


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseSchema):
    warehouse_name: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[int] = 1


class WarehouseResponse(WarehouseBase):
    pass


# --- Supplier ---
class SupplierBase(BaseSchema):
    supplier_code: str
    supplier_name: str
    address: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseSchema):
    supplier_name: Optional[str] = None
    address: Optional[str] = None


class SupplierResponse(SupplierBase):
    pass


# --- Customer ---
class CustomerBase(BaseSchema):
    customer_code: str
    customer_name: str
    address: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseSchema):
    customer_name: Optional[str] = None
    address: Optional[str] = None


class CustomerResponse(CustomerBase):
    pass


# --- Product ---
class ProductBase(BaseSchema):
    product_code: str
    product_name: str
    customer_part_no: Optional[str] = None
    maker_part_no: Optional[str] = None
    internal_unit: str = "EA"
    base_unit: str = "EA"
    packaging: Optional[str] = None
    assemble_div: Optional[str] = None
    next_div: Optional[str] = None
    shelf_life_days: Optional[int] = None
    requires_lot_number: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseSchema):
    product_name: Optional[str] = None
    customer_part_no: Optional[str] = None
    maker_part_no: Optional[str] = None
    internal_unit: Optional[str] = None
    base_unit: Optional[str] = None
    packaging: Optional[str] = None
    assemble_div: Optional[str] = None
    next_div: Optional[str] = None
    shelf_life_days: Optional[int] = None
    requires_lot_number: Optional[bool] = None


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
    source_value: Optional[float] = None
    internal_unit_value: Optional[float] = None


class ProductUomConversionResponse(ProductUomConversionBase):
    id: int
