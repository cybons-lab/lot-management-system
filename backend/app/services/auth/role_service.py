"""Role service (ロール管理サービス)."""

from sqlalchemy.orm import Session

from app.models.auth_models import Role
from app.schemas.system.roles_schema import RoleCreate, RoleUpdate
from app.services.common.base_service import BaseService


class RoleService(BaseService[Role, RoleCreate, RoleUpdate]):
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
        return self.db.query(Role).offset(skip).limit(limit).all()

    def get_by_code(self, role_code: str) -> Role | None:
        """Get role by code."""
        return self.db.query(Role).filter(Role.role_code == role_code).first()
