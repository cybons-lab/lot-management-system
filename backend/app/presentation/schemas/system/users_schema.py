"""User schemas (ユーザー管理) - DDL v2.2 compliant.

All schemas strictly follow the DDL as the single source of truth.
"""

from datetime import datetime

from pydantic import EmailStr, Field

from app.presentation.schemas.common.base import BaseSchema


class UserBase(BaseSchema):
    """Base schema for users (DDL: users)."""

    username: str = Field(..., min_length=3, max_length=50, description="ユーザー名")
    email: EmailStr = Field(..., max_length=255, description="メールアドレス")
    display_name: str = Field(..., min_length=1, max_length=100, description="表示名")
    is_active: bool = Field(True, description="有効フラグ")


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str = Field(..., min_length=8, description="パスワード（平文）")


class UserUpdate(BaseSchema):
    """Schema for updating a user."""

    email: EmailStr | None = Field(None, max_length=255, description="メールアドレス")
    display_name: str | None = Field(None, min_length=1, max_length=100, description="表示名")
    is_active: bool | None = Field(None, description="有効フラグ")
    password: str | None = Field(None, min_length=8, description="パスワード（平文）")


class UserResponse(UserBase):
    """Schema for user response (DDL: users)."""

    id: int = Field(..., serialization_alias="user_id")
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class UserWithRoles(UserResponse):
    """Schema for user with assigned roles."""

    role_codes: list[str] = Field(default_factory=list, description="割り当てられたロールコード")


class UserRoleAssignment(BaseSchema):
    """Schema for assigning roles to a user."""

    role_ids: list[int] = Field(..., description="割り当てるロールIDリスト")


class SupplierAssignmentInfo(BaseSchema):
    """Schema for supplier assignment information."""

    supplier_id: int = Field(..., description="仕入先ID")
    supplier_code: str = Field(..., description="仕入先コード")
    supplier_name: str = Field(..., description="仕入先名")
    is_primary: bool = Field(..., description="主担当フラグ")


class UserWithSuppliers(UserResponse):
    """Schema for user with assigned suppliers (for authentication context)."""

    supplier_assignments: list[SupplierAssignmentInfo] = Field(
        default_factory=list, description="担当仕入先リスト"
    )
