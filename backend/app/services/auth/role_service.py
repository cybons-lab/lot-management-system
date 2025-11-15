"""Role service (ロール管理サービス)."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.auth_models import Role
from app.schemas.roles_schema import RoleCreate, RoleUpdate


class RoleService:
    """Service for managing roles."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Role]:
        """Get all roles."""
        return self.db.query(Role).offset(skip).limit(limit).all()

    def get_by_id(self, role_id: int) -> Role | None:
        """Get role by ID."""
        return self.db.query(Role).filter(Role.role_id == role_id).first()

    def get_by_code(self, role_code: str) -> Role | None:
        """Get role by code."""
        return self.db.query(Role).filter(Role.role_code == role_code).first()

    def create(self, role: RoleCreate) -> Role:
        """Create a new role."""
        db_role = Role(**role.model_dump())
        self.db.add(db_role)
        self.db.commit()
        self.db.refresh(db_role)
        return db_role

    def update(self, role_id: int, role: RoleUpdate) -> Role | None:
        """Update an existing role."""
        db_role = self.get_by_id(role_id)
        if not db_role:
            return None

        for key, value in role.model_dump(exclude_unset=True).items():
            setattr(db_role, key, value)

        db_role.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(db_role)
        return db_role

    def delete(self, role_id: int) -> bool:
        """Delete a role (hard delete)."""
        db_role = self.get_by_id(role_id)
        if not db_role:
            return False

        self.db.delete(db_role)
        self.db.commit()
        return True
