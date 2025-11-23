"""Order management Pydantic schemas (DDL v2.2 compliant).

All schemas strictly follow the DDL as the single source of truth.
Legacy fields (sap_*, customer_order_no, delivery_mode, etc.) have been removed.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.common.base import BaseSchema


# ============================================================
# Order (受注ヘッダ)
# ============================================================


class OrderBase(BaseSchema):
    """Base order schema (DDL: orders)."""

    order_number: str = Field(..., min_length=1, max_length=50)
    customer_id: int = Field(..., gt=0)
    order_date: date


class OrderCreate(OrderBase):
    """Create order request."""

    lines: list[OrderLineCreate] = Field(default_factory=list)


class OrderUpdate(BaseSchema):
    """Update order request."""


class OrderResponse(OrderBase):
    """Order response (DDL: orders)."""

    id: int
    created_at: datetime
    updated_at: datetime


class OrderWithLinesResponse(OrderResponse):
    """Order with lines response."""

    lines: list[OrderLineResponse] = Field(
        default_factory=list, validation_alias="order_lines", serialization_alias="lines"
    )


# ============================================================
# Allocation (引当実績) - Simplified for orders_schema
# ============================================================


class AllocationResponse(BaseSchema):
    """Allocation response for order line (DDL: allocations)."""

    id: int
    order_line_id: int
    lot_id: int
    allocated_quantity: Decimal = Field(..., decimal_places=3)
    status: str = Field(..., pattern="^(allocated|shipped|cancelled)$")
    created_at: datetime
    updated_at: datetime


# ============================================================
# OrderLine (受注明細)
# ============================================================


class OrderLineBase(BaseSchema):
    """Base order line schema (DDL: order_lines)."""

    product_id: int = Field(..., gt=0)
    delivery_date: date
    order_quantity: Decimal = Field(..., gt=0, decimal_places=3, description="受注数量")
    unit: str = Field(..., min_length=1, max_length=20)
    converted_quantity: Decimal | None = Field(
        None, decimal_places=3, description="社内基準単位換算数量"
    )
    delivery_place_id: int = Field(..., gt=0)
    status: str = Field(
        default="pending",
        pattern="^(pending|allocated|shipped|completed|cancelled)$",
    )


class OrderLineCreate(OrderLineBase):
    """Create order line request."""

    pass


class OrderLineUpdate(BaseSchema):
    """Update order line request."""

    delivery_date: date | None = None
    order_quantity: Decimal | None = Field(None, gt=0, decimal_places=3)
    unit: str | None = Field(None, min_length=1, max_length=20)
    delivery_place_id: int | None = Field(None, gt=0)
    status: str | None = Field(None, pattern="^(pending|allocated|shipped|completed|cancelled)$")


class OrderLineResponse(OrderLineBase):
    """Order line response (DDL: order_lines)."""

    id: int
    order_id: int
    created_at: datetime
    updated_at: datetime
    supplier_name: str | None = None
    # Product Unit Info (flattened from product relationship)
    product_internal_unit: str | None = None
    product_external_unit: str | None = None
    product_qty_per_internal_unit: float | None = None

    # Display Info (Populated by Service)
    product_code: str | None = None
    product_name: str | None = None
    delivery_place_name: str | None = None

    # Allocation Info
    allocations: list[AllocationResponse] = Field(default_factory=list)
    allocated_quantity: Decimal = Field(default=Decimal("0"), description="引当済数量")

    model_config = {"from_attributes": True}


# ============================================================
# Backward Compatibility Helpers
# ============================================================


class OrderLineOut(OrderLineResponse):
    """Deprecated: Use OrderLineResponse instead."""

    # For backward compatibility with existing code
    product_name: str | None = None
    allocated_qty: Decimal | None = Field(None, description="Deprecated: use allocated_quantity")


# Pydantic v2のforward reference解決
OrderCreate.model_rebuild()
OrderWithLinesResponse.model_rebuild()
