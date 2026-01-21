"""RPA Run related schemas for Material Delivery Note workflow."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class RpaRunItemResponse(BaseModel):
    """RPA Run Item response schema."""

    id: int
    run_id: int = Field(..., description="所属するRPA RunのID")
    row_no: int
    status: str | None = None
    # フィールド名統一: jiku_code (表示名: 出荷先)
    jiku_code: str | None = Field(default=None, alias="destination")
    layer_code: str | None = None
    # フィールド名統一: external_product_code (表示名: 材質コード)
    external_product_code: str | None = Field(default=None, alias="material_code")
    delivery_date: date | None = None
    delivery_quantity: int | None = None
    shipping_vehicle: str | None = None
    issue_flag: bool = False
    complete_flag: bool = False
    match_result: bool | None = None
    sap_registered: bool | None = None
    order_no: str | None = None
    result_status: str | None = None
    maker_name: str | None = None
    lock_flag: bool = False
    item_no: str | None = None
    lot_no: str | None = None
    # マスタ参照ログ
    complement_customer_id: int | None = Field(None, description="参照したマスタのcustomer_id")
    complement_external_product_code: str | None = Field(
        None, description="参照したマスタのexternal_product_code"
    )
    complement_match_type: str | None = Field(
        None, description="検索種別（exact: 完全一致, prefix: 前方一致）"
    )
    processing_started_at: datetime | None = Field(None, description="処理開始日時")
    locked_until: datetime | None = Field(None, description="ロック期限")
    locked_by: str | None = Field(None, description="ロック取得者")
    result_pdf_path: str | None = Field(None, description="PDF保存パス")
    result_message: str | None = Field(None, description="成功メッセージ")
    last_error_code: str | None = Field(None, description="エラーコード")
    last_error_message: str | None = Field(None, description="エラーメッセージ")
    last_error_screenshot_path: str | None = Field(None, description="スクリーンショット保存パス")

    model_config = {"from_attributes": True, "populate_by_name": True}


class RpaRunItemUpdateRequest(BaseModel):
    """RPA Run Item update request schema."""

    issue_flag: bool | None = None
    complete_flag: bool | None = None
    delivery_quantity: int | None = Field(default=None, ge=0)
    result_status: str | None = None
    sap_registered: bool | None = None
    lot_no: str | None = None


class RpaRunResultUpdateRequest(BaseModel):
    """RPA Run Result update request schema (PAD)."""

    result_status: str | None = None
    sap_registered: bool | None = None
    issue_flag: bool | None = None


class RpaRunItemSuccessRequest(BaseModel):
    """RPA Run Item success report request schema (PAD loop)."""

    pdf_path: str | None = Field(None, description="PDF保存パス（OneDrive等）")
    message: str | None = Field(None, description="任意メッセージ")
    lock_owner: str | None = Field(None, description="ロック取得者（任意）")


class RpaRunItemFailureRequest(BaseModel):
    """RPA Run Item failure report request schema (PAD loop)."""

    error_code: str | None = Field(None, description="エラーコード")
    error_message: str | None = Field(None, description="エラーメッセージ")
    screenshot_path: str | None = Field(None, description="スクリーンショット保存パス")
    lock_owner: str | None = Field(None, description="ロック取得者（任意）")


class LoopErrorCodeCount(BaseModel):
    """PADループ失敗コード集計."""

    error_code: str
    count: int


class LoopSummaryResponse(BaseModel):
    """PADループ集計レスポンス."""

    total: int
    queued: int
    pending: int
    processing: int
    success: int
    failure: int
    done: int
    remaining: int
    percent: float
    last_activity_at: datetime | None
    error_code_counts: list[LoopErrorCodeCount] = Field(default_factory=list)


class ActivityItemResponse(BaseModel):
    """PADループの実行ログアイテム."""

    item_id: int
    row_no: int
    result_status: str | None = None
    updated_at: datetime | None = None
    result_message: str | None = None
    result_pdf_path: str | None = None
    last_error_code: str | None = None
    last_error_message: str | None = None
    last_error_screenshot_path: str | None = None
    locked_by: str | None = None
    locked_until: datetime | None = None


class RpaRunEventResponse(BaseModel):
    """Run制御イベントレスポンス."""

    id: int
    run_id: int
    event_type: str
    message: str | None = None
    created_at: datetime
    created_by_user_id: int | None = None

    model_config = {"from_attributes": True}


class RpaRunEventCreateRequest(BaseModel):
    """Run制御イベント作成リクエスト."""

    event_type: str
    message: str | None = None


class RpaRunFetchCreateRequest(BaseModel):
    """Step1取得結果作成リクエスト."""

    start_date: date | None = None
    end_date: date | None = None
    status: str
    item_count: int | None = None
    run_created: int | None = None
    run_updated: int | None = None
    message: str | None = None


class RpaRunFetchResponse(BaseModel):
    """Step1取得結果レスポンス."""

    id: int
    rpa_type: str
    start_date: date | None = None
    end_date: date | None = None
    status: str
    item_count: int | None = None
    run_created: int | None = None
    run_updated: int | None = None
    message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RpaRunBatchUpdateRequest(BaseModel):
    """RPA Run Batch update request schema."""

    item_ids: list[int]
    update_data: RpaRunItemUpdateRequest


class RpaRunResponse(BaseModel):
    """RPA Run response schema."""

    id: int
    rpa_type: str
    status: str
    run_group_id: int | None = None
    customer_id: int | None = Field(None, description="処理対象得意先ID")
    data_start_date: date | None = Field(None, description="データ期間開始日")
    data_end_date: date | None = Field(None, description="データ期間終了日")
    progress_percent: float | None = None
    estimated_minutes: int | None = None
    paused_at: datetime | None = None
    cancelled_at: datetime | None = None
    started_at: datetime | None = None
    started_by_user_id: int | None = None
    started_by_username: str | None = None
    step2_executed_at: datetime | None = None
    step2_executed_by_user_id: int | None = None
    step2_executed_by_username: str | None = None
    external_done_at: datetime | None = None
    external_done_by_user_id: int | None = Field(None, description="外部処理完了ユーザーID")
    external_done_by_username: str | None = None
    step4_executed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    item_count: int = 0
    complete_count: int = 0
    issue_count: int = 0
    all_items_complete: bool = False
    items: list[RpaRunItemResponse] = []

    model_config = {"from_attributes": True}


class RpaRunSummaryResponse(BaseModel):
    """RPA Run summary response schema (for list views)."""

    id: int
    rpa_type: str
    status: str
    run_group_id: int | None = None
    data_start_date: date | None = None
    data_end_date: date | None = None
    progress_percent: float | None = None
    estimated_minutes: int | None = None
    paused_at: datetime | None = None
    cancelled_at: datetime | None = None
    started_at: datetime | None = None
    started_by_username: str | None = None
    step2_executed_at: datetime | None = None
    external_done_at: datetime | None = None
    step4_executed_at: datetime | None = None
    created_at: datetime
    item_count: int = 0
    complete_count: int = 0
    issue_count: int = 0
    all_items_complete: bool = False
    updated_at: datetime

    model_config = {"from_attributes": True}


class RpaRunListResponse(BaseModel):
    """RPA Run list response schema."""

    runs: list[RpaRunSummaryResponse]
    total: int


class RpaRunCreateResponse(BaseModel):
    """RPA Run create response schema."""

    id: int
    status: str
    item_count: int
    message: str


class Step2ExecuteRequest(BaseModel):
    """Step2 execution request schema."""

    flow_url: str | None = Field(
        default=None, description="Power Automate Cloud FlowのHTTP Trigger URL"
    )
    json_payload: str = Field(
        default="{}",
        description="Flowに送信するJSONペイロード（文字列）",
    )
    start_date: date | None = Field(default=None, description="開始日")
    end_date: date | None = Field(default=None, description="終了日")


class Step2ExecuteResponse(BaseModel):
    """Step2 execution response schema."""

    status: str
    message: str
    executed_at: datetime
    flow_response: dict | None = Field(default=None, description="Flow応答")


class MaterialDeliveryNoteExecuteRequest(BaseModel):
    """素材納品書発行実行リクエスト（Power Automate Cloud Flow用）."""

    flow_url: str = Field(..., description="Power Automate Cloud FlowのHTTP Trigger URL")
    json_payload: str = Field(
        default="{}",
        description="Flowに送信するJSONペイロード（文字列）",
    )
    start_date: date = Field(..., description="開始日")
    end_date: date = Field(..., description="終了日")


class MaterialDeliveryNoteExecuteResponse(BaseModel):
    """素材納品書発行実行レスポンス."""

    status: str = Field(..., description="実行ステータス (success, error, locked)")
    message: str = Field(..., description="メッセージ")
    flow_response: dict | None = Field(default=None, description="Flow応答")


# ロット候補関連スキーマ
class LotCandidateResponse(BaseModel):
    """ロット候補のレスポンス."""

    lot_id: int
    lot_number: str
    available_qty: float = Field(..., description="利用可能数量")
    expiry_date: date | None = Field(default=None, description="有効期限")
    received_date: date | None = Field(default=None, description="入荷日")
    supplier_name: str | None = Field(default=None, description="仕入先名")


class LotSuggestionsResponse(BaseModel):
    """ロット候補一覧のレスポンス."""

    lots: list[LotCandidateResponse] = Field(default_factory=list, description="ロット候補一覧")
    auto_selected: str | None = Field(
        default=None,
        description="候補が1つの場合の自動選択ロット番号",
    )
    source: str = Field(
        default="none",
        description="マッピング元 (customer_item, product_only, none)",
    )
