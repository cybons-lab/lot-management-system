"""User service (ユーザー管理サービス)."""

from typing import cast

from sqlalchemy.orm import Session, joinedload

from app.application.services.common.base_service import BaseService
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.auth_models import Role, User, UserRole
from app.presentation.schemas.system.users_schema import UserCreate, UserRoleAssignment, UserUpdate


class UserService(BaseService[User, UserCreate, UserUpdate, int]):
    """Service for managing users.

    Inherits common CRUD operations from BaseService:
    - get_by_id(user_id) -> User (overridden to include role join)
    - create(payload) -> User (overridden for password hashing)
    - update(user_id, payload) -> User (overridden for password hashing)
    - delete(user_id) -> None

    Custom business logic is implemented below.
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db=db, model=User)

    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        import bcrypt

        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a hash."""
        import bcrypt

        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except ValueError:
            # Handle invalid hash format (e.g. from legacy or test fallbacks)
            return False

    def get_all(
        self, skip: int = 0, limit: int = 100, *, include_inactive: bool = False
    ) -> list[User]:
        """Get all users with optional filtering."""
        query = self.db.query(User).options(joinedload(User.user_roles))

        if not include_inactive:
            query = query.filter(User.is_active)

        return cast(list[User], query.offset(skip).limit(limit).all())

    def get_by_id(self, user_id: int, *, raise_404: bool = True) -> User | None:
        """Get user by ID with roles loaded."""
        user = cast(
            User | None,
            self.db.query(User)
            .options(joinedload(User.user_roles))
            .filter(User.id == user_id)
            .first(),
        )
        if user is None and raise_404:
            from fastapi import HTTPException, status

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def get_by_username(self, username: str) -> User | None:
        """Get user by username."""
        return cast(User | None, self.db.query(User).filter(User.username == username).first())

    def get_by_email(self, email: str) -> User | None:
        """Get user by email."""
        return cast(User | None, self.db.query(User).filter(User.email == email).first())

    def create(self, user: UserCreate, *, auto_commit: bool = True) -> User:
        """Create a new user with hashed password and default 'user' role."""
        db_user = User(
            username=user.username,
            email=user.email,
            password_hash=self._hash_password(user.password),
            display_name=user.display_name,
            is_active=user.is_active,
        )
        self.db.add(db_user)
        self.db.flush()  # IDを確定させる

        # デフォルトロール ("user") を付与
        default_role = self.db.query(Role).filter(Role.role_code == "user").first()
        if default_role:
            user_role = UserRole(user_id=db_user.id, role_id=default_role.id)
            self.db.add(user_role)

        if auto_commit:
            self.db.commit()
            self.db.refresh(db_user)
        else:
            self.db.flush()
            self.db.refresh(db_user)
        return db_user

    def update(self, user_id: int, user: UserUpdate, *, auto_commit: bool = True) -> User:
        """Update an existing user with password hashing."""
        db_user = self.get_by_id(user_id)
        assert db_user is not None  # raise_404=True ensures this

        update_data = user.model_dump(exclude_unset=True)

        # Hash password if provided
        if "password" in update_data:
            update_data["password_hash"] = self._hash_password(update_data.pop("password"))

        for key, value in update_data.items():
            setattr(db_user, key, value)

        db_user.updated_at = utcnow()
        if auto_commit:
            self.db.commit()
            self.db.refresh(db_user)
        else:
            self.db.flush()
            self.db.refresh(db_user)
        return db_user

    def assign_roles(self, user_id: int, assignment: UserRoleAssignment) -> User | None:
        """Assign roles to a user (replaces existing roles)."""
        db_user = self.get_by_id(user_id, raise_404=False)
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
        user = self.get_by_id(user_id, raise_404=False)
        if not user:
            return []

        return [ur.role.role_code for ur in user.user_roles if ur.role]

    def update_last_login(self, user_id: int) -> bool:
        """Update user's last login timestamp."""
        db_user = self.get_by_id(user_id, raise_404=False)
        if not db_user:
            return False

        db_user.last_login_at = utcnow()
        self.db.commit()
        return True
