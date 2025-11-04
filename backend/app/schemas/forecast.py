# backend/app/schemas/forecast.py
"""
フォーキャスト関連のPydanticスキーマ
"""

from datetime import date, datetime
from typing import Dict, List, Literal, Optional  # 🔽 [追加] Dict

from .base import BaseSchema, TimestampMixin


# --- Forecast Basic ---
class ForecastBase(BaseSchema):
    """フォーキャスト基本スキーマ"""

    forecast_id: str  # UUID等の一意識別子
    product_id: str
    customer_id: str
    supplier_id: str
    granularity: Literal["daily", "dekad", "monthly"]
    qty_forecast: int
    version_no: int = 1
    source_system: str = "external"
    is_active: bool = True

    # 粒度別の期間フィールド（排他的）
    date_day: Optional[date] = None
    date_dekad_start: Optional[date] = None
    year_month: Optional[str] = None  # 'YYYY-MM'


class ForecastCreate(BaseSchema):
    """フォーキャスト作成リクエスト"""

    forecast_id: str
    product_id: str
    customer_id: str
    supplier_id: str
    granularity: Literal["daily", "dekad", "monthly"]
    qty_forecast: int
    version_no: int = 1
    version_issued_at: datetime
    source_system: str = "external"
    is_active: bool = True

    # 粒度別の期間フィールド
    date_day: Optional[date] = None
    date_dekad_start: Optional[date] = None
    year_month: Optional[str] = None


class ForecastUpdate(BaseSchema):
    """フォーキャスト更新リクエスト"""

    qty_forecast: Optional[int] = None
    is_active: Optional[bool] = None


class ForecastResponse(ForecastBase, TimestampMixin):
    """フォーキャストレスポンス"""

    id: int
    version_issued_at: datetime


# --- Bulk Import ---
class ForecastBulkImportRequest(BaseSchema):
    """一括インポートリクエスト"""

    version_no: int
    version_issued_at: datetime
    source_system: str = "external"
    deactivate_old_version: bool = True  # 旧バージョンを自動的に非アクティブ化
    forecasts: List[ForecastCreate]


class ForecastBulkImportResponse(BaseSchema):
    """一括インポートレスポンス"""

    success: bool
    message: str
    version_no: int
    imported_count: int
    skipped_count: int
    error_count: int
    error_details: Optional[str] = None


# --- Matching ---
class ForecastMatchRequest(BaseSchema):
    """マッチングリクエスト"""

    order_id: Optional[int] = None  # 特定受注のみ
    order_ids: Optional[List[int]] = None  # 複数受注
    date_from: Optional[date] = None  # 期間指定
    date_to: Optional[date] = None
    force_rematch: bool = False  # 既にマッチ済みでも再マッチング


class ForecastMatchResult(BaseSchema):
    """個別マッチング結果"""

    order_line_id: int
    order_no: str
    line_no: int
    product_code: str
    matched: bool
    forecast_id: Optional[int] = None
    forecast_granularity: Optional[str] = None
    forecast_match_status: Optional[str] = None
    forecast_qty: Optional[float] = None


class ForecastMatchResponse(BaseSchema):
    """マッチングレスポンス"""

    success: bool
    message: str
    total_lines: int
    matched_lines: int
    unmatched_lines: int
    results: List[ForecastMatchResult] = []


# --- Version Management ---
class ForecastVersionInfo(BaseSchema):
    """バージョン情報"""

    version_no: int
    version_issued_at: datetime
    is_active: bool
    forecast_count: int
    source_system: str


class ForecastVersionListResponse(BaseSchema):
    """バージョン一覧レスポンス"""

    versions: List[ForecastVersionInfo]


class ForecastActivateRequest(BaseSchema):
    """バージョンアクティブ化リクエスト"""

    version_no: int
    deactivate_others: bool = True  # 他のバージョンを非アクティブ化


class ForecastActivateResponse(BaseSchema):
    """バージョンアクティブ化レスポンス"""

    success: bool
    message: str
    activated_version: int
    deactivated_versions: List[int] = []


# ---
# 🔽 [ここから今回の機能追加分]
# ---


class ForecastItemOut(BaseSchema):
    """Forecast一覧（フロント表示用）"""

    id: int
    product_code: str
    product_name: str
    customer_code: str
    supplier_code: str
    granularity: str
    version_no: int
    updated_at: datetime  # 変更検知のため

    # フロントのモックデータに合わせたダミーフィールド
    # MVPでは固定値またはNoneを返す
    daily_data: Optional[Dict[str, float]] = None
    dekad_data: Optional[Dict[str, float]] = None
    monthly_data: Optional[Dict[str, float]] = None
    dekad_summary: Optional[Dict[str, float]] = None

    # フロントのモックデータに合わせたダミーフィールド (スキーマのみ)
    customer_name: Optional[str] = "得意先A (ダミー)"
    supplier_name: Optional[str] = "サプライヤーB (ダミー)"
    unit: str = "EA"
    version_history: List[dict] = []


class ForecastListResponse(BaseSchema):
    items: List[ForecastItemOut]
