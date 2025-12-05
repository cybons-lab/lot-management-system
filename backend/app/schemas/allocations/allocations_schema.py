"""Allocation and lot assignment schemas (DDL v2.2 compliant).

All schemas strictly follow the DDL as the single source of truth.
Column names: allocated_qty → allocated_quantity
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.common.base import BaseSchema
from app.schemas.common.common_schema import ListResponse


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
# Bulk Operations (一括操作)
# ============================================================


class BulkCancelRequest(BaseSchema):
    """Bulk cancel allocations request."""

    allocation_ids: list[int] = Field(..., min_length=1, description="取消対象の引当ID一覧")


class BulkCancelResponse(BaseSchema):
    """Bulk cancel allocations response."""

    cancelled_ids: list[int] = Field(default_factory=list, description="取消成功した引当ID")
    failed_ids: list[int] = Field(default_factory=list, description="取消失敗した引当ID")
    message: str


class AutoAllocateRequest(BaseSchema):
    """Auto-allocate request using FEFO strategy."""

    order_line_id: int = Field(..., description="対象の受注明細ID")
    strategy: str = Field(default="fefo", description="引当戦略 (fefo)")


class AutoAllocateResponse(BaseSchema):
    """Auto-allocate response."""

    order_line_id: int
    allocated_lots: list[FefoLotAllocation] = Field(default_factory=list)
    total_allocated: Decimal = Field(default=Decimal("0"), decimal_places=3)
    remaining_quantity: Decimal = Field(default=Decimal("0"), decimal_places=3)
    message: str


class BulkAutoAllocateRequest(BaseSchema):
    """Bulk auto-allocate request for group-based FEFO allocation."""

    product_id: int | None = Field(None, description="製品ID（指定時はその製品のみ対象）")
    customer_id: int | None = Field(None, description="得意先ID（指定時はその得意先のみ対象）")
    delivery_place_id: int | None = Field(
        None, description="納入先ID（指定時はその納入先のみ対象）"
    )
    order_type: str | None = Field(
        None,
        pattern="^(FORECAST_LINKED|KANBAN|SPOT|ORDER)$",
        description="受注タイプでフィルタ",
    )
    skip_already_allocated: bool = Field(
        default=True, description="既に全量引当済みの明細をスキップ"
    )


class BulkAutoAllocateFailedLine(BaseSchema):
    """Failed line in bulk auto-allocate response."""

    line_id: int
    error: str


class BulkAutoAllocateResponse(BaseSchema):
    """Bulk auto-allocate response."""

    processed_lines: int = Field(default=0, description="処理した受注明細数")
    allocated_lines: int = Field(default=0, description="引当を作成した明細数")
    total_allocations: int = Field(default=0, description="作成した引当レコード数")
    skipped_lines: int = Field(default=0, description="スキップした明細数（既に引当済み等）")
    failed_lines: list[BulkAutoAllocateFailedLine] = Field(
        default_factory=list, description="失敗した明細"
    )
    message: str


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
    warehouse_code: str | None = None
    warehouse_name: str | None = None
    expiry_date: date | None = None
    received_date: date | None = None
    delivery_place_id: int | None = None
    delivery_place_name: str | None = None
    internal_unit: str | None = None
    external_unit: str | None = None
    qty_per_internal_unit: float | None = None
    status: str = "active"
    lock_reason: str | None = None


# Using generic ListResponse[T] for consistency
CandidateLotsResponse = ListResponse[CandidateLotItem]
"""Candidate lots list response."""


# ============================================================
# Allocation Response (引当実績レスポンス)
# ============================================================


class AllocationDetail(BaseSchema):
    """Allocation detail (DDL: allocations)."""

    id: int
    order_line_id: int
    lot_id: int
    allocated_quantity: Decimal = Field(..., decimal_places=3)
    allocation_type: str = Field(
        default="soft", pattern="^(soft|hard)$", description="soft: 推奨引当, hard: 確定引当"
    )
    status: str = Field(..., pattern="^(allocated|provisional|shipped|cancelled)$")
    confirmed_at: datetime | None = None
    confirmed_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    # Flattened Lot Info
    lot_number: str | None = None


# Using generic ListResponse[T] for consistency
AllocationListResponse = ListResponse[AllocationDetail]
"""Allocation list response."""


# ============================================================
# Hard Allocation Confirm (確定引当)
# ============================================================


class HardAllocationConfirmRequest(BaseSchema):
    """Hard allocation confirm request (Soft → Hard)."""

    confirmed_by: str | None = Field(None, description="確定操作を行うユーザーID")
    quantity: Decimal | None = Field(
        None, gt=0, decimal_places=3, description="部分確定の場合の数量（未指定で全量確定）"
    )


class HardAllocationConfirmResponse(BaseSchema):
    """Hard allocation confirm response."""

    id: int
    order_line_id: int
    lot_id: int
    allocated_quantity: Decimal = Field(..., decimal_places=3)
    allocation_type: str = Field(..., pattern="^(hard)$")
    status: str = Field(..., pattern="^(allocated)$")
    confirmed_at: datetime
    confirmed_by: str | None = None


class HardAllocationBatchConfirmRequest(BaseSchema):
    """Hard allocation batch confirm request."""

    allocation_ids: list[int] = Field(..., min_length=1, description="確定対象の引当ID一覧")
    confirmed_by: str | None = Field(None, description="確定操作を行うユーザーID")


class HardAllocationBatchFailedItem(BaseSchema):
    """Failed item in batch confirm response."""

    id: int
    error: str
    message: str


class HardAllocationBatchConfirmResponse(BaseSchema):
    """Hard allocation batch confirm response."""

    confirmed: list[int] = Field(default_factory=list, description="確定成功した引当ID")
    failed: list[HardAllocationBatchFailedItem] = Field(
        default_factory=list, description="確定失敗した引当"
    )


# ============================================================
# Backward Compatibility Aliases (v2.1 互換)
# ============================================================


class DragAssignRequest(BaseSchema):
    """Deprecated: Use ManualAllocationRequest instead."""

    order_line_id: int
    lot_id: int
    allocated_quantity: Decimal | None = Field(None, decimal_places=3)
    allocate_qty: Decimal | None = Field(None, description="Deprecated: use allocated_quantity")


class DragAssignResponse(BaseSchema):
    """Deprecated: Use ManualAllocationResponse instead."""

    success: bool
    message: str
    allocation_id: int
    remaining_lot_qty: Decimal | None = None


class AllocationSuggestionManualRequest(ManualAllocationRequest):
    """Deprecated: Use ManualAllocationRequest instead."""

    quantity: Decimal | None = Field(None, description="Deprecated: use allocated_quantity")


class AllocationSuggestionManualResponse(ManualAllocationResponse):
    """Deprecated: Use ManualAllocationResponse instead."""

    suggested_quantity: Decimal | None = Field(
        None, description="Deprecated: use allocated_quantity"
    )
