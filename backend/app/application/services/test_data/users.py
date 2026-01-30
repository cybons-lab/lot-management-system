"""Test data generation for users."""

import logging

from sqlalchemy.orm import Session

from app.application.services.auth.user_service import UserService
from app.infrastructure.persistence.models.auth_models import Role
from app.presentation.schemas.system.users_schema import UserCreate, UserRoleAssignment


logger = logging.getLogger(__name__)


def generate_test_users(db: Session) -> None:
    """Generate test users with different roles.

    Creates:
    - admin user (if not exists)
    - test user with user role
    - viewer user with viewer role
    """
    user_service = UserService(db)

    # Ensure roles exist
    roles_to_create = {
        "admin": "Administrator",
        "user": "General User",
        "viewer": "Read-only Viewer",
    }

    for code, name in roles_to_create.items():
        role = db.query(Role).filter(Role.role_code == code).first()
        if not role:
            role = Role(role_code=code, role_name=name)
            db.add(role)
            logger.info(f"Created role '{code}'")

    db.commit()

    # Define test users
    test_users = [
        ("admin", "admin@example.com", "admin123", "System Admin", "admin"),
        ("testuser", "testuser@example.com", "test123", "Test User", "user"),
        ("viewer", "viewer@example.com", "viewer123", "Test Viewer", "viewer"),
    ]

    for username, email, password, display_name, role_code in test_users:
        # Check if user already exists
        existing_user = user_service.get_by_username(username)

        if not existing_user:
            # Create user
            try:
                user = user_service.create(
                    UserCreate(
                        username=username,
                        email=email,
                        password=password,
                        display_name=display_name,
                        is_active=True,
                    )
                )
                logger.info(f"Created user '{username}'")
            except Exception as e:
                logger.error(f"Failed to create user '{username}': {e}")
                continue
        else:
            user = existing_user
            logger.info(f"User '{username}' already exists")

        # Assign role
        role = db.query(Role).filter(Role.role_code == role_code).first()
        if role:
            current_roles = user_service.get_user_roles(user.id)
            if role_code not in current_roles:
                user_service.assign_roles(user.id, UserRoleAssignment(role_ids=[role.id]))
                logger.info(f"Assigned '{role_code}' role to user '{username}'")
        else:
            logger.warning(f"Role '{role_code}' not found for user '{username}'")

    db.commit()
