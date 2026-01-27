"""RPA related schemas."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class MaterialDeliveryDocumentRequest(BaseModel):
    """素材納品書発行リクエスト."""

    start_date: date = Field(..., description="開始日")
    end_date: date = Field(..., description="終了日")


class MaterialDeliveryDocumentResponse(BaseModel):
    """素材納品書発行レスポンス."""

    status: str = Field(..., description="実行ステータス (success, locked)")
    message: str = Field(..., description="メッセージ")
    execution_time_seconds: int = Field(default=60, description="実行時間（秒）")


class MaterialDeliverySimpleRequest(BaseModel):
    """素材納品書発行（簡易）リクエスト."""

    start_date: date = Field(..., description="開始日")
    end_date: date = Field(..., description="終了日")


class MaterialDeliverySimpleJobResponse(BaseModel):
    """素材納品書発行（簡易）ジョブレスポンス."""

    id: int
    step: int
    status: str
    start_date: date
    end_date: date
    requested_at: datetime
    requested_by: str | None
    completed_at: datetime | None
    result_message: str | None
    error_message: str | None
