# backend/app/schemas/allocations.py
"""FEFO引当およびドラッグ引当関連のスキーマ."""

from __future__ import annotations

from datetime import date

from pydantic import Field

from .base import BaseSchema


class FefoPreviewRequest(BaseSchema):
    order_id: int


class FefoLotAllocation(BaseSchema):
    lot_id: int
    lot_number: str
    allocate_qty: float
    expiry_date: date | None = None
    receipt_date: date | None = None


class FefoLineAllocation(BaseSchema):
    order_line_id: int
    product_code: str
    required_qty: float
    already_allocated_qty: float
    allocations: list[FefoLotAllocation] = Field(default_factory=list)
    next_div: str | None = None
    warnings: list[str] = Field(default_factory=list)


class FefoPreviewResponse(BaseSchema):
    order_id: int
    lines: list[FefoLineAllocation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class FefoCommitResponse(BaseSchema):
    order_id: int
    created_allocation_ids: list[int] = Field(default_factory=list)
    preview: FefoPreviewResponse


class DragAssignRequest(BaseSchema):
    order_line_id: int
    lot_id: int
    allocate_qty: float


class DragAssignResponse(BaseSchema):
    success: bool
    message: str
    allocated_id: int
    remaining_lot_qty: float


class CandidateLotItem(BaseSchema):
    """候補ロット項目（product_id基準）."""

    lot_id: int
    lot_number: str
    free_qty: float
    current_quantity: float
    allocated_qty: float
    product_code: str | None = None
    warehouse_code: str | None = None
    expiry_date: date | None = None
    last_updated: str | None = None


class CandidateLotsResponse(BaseSchema):
    """候補ロット一覧レスポンス."""

    items: list[CandidateLotItem] = Field(default_factory=list)
    total: int = 0


class AllocatableLotItem(BaseSchema):
    """診断用引当可能ロット項目."""

    lot_id: int
    lot_number: str
    product_id: int
    product_code: str | None = None
    warehouse_id: int
    warehouse_code: str | None = None
    free_qty: float
    current_quantity: float
    allocated_qty: float
    expiry_date: date | None = None
    is_locked: bool = False
    last_updated: str | None = None


class AllocatableLotsResponse(BaseSchema):
    """診断用引当可能ロット一覧レスポンス."""

    items: list[AllocatableLotItem] = Field(default_factory=list)
    total: int = 0
