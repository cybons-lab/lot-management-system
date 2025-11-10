# backend/app/schemas/orders.py
"""受注関連のPydanticスキーマ（拡張版）."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import Field, PositiveInt, constr

from .base import BaseSchema, TimestampMixin


# --- Order ---
class OrderBase(BaseSchema):
    order_no: str
    customer_code: str
    order_date: date
    status: str = "open"
    customer_order_no: str | None = None
    customer_order_no_last6: str | None = None
    delivery_mode: str | None = None
    sap_order_id: str | None = None
    sap_status: str | None = None
    sap_sent_at: datetime | None = None
    sap_error_msg: str | None = None


class OrderCreate(OrderBase):
    lines: list[OrderLineCreate] = Field(default_factory=list)


class OrderUpdate(BaseSchema):
    status: str | None = None
    customer_order_no: str | None = None
    delivery_mode: str | None = None
    sap_status: str | None = None


class OrderStatusUpdate(BaseSchema):
    """
    受注ステータス更新用スキーマ.

    Note:
        constrを使用してstatusが空文字でないことを保証
    """

    status: constr(min_length=1) = Field(
        ...,
        description="新しいステータス（open, allocated, shipped, closed, cancelled）",
        examples=["allocated", "shipped"],
    )


class OrderResponse(OrderBase, TimestampMixin):
    id: int


class OrderWithLinesResponse(OrderResponse):
    lines: list[OrderLineOut] = Field(default_factory=list)


# --- OrderLine ---
class OrderLineBase(BaseSchema):
    line_no: int
    product_code: str
    quantity: float
    unit: str
    due_date: date | None = None
    next_div: str | None = None
    destination_id: int | None = None


class OrderLineCreate(OrderLineBase):
    external_unit: str | None = None  # 外部単位（変換用）


class OrderLineResponse(OrderLineBase, TimestampMixin):
    id: int
    order_id: int
    allocated_qty: float | None = None


class WarehouseAllocOut(BaseSchema):
    warehouse_code: str
    quantity: float


class WarehouseAllocIn(BaseSchema):
    warehouse_code: str
    quantity: float


class OrderLineOut(BaseSchema):
    id: int
    line_no: int | None = None
    product_code: str
    product_name: str
    customer_code: str | None = None
    supplier_code: str | None = None
    quantity: float
    unit: str
    due_date: date | None = None
    warehouse_allocations: list[WarehouseAllocOut] = Field(default_factory=list)
    related_lots: list[dict[str, Any]] = Field(default_factory=list)
    allocated_lots: list[dict[str, Any]] = Field(default_factory=list)
    allocated_qty: float | None = None
    next_div: str | None = None


class AllocationWarning(BaseSchema):
    code: str
    message: str
    meta: dict[str, Any] | None = None


class LotCandidateOut(BaseSchema):
    lot_id: int
    lot_code: str
    lot_number: str
    product_code: str
    warehouse_code: str | None = None
    available_qty: float
    base_unit: str
    lot_unit_qty: float | None = None
    lot_unit: str | None = None
    conversion_factor: float | None = None
    expiry_date: str | None = None
    mfg_date: str | None = None


class LotCandidateListResponse(BaseSchema):
    items: list[LotCandidateOut] = Field(default_factory=list)
    warnings: list[AllocationWarning] = Field(default_factory=list)


class SaveAllocationsRequest(BaseSchema):
    allocations: list[WarehouseAllocIn] = Field(default_factory=list)


class OrdersWithAllocResponse(BaseSchema):
    items: list[OrderLineOut] = Field(default_factory=list)


class OrderValidationLotAvailability(BaseSchema):
    lot_id: int
    available: int


class OrderValidationDetails(BaseSchema):
    warehouse_code: str
    per_lot: list[OrderValidationLotAvailability] = Field(default_factory=list)
    ship_date: date | None = None


class OrderValidationErrorData(BaseSchema):
    product_code: str
    required: int
    available: int
    details: OrderValidationDetails


class OrderLineDemandSchema(BaseSchema):
    product_code: str
    warehouse_code: str
    quantity: PositiveInt


class OrderValidationRequest(BaseSchema):
    lines: list[OrderLineDemandSchema]
    ship_date: date | None = None


class OrderValidationResponse(BaseSchema):
    ok: bool
    message: str
    data: OrderValidationErrorData | None = None


# Pydantic v2のforward reference解決
OrderCreate.model_rebuild()
OrderWithLinesResponse.model_rebuild()
