"""Role schemas (ロール管理)."""

from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class RoleBase(BaseSchema):
    """Base schema for roles."""

    role_code: str = Field(..., min_length=1, max_length=50, description="ロールコード")
    role_name: str = Field(..., min_length=1, max_length=100, description="ロール名")
    description: str | None = Field(None, description="説明")


class RoleCreate(RoleBase):
    """Schema for creating a role."""

    pass


class RoleUpdate(BaseSchema):
    """Schema for updating a role."""

    role_name: str | None = Field(None, min_length=1, max_length=100, description="ロール名")
    description: str | None = Field(None, description="説明")


class RoleResponse(RoleBase):
    """Schema for role response."""

    role_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic config."""

        from_attributes = True
