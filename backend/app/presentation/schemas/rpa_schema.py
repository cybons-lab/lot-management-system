"""RPA related schemas."""

from datetime import date

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
