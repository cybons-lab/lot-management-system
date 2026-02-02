"""Cloud Flow schemas for API requests/responses."""

from datetime import date, datetime

from pydantic import BaseModel


class CloudFlowJobCreate(BaseModel):
    """ジョブ作成リクエスト."""

    job_type: str
    start_date: date
    end_date: date


class CloudFlowJobResponse(BaseModel):
    """ジョブレスポンス."""

    id: int
    job_type: str
    status: str
    start_date: date
    end_date: date
    requested_by: str | None = None
    requested_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    result_message: str | None = None
    error_message: str | None = None
    position_in_queue: int | None = None  # 待ち順番（実行中: 0, 待ち1番目: 1, ...）

    model_config = {"from_attributes": True}


class CloudFlowQueueStatus(BaseModel):
    """現在のキュー状態."""

    current_job: CloudFlowJobResponse | None = None
    pending_jobs: list[CloudFlowJobResponse] = []
    your_position: int | None = None  # 自分の待ち順番


class CloudFlowConfigResponse(BaseModel):
    """設定レスポンス."""

    id: int
    config_key: str
    config_value: str
    description: str | None = None

    model_config = {"from_attributes": True}


class CloudFlowConfigUpdate(BaseModel):
    """設定更新リクエスト."""

    config_value: str
    description: str | None = None


class CloudFlowGenericExecuteRequest(BaseModel):
    """汎用Cloud Flow実行リクエスト."""

    flow_url: str
    json_payload: dict | None = None
