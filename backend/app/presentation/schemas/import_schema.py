"""Master import schemas for multi-table bulk import.

Defines nested data structures for importing related master data
from JSON, YAML, or Excel files.
"""

from __future__ import annotations

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


# ============================================================
# Supply Side (仕入系)
# ============================================================


class ProductSupplierImportRow(BaseSchema):
    """Product-supplier relationship in import data."""

    maker_part_code: str = Field(..., description="Product code (products.maker_part_no)")
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
    jiku_code: str = Field(..., min_length=1, description="Jiku code (SAP)")
    jiku_match_pattern: str | None = Field(
        None, description="Jiku match pattern (wildcard, e.g. 2***)"
    )


class CustomerItemImportRow(BaseSchema):
    """Customer item mapping for import."""

    customer_part_no: str = Field(..., description="Customer's product code")
    maker_part_code: str = Field(..., description="Internal product code (products.maker_part_no)")
    supplier_code: str | None = Field(None, description="Supplier code (if specific)")
    base_unit: str | None = Field(None, description="Base unit")
    pack_unit: str | None = Field(None, description="Pack unit")
    pack_quantity: int | None = Field(None, ge=1, description="Pack quantity")
    special_instructions: str | None = Field(None, description="Special instructions")


class ProductMappingImportRow(BaseSchema):
    """Product mapping for import (4-party relationship: customer + part code + product + supplier)."""

    customer_part_code: str = Field(..., description="Customer's part code")
    maker_part_code: str = Field(..., description="Internal product code (products.maker_part_no)")
    supplier_code: str = Field(..., description="Supplier code (required)")
    base_unit: str = Field(..., description="Base unit")
    pack_unit: str | None = Field(None, description="Pack unit")
    pack_quantity: int | None = Field(None, ge=1, description="Pack quantity")
    special_instructions: str | None = Field(None, description="Special instructions")
    is_active: bool = Field(default=True, description="Is active")


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
    product_mappings: list[ProductMappingImportRow] = Field(
        default_factory=list, description="Product mappings (4-party relationship)"
    )


class CustomerDataImport(BaseSchema):
    """Customer-side import data (customers + delivery_places + customer_items)."""

    customers: list[CustomerImportRow] = Field(
        default_factory=list, description="List of customers with their data"
    )


# ============================================================
# Order/Transaction Data (受注系)
# ============================================================


class OrderLineImportRow(BaseSchema):
    """Order line for import with business keys."""

    # Business keys for matching
    customer_code: str = Field(..., description="Customer code")
    product_code: str = Field(..., description="Product code (maker_part_code)")
    order_date: str = Field(..., description="Order date (YYYY-MM-DD)")

    # Customer-side business keys
    customer_order_no: str | None = Field(
        None, max_length=6, description="Customer's 6-digit order number"
    )
    customer_order_line_no: str | None = Field(
        None, max_length=10, description="Customer's line number"
    )

    # SAP business keys
    sap_order_no: str | None = Field(None, max_length=20, description="SAP order number")
    sap_order_item_no: str | None = Field(None, max_length=6, description="SAP order item number")

    # Order details
    delivery_place_code: str = Field(..., description="Delivery place code")
    order_quantity: str = Field(..., description="Order quantity")
    unit: str = Field(..., max_length=20, description="Unit")
    delivery_date: str | None = Field(None, description="Delivery date (YYYY-MM-DD)")


class InboundPlanImportRow(BaseSchema):
    """Inbound plan for import with SAP PO number."""

    plan_number: str = Field(..., description="Plan number")
    supplier_code: str = Field(..., description="Supplier code")
    planned_arrival_date: str = Field(..., description="Planned arrival date (YYYY-MM-DD)")

    # SAP business key
    sap_po_number: str | None = Field(None, max_length=20, description="SAP purchase order number")


class OrderDataImport(BaseSchema):
    """Order/Transaction data import."""

    order_lines: list[OrderLineImportRow] = Field(
        default_factory=list, description="Order lines with business keys"
    )
    inbound_plans: list[InboundPlanImportRow] = Field(
        default_factory=list, description="Inbound plans with SAP PO numbers"
    )


# ============================================================
# Unified Import Request/Response
# ============================================================


class MasterImportRequest(BaseSchema):
    """Unified master import request.

    Can contain supply-side data, customer-side data, order data, or any combination.
    Processing order: supply → customer → order
    """

    supply_data: SupplyDataImport | None = Field(
        None, description="Supply-side data (suppliers, products)"
    )
    customer_data: CustomerDataImport | None = Field(
        None, description="Customer-side data (customers, delivery places, items)"
    )
    order_data: OrderDataImport | None = Field(
        None, description="Order/transaction data (order lines with SAP keys, inbound plans)"
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
