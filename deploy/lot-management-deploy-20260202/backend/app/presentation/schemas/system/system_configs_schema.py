"""System configuration schemas (システム設定) - DDL v2.2 compliant.

All schemas strictly follow the DDL as the single source of truth.
"""

from datetime import datetime

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class SystemConfigBase(BaseSchema):
    """Base schema for system configs (DDL: system_configs)."""

    config_key: str = Field(..., min_length=1, max_length=100, description="設定キー")
    config_value: str = Field(..., min_length=1, description="設定値")
    description: str | None = Field(None, description="説明")


class SystemConfigCreate(SystemConfigBase):
    """Schema for creating a system config.

    Inherits all fields from SystemConfigBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class SystemConfigUpdate(BaseSchema):
    """Schema for updating a system config."""

    config_value: str | None = Field(None, min_length=1, description="設定値")
    description: str | None = Field(None, description="説明")


class SystemConfigResponse(SystemConfigBase):
    """Schema for system config response (DDL: system_configs)."""

    id: int
    created_at: datetime
    updated_at: datetime
