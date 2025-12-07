"""Master import schemas for multi-table bulk import.

Defines nested data structures for importing related master data
from JSON, YAML, or Excel files.
"""

from __future__ import annotations

from pydantic import Field

from app.schemas.common.base import BaseSchema


# ============================================================
# Supply Side (仕入系)
# ============================================================


class ProductSupplierImportRow(BaseSchema):
    """Product-supplier relationship in import data."""

    maker_part_code: str = Field(..., description="Product code (products.maker_part_code)")
    product_name: str | None = Field(None, description="Product name (for upsert)")
    base_unit: str | None = Field(None, description="Base unit (e.g., KG, EA)")
    is_primary: bool = Field(default=False, description="Is primary supplier for this product")
    lead_time_days: int | None = Field(None, ge=0, description="Lead time in days")


class SupplierImportRow(BaseSchema):
    """Supplier with related products for import."""

    supplier_code: str = Field(..., description="Supplier code (suppliers.supplier_code)")
    supplier_name: str = Field(..., description="Supplier name")
    products: list[ProductSupplierImportRow] = Field(
        default_factory=list, description="Products supplied by this supplier"
    )


class SupplyDataImport(BaseSchema):
    """Supply-side import data (suppliers + products + product_suppliers)."""

    suppliers: list[SupplierImportRow] = Field(
        default_factory=list, description="List of suppliers with their products"
    )


# ============================================================
# Customer Side (得意先系)
# ============================================================


class DeliveryPlaceImportRow(BaseSchema):
    """Delivery place for import."""

    delivery_place_code: str = Field(..., description="Delivery place code")
    delivery_place_name: str = Field(..., description="Delivery place name")
    jiku_code: str | None = Field(None, description="Jiku code (SAP)")


class CustomerItemImportRow(BaseSchema):
    """Customer item mapping for import."""

    external_product_code: str = Field(..., description="Customer's product code")
    maker_part_code: str = Field(
        ..., description="Internal product code (products.maker_part_code)"
    )
    supplier_code: str | None = Field(None, description="Supplier code (if specific)")
    base_unit: str | None = Field(None, description="Base unit")
    pack_unit: str | None = Field(None, description="Pack unit")
    pack_quantity: int | None = Field(None, ge=1, description="Pack quantity")
    special_instructions: str | None = Field(None, description="Special instructions")


class CustomerImportRow(BaseSchema):
    """Customer with related data for import."""

    customer_code: str = Field(..., description="Customer code (customers.customer_code)")
    customer_name: str = Field(..., description="Customer name")
    delivery_places: list[DeliveryPlaceImportRow] = Field(
        default_factory=list, description="Delivery places for this customer"
    )
    items: list[CustomerItemImportRow] = Field(
        default_factory=list, description="Customer-specific product mappings"
    )


class CustomerDataImport(BaseSchema):
    """Customer-side import data (customers + delivery_places + customer_items)."""

    customers: list[CustomerImportRow] = Field(
        default_factory=list, description="List of customers with their data"
    )


# ============================================================
# Unified Import Request/Response
# ============================================================


class MasterImportRequest(BaseSchema):
    """Unified master import request.

    Can contain supply-side data, customer-side data, or both.
    When both are provided, supply-side is processed first.
    """

    supply_data: SupplyDataImport | None = Field(
        None, description="Supply-side data (suppliers, products)"
    )
    customer_data: CustomerDataImport | None = Field(
        None, description="Customer-side data (customers, delivery places, items)"
    )
    mode: str = Field(
        default="upsert",
        pattern="^(upsert|replace)$",
        description="Import mode: upsert (add/update) or replace (truncate + insert)",
    )
    dry_run: bool = Field(default=False, description="If true, validate only without committing")


class ImportResultDetail(BaseSchema):
    """Detail of import result for a single table."""

    table_name: str
    created: int = 0
    updated: int = 0
    failed: int = 0
    errors: list[str] = Field(default_factory=list)


class MasterImportResponse(BaseSchema):
    """Master import result."""

    status: str = Field(..., description="success, partial, or failed")
    dry_run: bool = Field(..., description="Whether this was a dry run")
    results: list[ImportResultDetail] = Field(default_factory=list, description="Results per table")
    errors: list[str] = Field(default_factory=list, description="Global errors")
