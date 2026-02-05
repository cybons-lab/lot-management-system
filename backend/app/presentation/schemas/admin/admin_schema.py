"""管理機能関連のPydanticスキーマ."""

from __future__ import annotations

from pydantic import BaseModel

from app.presentation.schemas.inventory.inventory_schema import LotCreate
from app.presentation.schemas.masters.masters_schema import MasterBulkLoadResponse


class FullSampleDataRequest(BaseModel):
    """一括サンプルデータ投入リクエスト.

    注意: 投入順序が重要 (マスタ -> ロット -> 受注)
    """

    lots: list[LotCreate] | None = None
    orders: list[FullSampleOrderRequest] | None = None


class FullSampleOrderRequest(BaseModel):
    """一括サンプルデータ投入時の受注簡易入力."""

    customer_code: str | None = None


class DashboardStatsResponse(BaseModel):
    """ダッシュボード統計レスポンス."""

    total_stock: float
    total_orders: int
    unallocated_orders: int
    allocation_rate: float  # 引当率 (0-100)


class AdminPresetListResponse(BaseModel):
    """プリセット名の一覧レスポンス。."""

    presets: list[str]


class AdminPresetLoadResponse(BaseModel):
    """プリセット投入結果。."""

    preset: str
    result: MasterBulkLoadResponse
