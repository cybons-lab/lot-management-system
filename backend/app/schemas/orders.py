# backend/app/schemas/sales.py
"""
販売関連のPydanticスキーマ
"""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import Field

from .base import BaseSchema, TimestampMixin


# --- Order ---
class OrderBase(BaseSchema):
    order_no: str
    customer_code: str
    order_date: Optional[date] = None
    status: str = "open"
    customer_order_no: Optional[str] = None


class OrderUpdate(BaseSchema):
    status: Optional[str] = None
    sap_order_id: Optional[str] = None
    sap_status: Optional[str] = None
    sap_error_msg: Optional[str] = None


class OrderResponse(OrderBase, TimestampMixin):
    id: int
    sap_order_id: Optional[str] = None
    sap_status: Optional[str] = None
    sap_sent_at: Optional[datetime] = None
    sap_error_msg: Optional[str] = None


# --- OrderLine ---
class OrderLineBase(BaseSchema):
    line_no: int
    product_code: str
    quantity: float
    unit: Optional[str] = None
    due_date: Optional[date] = None


class OrderLineCreate(OrderLineBase):
    external_unit: str = Field(..., min_length=1)


class OrderCreate(OrderBase):
    lines: list[OrderLineCreate] | None = None


class OrderLineResponse(OrderLineBase):
    id: int
    order_id: int
    created_at: datetime
    allocated_qty: Optional[float] = None  # 引当済数量(計算値)

    # --- 🔽 [変更] forecast 関連フィールドを追加 🔽 ---
    forecast_id: Optional[int] = None
    forecast_granularity: Optional[str] = None
    forecast_match_status: Optional[str] = None
    forecast_qty: Optional[float] = None
    forecast_version_no: Optional[int] = None


# --- Order with Lines ---
class OrderWithLinesResponse(OrderResponse):
    """受注詳細レスポンス(明細含む)"""

    lines: list[OrderLineResponse] = Field(default_factory=list)


# --- Allocation ---
class AllocationBase(BaseSchema):
    order_line_id: int
    lot_id: int
    allocated_qty: float


class AllocationCreate(AllocationBase):
    pass


class AllocationResponse(AllocationBase):
    id: int
    allocated_at: datetime


class FefoLotAllocation(BaseSchema):
    lot_id: int
    lot_number: str
    allocate_qty: float
    expiry_date: Optional[date] = None
    receipt_date: Optional[date] = None


class FefoLineAllocation(BaseSchema):
    order_line_id: int
    product_code: str
    required_qty: float
    already_allocated_qty: float
    allocations: list[FefoLotAllocation] = Field(default_factory=list)
    next_div: Optional[str] = None
    warnings: list[str] = Field(default_factory=list)


class FefoPreviewRequest(BaseSchema):
    order_id: int


class FefoPreviewResponse(BaseSchema):
    order_id: int
    lines: list[FefoLineAllocation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class FefoCommitResponse(BaseSchema):
    order_id: int
    created_allocation_ids: list[int] = Field(default_factory=list)
    preview: FefoPreviewResponse


class DragAssignRequest(BaseSchema):
    """ドラッグ引当リクエスト"""

    order_line_id: int
    lot_id: int
    allocate_qty: float


class DragAssignResponse(BaseSchema):
    """ドラッグ引当レスポンス"""

    success: bool
    message: str
    allocated_id: int
    remaining_lot_qty: float


# --- Shipping ---
class ShippingBase(BaseSchema):
    lot_id: int
    order_line_id: Optional[int] = None
    shipped_quantity: float
    shipping_date: date
    destination_code: Optional[str] = None
    destination_name: Optional[str] = None
    destination_address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    delivery_time_slot: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    carrier_service: Optional[str] = None
    notes: Optional[str] = None


class ShippingCreate(ShippingBase):
    pass


class ShippingUpdate(BaseSchema):
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    carrier_service: Optional[str] = None
    notes: Optional[str] = None


class ShippingResponse(ShippingBase, TimestampMixin):
    id: int


# --- PurchaseRequest ---
class PurchaseRequestBase(BaseSchema):
    product_code: str
    supplier_code: str
    requested_qty: float
    unit: Optional[str] = None
    reason_code: str
    src_order_line_id: Optional[int] = None
    desired_receipt_date: Optional[date] = None
    status: str = "draft"
    notes: Optional[str] = None


class PurchaseRequestCreate(PurchaseRequestBase):
    pass


class PurchaseRequestUpdate(BaseSchema):
    status: Optional[str] = None
    sap_po_id: Optional[str] = None
    notes: Optional[str] = None


class PurchaseRequestResponse(PurchaseRequestBase, TimestampMixin):
    id: int
    requested_date: date
    sap_po_id: Optional[str] = None


class WarehouseAllocIn(BaseSchema):
    warehouse_code: str = Field(..., max_length=32)
    quantity: float


class WarehouseAllocOut(BaseSchema):
    warehouse_code: str
    quantity: float


class OrderLineOut(BaseSchema):
    id: int
    product_code: str
    product_name: str
    customer_code: str
    supplier_code: Optional[str] = None
    quantity: float
    unit: str
    warehouse_allocations: list["WarehouseAllocOut"] = []
    related_lots: list[LotCandidateOut] = []  # ← 型を明示
    allocated_lots: list[dict] = []  # ← 既引当ロット


class OrdersWithAllocResponse(BaseSchema):
    items: list[OrderLineOut]


class SaveAllocationsRequest(BaseSchema):
    allocations: list[WarehouseAllocIn]


class AllocationWarning(BaseSchema):
    """ロット候補取得時の警告情報"""

    code: str
    message: str
    meta: Optional[dict] = None


class LotCandidateOut(BaseSchema):
    """引当候補ロット情報"""

    lot_id: int
    lot_code: str
    lot_number: Optional[str] = None
    product_code: str
    warehouse_code: str
    available_qty: float
    base_unit: str
    lot_unit_qty: Optional[float] = None
    lot_unit: Optional[str] = None
    conversion_factor: Optional[float] = None
    expiry_date: Optional[str] = None
    mfg_date: Optional[str] = None


class LotCandidateListResponse(BaseSchema):
    """ロット候補レスポンス"""

    items: List[LotCandidateOut] = Field(default_factory=list)
    warnings: List[AllocationWarning] = Field(default_factory=list)


class LotAllocationRequest(BaseSchema):
    """ロット引当リクエスト"""

    allocations: List[dict] = Field(
        ..., description="[{'lot_id': int, 'qty': float}, ...]"
    )


class LotAllocationResponse(BaseSchema):
    """ロット引当レスポンス"""

    success: bool
    message: str = ""
    applied: List[dict] = Field(default_factory=list)
    order_line: Optional[dict] = None


class AllocationCancelRequest(BaseSchema):
    """引当取消リクエスト"""

    allocation_id: Optional[int] = None
    all: bool = False


class AllocationCancelResponse(BaseSchema):
    """引当取消レスポンス"""

    success: bool
    message: str = ""
    order_line: Optional[dict] = None
