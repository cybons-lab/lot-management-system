"""SmartRead OCR schemas for API requests/responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SmartReadConfigCreate(BaseModel):
    """設定作成リクエスト."""

    name: str = Field(..., max_length=100, description="設定名")
    endpoint: str = Field(..., description="SmartRead APIエンドポイント")
    api_key: str = Field(..., description="APIキー")
    template_ids: str | None = Field(default=None, description="テンプレートID（カンマ区切り）")
    export_type: str = Field(default="json", description="エクスポートタイプ (json/csv)")
    aggregation_type: str | None = Field(default=None, description="集約タイプ")
    watch_dir: str | None = Field(default=None, description="監視ディレクトリ")
    export_dir: str | None = Field(default=None, description="出力ディレクトリ")
    input_exts: str | None = Field(default="pdf,png,jpg,jpeg", description="対応拡張子")
    description: str | None = Field(default=None, description="説明")
    is_active: bool = Field(default=True, description="有効/無効")
    is_default: bool = Field(default=False, description="デフォルト設定")


class SmartReadConfigUpdate(BaseModel):
    """設定更新リクエスト."""

    name: str | None = Field(default=None, max_length=100)
    endpoint: str | None = None
    api_key: str | None = None
    template_ids: str | None = None
    export_type: str | None = None
    aggregation_type: str | None = None
    watch_dir: str | None = None
    export_dir: str | None = None
    input_exts: str | None = None
    description: str | None = None
    is_active: bool | None = None
    is_default: bool | None = None


class SmartReadConfigResponse(BaseModel):
    """設定レスポンス."""

    id: int
    name: str
    endpoint: str
    # api_key: str  # Security: Do not expose API key
    template_ids: str | None
    export_type: str
    aggregation_type: str | None
    watch_dir: str | None
    export_dir: str | None
    input_exts: str | None
    description: str | None
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SmartReadAnalyzeRequest(BaseModel):
    """解析リクエスト（JSONベースのリクエスト用）."""

    config_id: int = Field(..., description="使用する設定のID")


class SmartReadAnalyzeResponse(BaseModel):
    """解析レスポンス."""

    success: bool
    filename: str
    data: list[dict[str, Any]]
    error_message: str | None = None


class SmartReadProcessRequest(BaseModel):
    """ファイル処理リクエスト."""

    filenames: list[str] = Field(..., description="処理するファイル名のリスト")


# ==================== タスク・Export系スキーマ ====================


class SmartReadTaskResponse(BaseModel):
    """タスクレスポンス."""

    task_id: str
    name: str
    status: str  # RUNNING | SUCCEEDED | FAILED
    created_at: str | None = None
    request_count: int = 0


class SmartReadTaskListResponse(BaseModel):
    """タスク一覧レスポンス."""

    tasks: list[SmartReadTaskResponse]


class SmartReadExportResponse(BaseModel):
    """エクスポートレスポンス."""

    export_id: str
    state: str  # RUNNING | SUCCEEDED | FAILED
    task_id: str | None = None
    error_message: str | None = None


class SmartReadExportRequest(BaseModel):
    """エクスポート作成リクエスト."""

    export_type: str = Field(default="csv", description="エクスポート形式 (csv/json)")


class SmartReadTransformRequest(BaseModel):
    """CSV横→縦変換リクエスト."""

    wide_data: list[dict[str, Any]] = Field(..., description="横持ちデータ")
    skip_empty: bool = Field(default=True, description="空明細をスキップするか")


class SmartReadValidationError(BaseModel):
    """バリデーションエラー."""

    row: int
    field: str
    message: str
    value: str | None = None


class SmartReadTransformResponse(BaseModel):
    """CSV横→縦変換レスポンス."""

    long_data: list[dict[str, Any]] = Field(..., description="縦持ちデータ")
    errors: list[SmartReadValidationError] = Field(
        default_factory=list, description="バリデーションエラー"
    )


class SmartReadCsvDataResponse(BaseModel):
    """CSVデータレスポンス."""

    wide_data: list[dict[str, Any]] = Field(..., description="横持ちデータ（OCR結果）")
    long_data: list[dict[str, Any]] = Field(..., description="縦持ちデータ（変換後）")
    errors: list[SmartReadValidationError] = Field(
        default_factory=list, description="バリデーションエラー"
    )
    filename: str | None = Field(default=None, description="CSVファイル名")


# ==================== タスク管理系スキーマ ====================


class SmartReadTaskCreateRequest(BaseModel):
    """タスク作成リクエスト."""

    config_id: int = Field(..., description="設定ID")
    task_date: str = Field(..., description="タスク日付 (YYYY-MM-DD)")
    name: str | None = Field(default=None, description="タスク名")


class SmartReadTaskDetailResponse(BaseModel):
    """タスク詳細レスポンス."""

    id: int
    config_id: int
    task_id: str
    task_date: str
    name: str | None
    state: str | None
    synced_at: str | None
    skip_today: bool
    created_at: str

    model_config = {"from_attributes": True}


class SmartReadSkipTodayRequest(BaseModel):
    """skip_todayフラグ更新リクエスト."""

    skip_today: bool = Field(..., description="今日スキップするか")


# ==================== requestId/results ルート系スキーマ ====================


class SmartReadRequestResponse(BaseModel):
    """リクエスト状態レスポンス."""

    id: int
    request_id: str
    task_id: str
    task_date: str
    config_id: int
    filename: str | None
    num_of_pages: int | None
    submitted_at: str
    state: str  # PENDING | OCR_RUNNING | OCR_COMPLETED | OCR_FAILED | ...
    error_message: str | None
    completed_at: str | None
    created_at: str

    model_config = {"from_attributes": True}


class SmartReadProcessAutoRequest(BaseModel):
    """自動処理リクエスト（requestIdルート用）."""

    filenames: list[str] = Field(..., description="処理するファイル名のリスト")
    use_daily_task: bool = Field(default=True, description="1日1タスク運用を使用するか")


class SmartReadProcessAutoResponse(BaseModel):
    """自動処理レスポンス（requestIdルート用）."""

    task_id: str = Field(..., description="タスクID")
    task_name: str = Field(..., description="タスク名 (OCR_YYYYMMDD)")
    requests: list[SmartReadRequestResponse] = Field(..., description="投入されたリクエスト一覧")
    message: str = Field(default="処理を開始しました", description="メッセージ")


class SmartReadEventData(BaseModel):
    """SSEイベントデータ."""

    event_type: str = Field(
        ..., description="イベントタイプ (request_submitted | request_completed | request_failed)"
    )
    request_id: str = Field(..., description="リクエストID")
    task_id: str = Field(..., description="タスクID")
    filename: str | None = Field(default=None, description="ファイル名")
    state: str = Field(..., description="状態")
    message: str | None = Field(default=None, description="メッセージ")
    wide_count: int | None = Field(default=None, description="横持ちデータ件数")
    long_count: int | None = Field(default=None, description="縦持ちデータ件数")


class SmartReadRequestListResponse(BaseModel):
    """リクエスト一覧レスポンス."""

    requests: list[SmartReadRequestResponse] = Field(..., description="リクエスト一覧")


class SmartReadLongDataResponse(BaseModel):
    """縦持ちデータレスポンス."""

    id: int
    config_id: int
    task_id: str
    task_date: str
    request_id_ref: int | None
    row_index: int
    content: dict[str, Any]
    status: str  # PENDING | IMPORTED | ERROR
    error_reason: str | None
    created_at: str

    model_config = {"from_attributes": True}


class SmartReadLongDataListResponse(BaseModel):
    """縦持ちデータ一覧レスポンス."""

    data: list[SmartReadLongDataResponse] = Field(..., description="縦持ちデータ一覧")
    total: int = Field(..., description="総件数")


class SmartReadSaveLongDataRequest(BaseModel):
    """縦持ちデータ保存リクエスト."""

    config_id: int = Field(..., description="設定ID")
    task_id: str = Field(..., description="タスクID")
    task_date: str = Field(..., description="タスク日付 (YYYY-MM-DD)")
    wide_data: list[dict[str, Any]] = Field(..., description="横持ちデータ")
    long_data: list[dict[str, Any]] = Field(..., description="縦持ちデータ")
    filename: str | None = Field(default=None, description="ファイル名")


class SmartReadSaveLongDataResponse(BaseModel):
    """縦持ちデータ保存レスポンス."""

    success: bool = Field(..., description="保存成功フラグ")
    saved_wide_count: int = Field(..., description="保存した横持ちデータ件数")
    saved_long_count: int = Field(..., description="保存した縦持ちデータ件数")
    message: str = Field(..., description="メッセージ")
