"""SAP Integration schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SAPOrderRegistrationRequest(BaseModel):
    """Request schema for SAP order registration."""

    order_ids: list[int] = Field(..., description="List of Order IDs to register")


class SAPOrderRegistrationResult(BaseModel):
    """Result for a single order registration."""

    order_id: int
    sap_order_no: str
    status: str


class SAPOrderRegistrationResponse(BaseModel):
    """Response schema for SAP order registration."""

    status: str
    registered_count: int
    results: list[SAPOrderRegistrationResult]


# ============================================================
# SAP Material Download & Reconciliation Schemas
# ============================================================


class SapConnectionResponse(BaseModel):
    """SAP接続情報レスポンス."""

    id: int
    name: str
    environment: str
    description: str | None
    ashost: str
    sysnr: str
    client: str
    user_name: str
    lang: str
    default_bukrs: str
    default_kunnr: str | None
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SapConnectionCreateRequest(BaseModel):
    """SAP接続情報作成リクエスト."""

    name: str = Field(..., description="接続名")
    environment: str = Field(..., description="環境（production/test）")
    description: str | None = Field(None, description="説明")
    ashost: str = Field(..., description="SAPホスト")
    sysnr: str = Field(..., description="システム番号")
    client: str = Field(..., description="クライアント番号")
    user_name: str = Field(..., description="ユーザー名")
    passwd: str = Field(..., description="パスワード（暗号化されて保存）")
    lang: str = Field("JA", description="言語")
    default_bukrs: str = Field("10", description="デフォルト会社コード")
    default_kunnr: str | None = Field(None, description="デフォルト得意先コード")
    is_default: bool = Field(False, description="デフォルト接続にする")


class SapConnectionUpdateRequest(BaseModel):
    """SAP接続情報更新リクエスト."""

    name: str | None = Field(None, description="接続名")
    environment: str | None = Field(None, description="環境（production/test）")
    description: str | None = Field(None, description="説明")
    ashost: str | None = Field(None, description="SAPホスト")
    sysnr: str | None = Field(None, description="システム番号")
    client: str | None = Field(None, description="クライアント番号")
    user_name: str | None = Field(None, description="ユーザー名")
    passwd: str | None = Field(None, description="パスワード（空=変更なし）")
    lang: str | None = Field(None, description="言語")
    default_bukrs: str | None = Field(None, description="デフォルト会社コード")
    default_kunnr: str | None = Field(None, description="デフォルト得意先コード")
    is_default: bool | None = Field(None, description="デフォルト接続にする")
    is_active: bool | None = Field(None, description="有効/無効")


class SapConnectionTestResponse(BaseModel):
    """SAP接続テスト結果."""

    success: bool
    message: str
    details: dict[str, Any] | None = None
    duration_ms: int


class SapMaterialFetchRequest(BaseModel):
    """SAPマテリアル取得リクエスト."""

    connection_id: int | None = Field(None, description="接続ID（省略時はデフォルト）")
    kunnr_f: str | None = Field(None, description="得意先コードFrom")
    kunnr_t: str | None = Field(None, description="得意先コードTo")
    bukrs: str = Field("10", description="会社コード")
    zaiko: str = Field("X", description="在庫品フラグ")
    limit: int | None = Field(None, description="取得件数上限")


class SapMaterialFetchResponse(BaseModel):
    """SAPマテリアル取得レスポンス."""

    success: bool
    fetch_batch_id: str
    record_count: int
    cached_count: int
    error_message: str | None
    duration_ms: int


class SapMaterialCacheResponse(BaseModel):
    """SAPキャッシュレスポンス."""

    id: int
    connection_id: int
    zkdmat_b: str
    kunnr: str
    raw_data: dict[str, Any]
    fetched_at: datetime
    fetch_batch_id: str | None

    model_config = {"from_attributes": True}


class SapReconcileRequest(BaseModel):
    """突合リクエスト."""

    task_date: str | None = Field(None, description="タスク日付（YYYY-MM-DD）")
    config_id: int | None = Field(None, description="SmartRead設定ID")
    customer_code: str = Field("100427105", description="得意先コード")


class SapReconcileResultResponse(BaseModel):
    """1行の突合結果."""

    material_code: str | None
    jiku_code: str | None
    customer_code: str
    sap_match_type: str  # exact/prefix/not_found
    sap_matched_zkdmat_b: str | None
    sap_raw_data: dict[str, Any] | None
    master_match_type: str  # matched/not_found
    master_id: int | None
    master_customer_part_no: str | None
    overall_status: str  # ok/warning/error
    messages: list[str]


class SapReconcileSummaryResponse(BaseModel):
    """突合サマリーレスポンス."""

    total_count: int
    ok_count: int
    warning_count: int
    error_count: int
    sap_exact_count: int
    sap_prefix_count: int
    sap_not_found_count: int
    master_matched_count: int
    master_not_found_count: int
    results: list[SapReconcileResultResponse]


class SapFetchLogResponse(BaseModel):
    """SAP取得ログレスポンス."""

    id: int
    connection_id: int
    fetch_batch_id: str
    rfc_name: str
    params: dict[str, Any]
    status: str
    record_count: int | None
    error_message: str | None
    duration_ms: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
