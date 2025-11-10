# backend/app/schemas/forecast.py
"""フォーキャスト関連のPydanticスキーマ."""

from datetime import date, datetime
from typing import Literal  # 🔽 [追加] Dict

from .base import BaseSchema, TimestampMixin


# --- Forecast Basic ---
class ForecastBase(BaseSchema):
    """フォーキャスト基本スキーマ (共通項目)."""

    product_id: str
    customer_id: str
    granularity: Literal["daily", "dekad", "monthly"]
    qty_forecast: int
    version_no: int = 1
    source_system: str = "external"
    is_active: bool = True

    # 粒度別の期間フィールド（排他的）
    date_day: date | None = None
    date_dekad_start: date | None = None
    year_month: str | None = None  # 'YYYY-MM'


class ForecastCreate(ForecastBase):
    """フォーキャスト作成リクエスト."""

    version_issued_at: datetime


class ForecastUpdate(BaseSchema):
    """フォーキャスト更新リクエスト."""

    qty_forecast: int | None = None
    is_active: bool | None = None


class ForecastResponse(ForecastBase, TimestampMixin):
    """フォーキャストレスポンス."""

    id: int
    forecast_id: int | None = None
    supplier_id: str | None = None
    version_issued_at: datetime


# --- Bulk Import ---
class ForecastBulkImportRequest(BaseSchema):
    """一括インポートリクエスト."""

    version_no: int
    version_issued_at: datetime
    source_system: str = "external"
    deactivate_old_version: bool = True  # 旧バージョンを自動的に非アクティブ化
    forecasts: list[ForecastCreate]


class ForecastBulkImportResponse(BaseSchema):
    """一括インポートレスポンス."""

    success: bool
    message: str
    version_no: int
    imported_count: int
    skipped_count: int
    error_count: int
    error_details: str | None = None


# --- Matching ---
class ForecastMatchRequest(BaseSchema):
    """マッチングリクエスト."""

    order_id: int | None = None  # 特定受注のみ
    order_ids: list[int] | None = None  # 複数受注
    date_from: date | None = None  # 期間指定
    date_to: date | None = None
    force_rematch: bool = False  # 既にマッチ済みでも再マッチング


class ForecastMatchResult(BaseSchema):
    """個別マッチング結果."""

    order_line_id: int
    order_no: str
    line_no: int
    product_code: str
    matched: bool
    forecast_id: int | None = None
    forecast_granularity: str | None = None
    forecast_match_status: str | None = None
    forecast_qty: float | None = None


class ForecastMatchResponse(BaseSchema):
    """マッチングレスポンス."""

    success: bool
    message: str
    total_lines: int
    matched_lines: int
    unmatched_lines: int
    results: list[ForecastMatchResult] = []


# --- Version Management ---
class ForecastVersionInfo(BaseSchema):
    """バージョン情報."""

    version_no: int
    version_issued_at: datetime
    is_active: bool
    forecast_count: int
    source_system: str


class ForecastVersionListResponse(BaseSchema):
    """バージョン一覧レスポンス."""

    versions: list[ForecastVersionInfo]


class ForecastActivateRequest(BaseSchema):
    """バージョンアクティブ化リクエスト."""

    version_no: int
    deactivate_others: bool = True  # 他のバージョンを非アクティブ化


class ForecastActivateResponse(BaseSchema):
    """バージョンアクティブ化レスポンス."""

    success: bool
    message: str
    activated_version: int
    deactivated_versions: list[int] = []


# ---
# 🔽 [ここから今回の機能追加分]
# ---


class ForecastItemOut(BaseSchema):
    """Forecast一覧（フロント表示用）."""

    id: int
    product_code: str
    product_name: str
    customer_code: str
    supplier_code: str | None = None
    granularity: str
    version_no: int
    updated_at: datetime  # 変更検知のため

    # フロントのモックデータに合わせたダミーフィールド
    # MVPでは固定値またはNoneを返す
    daily_data: dict[str, float] | None = None
    dekad_data: dict[str, float] | None = None
    monthly_data: dict[str, float] | None = None
    dekad_summary: dict[str, float] | None = None

    # フロントのモックデータに合わせたダミーフィールド (スキーマのみ)
    customer_name: str | None = "得意先A (ダミー)"
    supplier_name: str | None = "サプライヤーB (ダミー)"
    unit: str = "EA"
    version_history: list[dict] = []


class ForecastListResponse(BaseSchema):
    items: list[ForecastItemOut]
