"""Pydantic schemas for inventory adjustment with reason (Phase 11)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class LotReceiptQuantityUpdateRequest(BaseSchema):
    """Request payload for updating lot receipt quantity with reason."""

    new_quantity: Decimal = Field(..., ge=0, description="新しい入庫数量")
    reason: str = Field(..., min_length=1, max_length=500, description="調整理由（必須）")


class LotReceiptQuantityUpdateResponse(BaseSchema):
    """Response after lot receipt quantity update."""

    lot_receipt_id: int = Field(..., description="ロット入庫ID")
    old_quantity: Decimal = Field(..., description="変更前の数量")
    new_quantity: Decimal = Field(..., description="変更後の数量")
    adjustment_id: int = Field(..., description="在庫調整レコードID")
    message: str = Field(..., description="処理結果メッセージ")
