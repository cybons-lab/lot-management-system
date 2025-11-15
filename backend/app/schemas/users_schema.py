"""User schemas (ユーザー管理)."""

from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.base import BaseSchema


class UserBase(BaseSchema):
    """Base schema for users."""

    username: str = Field(..., min_length=3, max_length=50, description="ユーザー名")
    email: EmailStr = Field(..., description="メールアドレス")
    display_name: str = Field(..., min_length=1, max_length=100, description="表示名")
    is_active: bool = Field(True, description="有効フラグ")


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str = Field(..., min_length=8, description="パスワード（平文）")


class UserUpdate(BaseSchema):
    """Schema for updating a user."""

    email: EmailStr | None = Field(None, description="メールアドレス")
    display_name: str | None = Field(None, min_length=1, max_length=100, description="表示名")
    is_active: bool | None = Field(None, description="有効フラグ")
    password: str | None = Field(None, min_length=8, description="パスワード（平文）")


class UserResponse(UserBase):
    """Schema for user response."""

    user_id: int
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic config."""

        from_attributes = True


class UserWithRoles(UserResponse):
    """Schema for user with assigned roles."""

    role_codes: list[str] = Field(default_factory=list, description="割り当てられたロールコード")


class UserRoleAssignment(BaseSchema):
    """Schema for assigning roles to a user."""

    role_ids: list[int] = Field(..., description="割り当てるロールIDリスト")
