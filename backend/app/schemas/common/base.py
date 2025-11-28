# backend/app/schemas/base.py
"""
Pydantic Base Schemas
共通の基底スキーマ.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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


# Generic types for list/page responses
# Using Python 3.12 type parameter syntax
class ListResponse[T](BaseSchema):
    """
    Generic list response.

    Use this for simple list endpoints without pagination metadata.

    Example:
        CustomerListResponse = ListResponse[CustomerResponse]
    """

    items: list[T] = Field(default_factory=list, description="List of items")
    total: int = Field(default=0, description="Total count of items")


class PageResponse[T](BaseSchema):
    """
    Generic paginated response.

    Use this for paginated endpoints with page/size metadata.

    Example:
        CustomerPageResponse = PageResponse[CustomerResponse]
    """

    items: list[T] = Field(default_factory=list, description="List of items")
    total: int = Field(default=0, description="Total count of items")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=100, description="Items per page")
    total_pages: int = Field(default=0, description="Total number of pages")
