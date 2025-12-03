"""業務ルール関連のPydanticスキーマ."""

from datetime import datetime

from pydantic import BaseModel, Field


class BusinessRuleBase(BaseModel):
    """業務ルール基本スキーマ."""

    rule_code: str = Field(..., description="ルールコード（一意）")
    rule_name: str = Field(..., description="ルール名")
    rule_type: str = Field(..., description="ルール種別（allocation/expiry_warning/kanban/other）")
    rule_parameters: dict = Field(..., description="ルールパラメータ（JSON）")
    is_active: bool = Field(default=True, description="有効フラグ")


class BusinessRuleCreate(BusinessRuleBase):
    """業務ルール作成スキーマ."""

    pass


class BusinessRuleUpdate(BaseModel):
    """業務ルール更新スキーマ."""

    rule_name: str | None = Field(None, description="ルール名")
    rule_type: str | None = Field(None, description="ルール種別")
    rule_parameters: dict | None = Field(None, description="ルールパラメータ（JSON）")
    is_active: bool | None = Field(None, description="有効フラグ")


class BusinessRuleResponse(BusinessRuleBase):
    """業務ルールレスポンス."""

    rule_id: int = Field(..., validation_alias="id")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BusinessRuleListResponse(BaseModel):
    """業務ルール一覧レスポンス."""

    rules: list[BusinessRuleResponse]
    total: int
