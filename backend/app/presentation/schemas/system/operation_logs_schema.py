"""操作ログ・マスタ変更ログ関連のPydanticスキーマ."""

from datetime import datetime

from pydantic import BaseModel, Field


class OperationLogResponse(BaseModel):
    """操作ログレスポンス."""

    log_id: int = Field(..., validation_alias="id")
    user_id: int | None = None
    user_name: str | None = Field(None, description="ユーザー名")
    operation_type: str = Field(
        ..., description="操作種別（create/update/delete/login/logout/export）"
    )
    target_table: str = Field(..., description="対象テーブル名")
    target_id: int | None = Field(None, description="対象レコードID")
    changes: dict | None = Field(None, description="変更内容（JSON）")
    ip_address: str | None = Field(None, description="IPアドレス")
    created_at: datetime = Field(..., description="作成日時")

    model_config = {"from_attributes": True}


class OperationLogListResponse(BaseModel):
    """操作ログ一覧レスポンス."""

    logs: list[OperationLogResponse]
    total: int
    page: int
    page_size: int


class MasterChangeLogResponse(BaseModel):
    """マスタ変更履歴レスポンス."""

    change_log_id: int
    table_name: str = Field(..., description="テーブル名")
    record_id: int = Field(..., description="レコードID")
    change_type: str = Field(..., description="変更種別（insert/update/delete）")
    old_values: dict | None = Field(None, description="変更前の値（JSON）")
    new_values: dict | None = Field(None, description="変更後の値（JSON）")
    changed_by: int = Field(..., description="変更者（ユーザーID）")
    changed_at: datetime = Field(..., description="変更日時")

    model_config = {"from_attributes": True}


class MasterChangeLogListResponse(BaseModel):
    """マスタ変更履歴一覧レスポンス."""

    logs: list[MasterChangeLogResponse]
    total: int
    page: int
    page_size: int


class FilterOption(BaseModel):
    """フィルタ選択肢."""

    label: str
    value: str


class OperationLogFiltersResponse(BaseModel):
    """操作ログフィルタ選択肢レスポンス."""

    users: list[FilterOption]
    operation_types: list[FilterOption]
    target_tables: list[FilterOption]
