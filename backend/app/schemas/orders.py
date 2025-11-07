# backend/app/schemas/orders.py
"""受注関連のPydanticスキーマ（拡張版）"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import Field, PositiveInt, constr

from .base import BaseSchema, TimestampMixin


# --- Order ---
class OrderBase(BaseSchema):
    order_no: str
    customer_code: str
    order_date: date
    status: str = "open"
    customer_order_no: Optional[str] = None
    customer_order_no_last6: Optional[str] = None
    delivery_mode: Optional[str] = None
    sap_order_id: Optional[str] = None
    sap_status: Optional[str] = None
    sap_sent_at: Optional[datetime] = None
    sap_error_msg: Optional[str] = None


class OrderCreate(OrderBase):
    lines: List["OrderLineCreate"] = Field(default_factory=list)


class OrderUpdate(BaseSchema):
    status: Optional[str] = None
    customer_order_no: Optional[str] = None
    delivery_mode: Optional[str] = None
    sap_status: Optional[str] = None


class OrderStatusUpdate(BaseSchema):
    """
    受注ステータス更新用スキーマ
    
    Note:
        constrを使用してstatusが空文字でないことを保証
    """
    status: constr(min_length=1) = Field(
        ...,
        description="新しいステータス（open, allocated, shipped, closed, cancelled）",
        examples=["allocated", "shipped"]
    )


class OrderResponse(OrderBase, TimestampMixin):
    id: int


class OrderWithLinesResponse(OrderResponse):
    lines: List["OrderLineOut"] = Field(default_factory=list)


# --- OrderLine ---
class OrderLineBase(BaseSchema):
    line_no: int
    product_code: str
    quantity: float
    unit: str
    due_date: Optional[date] = None
    next_div: Optional[str] = None
    destination_id: Optional[int] = None


class OrderLineCreate(OrderLineBase):
    external_unit: Optional[str] = None  # 外部単位（変換用）


class OrderLineResponse(OrderLineBase, TimestampMixin):
    id: int
    order_id: int
    allocated_qty: Optional[float] = None


class WarehouseAllocOut(BaseSchema):
    warehouse_code: str
    quantity: float


class WarehouseAllocIn(BaseSchema):
    warehouse_code: str
    quantity: float


class OrderLineOut(BaseSchema):
    id: int
    line_no: Optional[int] = None
    product_code: str
    product_name: str
    customer_code: Optional[str] = None
    supplier_code: Optional[str] = None
    quantity: float
    unit: str
    due_date: Optional[date] = None
    warehouse_allocations: List[WarehouseAllocOut] = Field(default_factory=list)
    related_lots: List[Dict[str, Any]] = Field(default_factory=list)
    allocated_lots: List[Dict[str, Any]] = Field(default_factory=list)
    allocated_qty: Optional[float] = None
    next_div: Optional[str] = None


class AllocationWarning(BaseSchema):
    code: str
    message: str
    meta: Optional[Dict[str, Any]] = None


class LotCandidateOut(BaseSchema):
    lot_id: int
    lot_code: str
    lot_number: str
    product_code: str
    warehouse_code: Optional[str] = None
    available_qty: float
    base_unit: str
    lot_unit_qty: Optional[float] = None
    lot_unit: Optional[str] = None
    conversion_factor: Optional[float] = None
    expiry_date: Optional[str] = None
    mfg_date: Optional[str] = None


class LotCandidateListResponse(BaseSchema):
    items: List[LotCandidateOut] = Field(default_factory=list)
    warnings: List[AllocationWarning] = Field(default_factory=list)


class SaveAllocationsRequest(BaseSchema):
    allocations: List[WarehouseAllocIn] = Field(default_factory=list)


class OrdersWithAllocResponse(BaseSchema):
    items: List[OrderLineOut] = Field(default_factory=list)


class OrderValidationLotAvailability(BaseSchema):
    lot_id: int
    available: int


class OrderValidationDetails(BaseSchema):
    warehouse_code: str
    per_lot: List[OrderValidationLotAvailability] = Field(default_factory=list)
    ship_date: Optional[date] = None


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
    lines: List[OrderLineDemandSchema]
    ship_date: Optional[date] = None


class OrderValidationResponse(BaseSchema):
    ok: bool
    message: str
    data: Optional[OrderValidationErrorData] = None


# Pydantic v2のforward reference解決
OrderCreate.model_rebuild()
OrderWithLinesResponse.model_rebuild()
