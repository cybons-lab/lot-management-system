"""
管理機能関連のPydanticスキーマ
"""

from typing import List, Optional

from pydantic import BaseModel

from .integration import OcrOrderRecord
from .inventory import LotCreate, ReceiptCreateRequest
from .masters import MasterBulkLoadResponse, ProductCreate


class FullSampleDataRequest(BaseModel):
    """
    一括サンプルデータ投入リクエスト

    注意: 投入順序が重要 (マスタ -> ロット -> 入荷/受注)
    """

    products: Optional[List[ProductCreate]] = None
    lots: Optional[List[LotCreate]] = None
    receipts: Optional[List[ReceiptCreateRequest]] = None
    orders: Optional[List[OcrOrderRecord]] = None


class DashboardStatsResponse(BaseModel):
    """
    ダッシュボード統計レスポンス
    """

    total_stock: float
    total_orders: int
    unallocated_orders: int


class AdminPresetListResponse(BaseModel):
    """プリセット名の一覧レスポンス。"""

    presets: List[str]


class AdminPresetLoadResponse(BaseModel):
    """プリセット投入結果。"""

    preset: str
    result: MasterBulkLoadResponse
