"""Allocation and lot assignment schemas (DDL v2.2 compliant).

All schemas strictly follow the DDL as the single source of truth.
Column names: allocated_qty → allocated_quantity
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import Field

from .base import BaseSchema


# ============================================================
# FEFO Allocation (FEFO引当)
# ============================================================


class FefoPreviewRequest(BaseSchema):
    """FEFO preview request."""

    order_id: int


class FefoLotAllocation(BaseSchema):
    """FEFO lot allocation detail."""

    lot_id: int
    lot_number: str
    allocated_quantity: Decimal = Field(..., decimal_places=3, description="引当数量")
    expiry_date: date | None = None
    received_date: date | None = None


class FefoLineAllocation(BaseSchema):
    """FEFO line allocation detail."""

    order_line_id: int
    product_id: int
    order_quantity: Decimal = Field(..., decimal_places=3, description="受注数量")
    already_allocated_quantity: Decimal = Field(
        default=Decimal("0"), decimal_places=3, description="既存引当数量"
    )
    allocations: list[FefoLotAllocation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class FefoPreviewResponse(BaseSchema):
    """FEFO preview response."""

    order_id: int
    lines: list[FefoLineAllocation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class FefoCommitResponse(BaseSchema):
    """FEFO commit response."""

    order_id: int
    created_allocation_ids: list[int] = Field(default_factory=list)
    preview: FefoPreviewResponse


# ============================================================
# Manual Allocation (手動引当)
# ============================================================


class ManualAllocationRequest(BaseSchema):
    """Manual allocation request (v2.2.1)."""

    order_line_id: int
    lot_id: int
    allocated_quantity: Decimal = Field(..., gt=0, decimal_places=3)


class ManualAllocationResponse(BaseSchema):
    """Manual allocation response (v2.2.1)."""

    order_line_id: int
    lot_id: int
    lot_number: str
    allocated_quantity: Decimal = Field(..., decimal_places=3)
    available_quantity: Decimal = Field(..., decimal_places=3)
    product_id: int
    expiry_date: date | None = None
    status: str = "preview"
    message: str | None = None


# ============================================================
# Allocation Commit (引当確定)
# ============================================================


class AllocationCommitRequest(BaseSchema):
    """Allocation commit request (v2.2.1)."""

    order_id: int


class AllocationCommitResponse(BaseSchema):
    """Allocation commit response (v2.2.1)."""

    order_id: int
    created_allocation_ids: list[int] = Field(default_factory=list)
    preview: FefoPreviewResponse | None = None
    status: str = "committed"
    message: str | None = None


# ============================================================
# Candidate Lots (候補ロット)
# ============================================================


class CandidateLotItem(BaseSchema):
    """Candidate lot item (DDL: lots)."""

    lot_id: int
    lot_number: str
    current_quantity: Decimal = Field(..., decimal_places=3)
    allocated_quantity: Decimal = Field(..., decimal_places=3)
    available_quantity: Decimal = Field(..., decimal_places=3, description="引当可能数量")
    product_id: int
    warehouse_id: int
    expiry_date: date | None = None
    received_date: date | None = None


class CandidateLotsResponse(BaseSchema):
    """Candidate lots list response."""

    items: list[CandidateLotItem] = Field(default_factory=list)
    total: int = 0


# ============================================================
# Allocation Response (引当実績レスポンス)
# ============================================================


class AllocationDetail(BaseSchema):
    """Allocation detail (DDL: allocations)."""

    id: int
    order_line_id: int
    lot_id: int
    allocated_quantity: Decimal = Field(..., decimal_places=3)
    status: str = Field(..., pattern="^(allocated|shipped|cancelled)$")


class AllocationListResponse(BaseSchema):
    """Allocation list response."""

    items: list[AllocationDetail] = Field(default_factory=list)
    total: int = 0


# ============================================================
# Backward Compatibility Aliases (v2.1 互換)
# ============================================================


class DragAssignRequest(ManualAllocationRequest):
    """Deprecated: Use ManualAllocationRequest instead."""

    allocate_qty: Decimal | None = Field(None, description="Deprecated: use allocated_quantity")


class DragAssignResponse(BaseSchema):
    """Deprecated: Use ManualAllocationResponse instead."""

    success: bool
    message: str
    allocated_id: int
    remaining_lot_qty: Decimal | None = None


class AllocationSuggestionManualRequest(ManualAllocationRequest):
    """Deprecated: Use ManualAllocationRequest instead."""

    quantity: Decimal | None = Field(None, description="Deprecated: use allocated_quantity")


class AllocationSuggestionManualResponse(ManualAllocationResponse):
    """Deprecated: Use ManualAllocationResponse instead."""

    suggested_quantity: Decimal | None = Field(
        None, description="Deprecated: use allocated_quantity"
    )
