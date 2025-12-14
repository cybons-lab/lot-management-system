"""User and role test data generation."""

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.auth_models import Role, User, UserRole


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_users(db: Session) -> list[User]:
    """Generate admin and test users with roles.

    Creates:
    - admin user (username: admin, password: admin123)
    - test user (username: user, password: user123)
    - admin and user roles
    """
    # Create roles first
    admin_role = Role(
        role_code="admin",
        role_name="管理者",
        description="システム管理者ロール",
    )
    user_role = Role(
        role_code="user",
        role_name="一般ユーザー",
        description="一般ユーザーロール",
    )
    db.add_all([admin_role, user_role])
    db.flush()  # Get IDs

    # Create users
    admin_user = User(
        username="admin",
        email="admin@example.com",
        password_hash=pwd_context.hash("admin123"),
        display_name="管理者",
        is_active=True,
        auth_provider="local",
    )
    test_user = User(
        username="user",
        email="user@example.com",
        password_hash=pwd_context.hash("user123"),
        display_name="テストユーザー",
        is_active=True,
        auth_provider="local",
    )
    db.add_all([admin_user, test_user])
    db.flush()  # Get IDs

    # Assign roles
    db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))
    db.add(UserRole(user_id=admin_user.id, role_id=user_role.id))
    db.add(UserRole(user_id=test_user.id, role_id=user_role.id))

    db.commit()
    return [admin_user, test_user]
