"""SmartRead OCR schemas for API requests/responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SmartReadConfigCreate(BaseModel):
    """設定作成リクエスト."""

    name: str = Field(..., max_length=100, description="設定名")
    endpoint: str = Field(..., description="SmartRead APIエンドポイント")
    api_key: str = Field(..., description="APIキー")
    request_type: str = Field(default="sync", description="リクエストタイプ (sync/async)")
    template_ids: str | None = Field(default=None, description="テンプレートID（カンマ区切り）")
    export_type: str = Field(default="json", description="エクスポートタイプ (json/csv)")
    aggregation_type: str | None = Field(default=None, description="集約タイプ")
    watch_dir: str | None = Field(default=None, description="監視ディレクトリ")
    export_dir: str | None = Field(default=None, description="出力ディレクトリ")
    input_exts: str | None = Field(default="pdf,png,jpg,jpeg", description="対応拡張子")
    description: str | None = Field(default=None, description="説明")
    is_active: bool = Field(default=True, description="有効/無効")


class SmartReadConfigUpdate(BaseModel):
    """設定更新リクエスト."""

    name: str | None = Field(default=None, max_length=100)
    endpoint: str | None = None
    api_key: str | None = None
    request_type: str | None = None
    template_ids: str | None = None
    export_type: str | None = None
    aggregation_type: str | None = None
    watch_dir: str | None = None
    export_dir: str | None = None
    input_exts: str | None = None
    description: str | None = None
    is_active: bool | None = None


class SmartReadConfigResponse(BaseModel):
    """設定レスポンス."""

    id: int
    name: str
    endpoint: str
    # api_key: str  # Security: Do not expose API key
    request_type: str
    template_ids: str | None
    export_type: str
    aggregation_type: str | None
    watch_dir: str | None
    export_dir: str | None
    input_exts: str | None
    description: str | None
    is_active: bool
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
