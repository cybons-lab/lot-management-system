"""Pydantic schemas for smart lot split with allocation transfer (Phase 10.3)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class AllocationTransfer(BaseSchema):
    """Single allocation transfer instruction."""

    lot_id: int = Field(..., description="ソースロットID")
    delivery_place_id: int = Field(..., description="納入先ID")
    customer_id: int = Field(..., description="顧客ID")
    forecast_period: str = Field(..., description="予測期間（YYYY-MM-DD）")
    quantity: Decimal = Field(..., description="数量")
    target_lot_index: int = Field(
        ..., ge=0, description="移動先ロットインデックス（0=元, 1=新規1, ...）"
    )
    # Optional fields from original allocation
    coa_issue_date: str | None = Field(None, description="COA発行日")
    comment: str | None = Field(None, description="コメント")
    manual_shipment_date: str | None = Field(None, description="手動出荷日")


class SmartSplitRequest(BaseSchema):
    """Request payload for smart lot split with allocation transfer."""

    split_count: int = Field(..., ge=2, le=10, description="分割数（2-10）")
    allocation_transfers: list[AllocationTransfer] = Field(
        ..., description="割り当て移動指示のリスト"
    )


class SmartSplitResponse(BaseSchema):
    """Response after smart lot split operation."""

    original_lot_id: int = Field(..., description="元のロットID")
    new_lot_ids: list[int] = Field(..., description="新規作成されたロットIDのリスト（元含む）")
    split_quantities: list[Decimal] = Field(..., description="各ロットの入庫数量")
    transferred_allocations: int = Field(..., description="移動した割り当て数")
    message: str = Field(..., description="処理結果メッセージ")
