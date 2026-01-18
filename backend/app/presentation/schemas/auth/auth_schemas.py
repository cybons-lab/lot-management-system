from __future__ import annotations

from pydantic import BaseModel, Field

from app.presentation.schemas.common.base import BaseSchema


class UserAssignmentSchema(BaseSchema):
    """User-Supplier assignment schema."""

    supplier_id: int
    is_primary: bool


class AuthUserResponse(BaseSchema):
    """User response schema."""

    id: int
    username: str
    display_name: str
    roles: list[str] = Field(default_factory=list)
    assignments: list[UserAssignmentSchema] = Field(default_factory=list)


class TokenResponse(BaseModel):
    """Token response schema."""

    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


class LoginRequest(BaseModel):
    """Login request (Simplified for dev)."""

    user_id: int | None = None
    username: str | None = None
