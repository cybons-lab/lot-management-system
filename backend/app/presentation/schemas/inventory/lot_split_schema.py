"""Pydantic schemas for lot split operations (Phase 10.2)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import Field, field_validator

from app.presentation.schemas.common.base import BaseSchema


class LotSplitItem(BaseSchema):
    """Individual split quantity."""

    quantity: Decimal = Field(..., gt=0, description="分割後の数量")


class LotSplitRequest(BaseSchema):
    """Request payload for splitting a lot receipt."""

    splits: list[LotSplitItem] = Field(
        ..., min_length=2, description="分割する数量のリスト（最低2つ）"
    )

    @field_validator("splits")
    @classmethod
    def validate_splits(cls, v: list[LotSplitItem]) -> list[LotSplitItem]:
        """Validate split quantities."""
        if len(v) < 2:
            raise ValueError("分割は最低2つの数量が必要です")
        return v


class LotSplitResponse(BaseSchema):
    """Response after lot split operation."""

    original_lot_id: int = Field(..., description="元のロットID")
    new_lot_ids: list[int] = Field(..., description="新規作成されたロットIDのリスト")
    message: str = Field(..., description="処理結果メッセージ")
