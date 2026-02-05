"""Assignment-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserSupplierAssignmentBase(BaseModel):
    """Base schema for user-supplier assignments."""

    user_id: int
    supplier_id: int
    is_primary: bool = False


class UserSupplierAssignmentCreate(UserSupplierAssignmentBase):
    """Schema for creating a user-supplier assignment.

    Inherits all fields from UserSupplierAssignmentBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class UserSupplierAssignmentUpdate(BaseModel):
    """Schema for updating a user-supplier assignment."""

    version: int
    is_primary: bool | None = None


class UserSupplierAssignmentResponse(UserSupplierAssignmentBase):
    """Schema for user-supplier assignment responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    assigned_at: datetime
    created_at: datetime
    updated_at: datetime
    version: int
    # Optional expanded fields
    username: str | None = None
    user_display_name: str | None = None
    supplier_code: str | None = None
    supplier_name: str | None = None
