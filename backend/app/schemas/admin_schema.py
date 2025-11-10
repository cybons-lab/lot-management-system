"""管理機能関連のPydanticスキーマ."""

from pydantic import BaseModel

from .integration_schema import OcrOrderRecord
from .inventory_schema import LotCreate
from .masters_schema import MasterBulkLoadResponse, ProductCreate


class FullSampleDataRequest(BaseModel):
    """
    一括サンプルデータ投入リクエスト.

    注意: 投入順序が重要 (マスタ -> ロット -> 受注)
    """

    products: list[ProductCreate] | None = None
    lots: list[LotCreate] | None = None
    orders: list[OcrOrderRecord] | None = None


class DashboardStatsResponse(BaseModel):
    """ダッシュボード統計レスポンス."""

    total_stock: float
    total_orders: int
    unallocated_orders: int


class AdminPresetListResponse(BaseModel):
    """プリセット名の一覧レスポンス。."""

    presets: list[str]


class AdminPresetLoadResponse(BaseModel):
    """プリセット投入結果。."""

    preset: str
    result: MasterBulkLoadResponse
