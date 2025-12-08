"""Role service (ロール管理サービス)."""

from typing import cast

from sqlalchemy.orm import Session

from app.application.services.common.base_service import BaseService
from app.infrastructure.persistence.models.auth_models import Role
from app.presentation.schemas.system.roles_schema import RoleCreate, RoleUpdate


class RoleService(BaseService[Role, RoleCreate, RoleUpdate, int]):
    """Service for managing roles.

    Inherits common CRUD operations from BaseService:
    - get_by_id(role_id) -> Role
    - create(payload) -> Role
    - update(role_id, payload) -> Role
    - delete(role_id) -> None

    Custom business logic is implemented below.
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db=db, model=Role)

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Role]:
        """Get all roles with pagination."""
        return cast(list[Role], self.db.query(Role).offset(skip).limit(limit).all())

    def get_by_code(self, role_code: str) -> Role | None:
        """Get role by code."""
        return cast(Role | None, self.db.query(Role).filter(Role.role_code == role_code).first())
