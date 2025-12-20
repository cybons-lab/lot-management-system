"""RPA Run related schemas for Material Delivery Note workflow."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class RpaRunItemResponse(BaseModel):
    """RPA Run Item response schema."""

    id: int
    row_no: int
    status: str | None = None
    destination: str | None = None
    layer_code: str | None = None
    material_code: str | None = None
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

    model_config = {"from_attributes": True}


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


class RpaRunBatchUpdateRequest(BaseModel):
    """RPA Run Batch update request schema."""

    item_ids: list[int]
    update_data: RpaRunItemUpdateRequest


class RpaRunResponse(BaseModel):
    """RPA Run response schema."""

    id: int
    rpa_type: str
    status: str
    started_at: datetime | None = None
    started_by_user_id: int | None = None
    started_by_username: str | None = None
    step2_executed_at: datetime | None = None
    step2_executed_by_user_id: int | None = None
    step2_executed_by_username: str | None = None
    external_done_at: datetime | None = None
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
    data_start_date: date | None = None
    data_end_date: date | None = None
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
