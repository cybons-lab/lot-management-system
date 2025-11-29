"""バッチジョブ関連のPydanticスキーマ."""

from datetime import datetime

from pydantic import BaseModel, Field


class BatchJobBase(BaseModel):
    """バッチジョブ基本スキーマ."""

    job_name: str = Field(..., description="ジョブ名")
    job_type: str = Field(
        ...,
        description="ジョブ種別（allocation_suggestion/allocation_finalize/inventory_sync/data_import/report_generation）",
    )
    parameters: dict | None = Field(None, description="ジョブパラメータ（JSON）")


class BatchJobCreate(BatchJobBase):
    """バッチジョブ作成スキーマ."""

    pass


class BatchJobUpdate(BaseModel):
    """バッチジョブ更新スキーマ."""

    job_name: str | None = Field(None, description="ジョブ名")
    job_type: str | None = Field(None, description="ジョブ種別")
    parameters: dict | None = Field(None, description="ジョブパラメータ（JSON）")
    status: str | None = Field(None, description="ステータス")
    result_message: str | None = Field(None, description="実行結果メッセージ")


class BatchJobResponse(BatchJobBase):
    """バッチジョブレスポンス."""

    job_id: int
    status: str = Field(..., description="ステータス（pending/running/completed/failed）")
    result_message: str | None = Field(None, description="実行結果メッセージ")
    started_at: datetime | None = Field(None, description="開始日時")
    completed_at: datetime | None = Field(None, description="完了日時")
    created_at: datetime = Field(..., description="作成日時")

    model_config = {"from_attributes": True}


class BatchJobListResponse(BaseModel):
    """バッチジョブ一覧レスポンス."""

    jobs: list[BatchJobResponse]
    total: int
    page: int
    page_size: int


class BatchJobExecuteRequest(BaseModel):
    """バッチジョブ実行リクエスト."""

    parameters: dict | None = Field(None, description="実行時パラメータ（上書き）")


class BatchJobExecuteResponse(BaseModel):
    """バッチジョブ実行レスポンス."""

    job_id: int
    status: str
    message: str
