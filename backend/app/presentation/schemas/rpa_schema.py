"""RPA (SAP Linkage) schemas."""

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class RpaOrderStartRequest(BaseModel):
    """RPA開始リクエスト (Frontend -> API)."""

    ids: list[int] = Field(..., description="対象データのIDリスト")


class RpaOrderStartResponse(BaseModel):
    """RPA開始レスポンス (API -> Frontend)."""

    job_id: uuid.UUID = Field(..., description="発行されたJob ID")
    target_count: int = Field(..., description="ロックされた対象件数")
    launch_url: str | None = Field(default=None, description="RPA起動用URL (Optional)")


class RpaOrderCheckoutRequest(BaseModel):
    """データ取得リクエスト (RPA -> API)."""

    job_id: uuid.UUID = Field(..., description="Job ID")


class RpaOrderItem(BaseModel):
    """RPA用データアイテム."""

    id: int
    # 必要なフィールドを定義 (RPAがマクロに貼り付ける用)
    # SmartReadLongDataの内容 + 編集内容(ocr_result_edits)
    # ここではDict[str, Any]として柔軟に返すか、厳密に定義するか。
    # いったんDictで返す。
    data: dict[str, Any]


class RpaOrderCheckoutResponse(BaseModel):
    """データ取得レスポンス (API -> RPA)."""

    job_id: uuid.UUID
    items: list[dict[str, Any]] = Field(..., description="処理対象データリスト")


class RpaOrderVerifyRequest(BaseModel):
    """バリデーション結果報告リクエスト (RPA -> API)."""

    job_id: uuid.UUID
    success: bool = Field(..., description="マクロ貼り付け・チェックが成功したか")
    error_message: str | None = Field(default=None, description="マクロエラーメッセージ")


class RpaOrderVerifyResponse(BaseModel):
    """バリデーション結果レスポンス (API -> RPA)."""

    action: str = Field(..., description="次のアクション: proceed (登録へ) | abort (中止)")


class RpaOrderResultRequest(BaseModel):
    """最終結果報告リクエスト (RPA -> API)."""

    job_id: uuid.UUID
    success: bool = Field(..., description="SAP登録が成功したか")
    sap_order_no: str | None = Field(default=None, description="SAP受注番号 (成功時)")
    error_message: str | None = Field(default=None, description="エラーメッセージ (失敗時)")


class RpaOrderResultResponse(BaseModel):
    """最終結果レスポンス (API -> RPA)."""

    success: bool
    message: str


class MaterialDeliveryDocumentRequest(BaseModel):
    """素材納品書作成リクエスト."""

    start_date: date
    end_date: date


class MaterialDeliveryDocumentResponse(BaseModel):
    """素材納品書作成レスポンス."""

    status: str
    message: str
    execution_time_seconds: int


class MaterialDeliverySimpleRequest(BaseModel):
    """素材納品書作成(簡易版)リクエスト."""

    start_date: date
    end_date: date


class MaterialDeliverySimpleJobResponse(BaseModel):
    """素材納品書作成(簡易版)ジョブレスポンス."""

    id: int
    step: int
    status: str
    start_date: date
    end_date: date
    requested_at: datetime
    requested_by: str | None
    completed_at: datetime | None = None
    result_message: str | None = None
    error_message: str | None = None
