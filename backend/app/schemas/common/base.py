# backend/app/schemas/base.py
"""
Pydantic Base Schemas
共通の基底スキーマ.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """共通基底スキーマ."""

    model_config = ConfigDict(from_attributes=True)


class TimestampMixin(BaseModel):
    """タイムスタンプミックスイン."""

    created_at: datetime
    updated_at: datetime | None = None


class ResponseBase(BaseModel):
    """API共通レスポンス."""

    success: bool
    message: str | None = None
    data: dict | None = None
