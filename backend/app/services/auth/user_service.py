"""User service (ユーザー管理サービス)."""

import hashlib
from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models.auth_models import User, UserRole
from app.schemas.system.users_schema import UserCreate, UserRoleAssignment, UserUpdate


class UserService:
    """Service for managing users."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    @staticmethod
    def _hash_password(password: str) -> str:
        """Hash a password using SHA256 (simple implementation - use bcrypt in production)."""
        return hashlib.sha256(password.encode()).hexdigest()

    def get_all(self, skip: int = 0, limit: int = 100, is_active: bool | None = None) -> list[User]:
        """Get all users with optional filtering."""
        query = self.db.query(User).options(joinedload(User.user_roles))

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        return query.offset(skip).limit(limit).all()

    def get_by_id(self, user_id: int) -> User | None:
        """Get user by ID."""
        return (
            self.db.query(User)
            .options(joinedload(User.user_roles))
            .filter(User.user_id == user_id)
            .first()
        )

    def get_by_username(self, username: str) -> User | None:
        """Get user by username."""
        return self.db.query(User).filter(User.username == username).first()

    def get_by_email(self, email: str) -> User | None:
        """Get user by email."""
        return self.db.query(User).filter(User.email == email).first()

    def create(self, user: UserCreate) -> User:
        """Create a new user."""
        db_user = User(
            username=user.username,
            email=user.email,
            password_hash=self._hash_password(user.password),
            display_name=user.display_name,
            is_active=user.is_active,
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def update(self, user_id: int, user: UserUpdate) -> User | None:
        """Update an existing user."""
        db_user = self.get_by_id(user_id)
        if not db_user:
            return None

        update_data = user.model_dump(exclude_unset=True)

        # Hash password if provided
        if "password" in update_data:
            update_data["password_hash"] = self._hash_password(update_data.pop("password"))

        for key, value in update_data.items():
            setattr(db_user, key, value)

        db_user.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def delete(self, user_id: int) -> bool:
        """Delete a user (hard delete)."""
        db_user = self.get_by_id(user_id)
        if not db_user:
            return False

        self.db.delete(db_user)
        self.db.commit()
        return True

    def assign_roles(self, user_id: int, assignment: UserRoleAssignment) -> User | None:
        """Assign roles to a user (replaces existing roles)."""
        db_user = self.get_by_id(user_id)
        if not db_user:
            return None

        # Delete existing role assignments
        self.db.query(UserRole).filter(UserRole.user_id == user_id).delete()

        # Add new role assignments
        for role_id in assignment.role_ids:
            user_role = UserRole(user_id=user_id, role_id=role_id)
            self.db.add(user_role)

        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def get_user_roles(self, user_id: int) -> list[str]:
        """Get role codes assigned to a user."""
        user = self.get_by_id(user_id)
        if not user:
            return []

        return [ur.role.role_code for ur in user.user_roles if ur.role]

    def update_last_login(self, user_id: int) -> bool:
        """Update user's last login timestamp."""
        db_user = self.get_by_id(user_id)
        if not db_user:
            return False

        db_user.last_login_at = datetime.now()
        self.db.commit()
        return True
