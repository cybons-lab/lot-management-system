# backend/tests/api/test_users.py
"""Comprehensive tests for users API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import app
from app.models import Role, User, UserRole
from app.services.auth.user_service import UserService


def _truncate_all(db: Session):
    """Clean up test data."""
    try:
        # Use TRUNCATE CASCADE to ensure cleanup
        db.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))
        db.execute(text("TRUNCATE TABLE roles RESTART IDENTITY CASCADE"))
        db.commit()
    except Exception:
        db.rollback()


@pytest.fixture
def test_db(db: Session):
    """Provide clean database session for each test."""
    _truncate_all(db)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield db
    _truncate_all(db)
    app.dependency_overrides.clear()


# ===== GET /api/users Tests =====


def test_list_users_success(test_db: Session):
    """Test listing users."""
    client = TestClient(app)
    service = UserService(test_db)

    # Create users using service to handle password hashing
    u1_data = {
        "username": "user1",
        "email": "user1@example.com",
        "password": "password123",
        "display_name": "User 1",
        "is_active": True,
    }
    u2_data = {
        "username": "user2",
        "email": "user2@example.com",
        "password": "password123",
        "display_name": "User 2",
        "is_active": False,
    }
    # We need to use schema objects or dicts depending on service.create signature
    # Service expects UserCreate schema
    from app.schemas.system.users_schema import UserCreate

    service.create(UserCreate(**u1_data))
    service.create(UserCreate(**u2_data))

    response = client.get("/api/users")
    assert response.status_code == 200
    data = response.json()
    usernames = [u["username"] for u in data]
    assert "user1" in usernames
    assert "user2" in usernames


def test_list_users_filter_active(test_db: Session):
    """Test listing users with active filter."""
    client = TestClient(app)
    service = UserService(test_db)
    from app.schemas.system.users_schema import UserCreate

    service.create(
        UserCreate(
            username="active",
            email="active@example.com",
            password="password123",
            display_name="Active",
            is_active=True,
        )
    )
    service.create(
        UserCreate(
            username="inactive",
            email="inactive@example.com",
            password="password123",
            display_name="Inactive",
            is_active=False,
        )
    )

    # Filter active=true
    response = client.get("/api/users?is_active=true")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["username"] == "active"

    # Filter active=false
    response = client.get("/api/users?is_active=false")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["username"] == "inactive"


# ===== GET /api/users/{user_id} Tests =====


def test_get_user_success(test_db: Session):
    """Test getting a single user."""
    client = TestClient(app)
    service = UserService(test_db)
    from app.schemas.system.users_schema import UserCreate

    user = service.create(
        UserCreate(
            username="get_test",
            email="get@example.com",
            password="password123",
            display_name="Get Test",
        )
    )

    response = client.get(f"/api/users/{user.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "get_test"
    assert "password" not in data
    assert "password_hash" not in data


def test_get_user_not_found(test_db: Session):
    """Test getting a non-existent user."""
    client = TestClient(app)
    response = client.get("/api/users/99999")
    assert response.status_code == 404


# ===== POST /api/users Tests =====


def test_create_user_success(test_db: Session):
    """Test creating a new user."""
    client = TestClient(app)

    user_data = {
        "username": "new_user",
        "email": "new@example.com",
        "password": "secure_password",
        "display_name": "New User",
        "is_active": True,
    }

    response = client.post("/api/users", json=user_data)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "new_user"
    assert "user_id" in data  # serialization_alias="user_id"
    assert "password" not in data

    # Verify password hashing in DB
    db_user = test_db.query(User).filter(User.username == "new_user").first()
    assert db_user is not None
    assert db_user.password_hash != "secure_password"
    service = UserService(test_db)
    assert service.verify_password("secure_password", db_user.password_hash)


def test_create_user_duplicate_username(test_db: Session):
    """Test creating user with duplicate username."""
    client = TestClient(app)
    service = UserService(test_db)
    from app.schemas.system.users_schema import UserCreate

    service.create(
        UserCreate(
            username="dup_user",
            email="original@example.com",
            password="password123",
            display_name="Original",
        )
    )

    user_data = {
        "username": "dup_user",
        "email": "new@example.com",
        "password": "password123",
        "display_name": "Duplicate",
    }

    response = client.post("/api/users", json=user_data)
    assert response.status_code == 409


def test_create_user_duplicate_email(test_db: Session):
    """Test creating user with duplicate email."""
    client = TestClient(app)
    service = UserService(test_db)
    from app.schemas.system.users_schema import UserCreate

    service.create(
        UserCreate(
            username="user1",
            email="dup@example.com",
            password="password123",
            display_name="User 1",
        )
    )

    user_data = {
        "username": "user2",
        "email": "dup@example.com",
        "password": "password123",
        "display_name": "User 2",
    }

    response = client.post("/api/users", json=user_data)
    assert response.status_code == 409


# ===== PUT /api/users/{user_id} Tests =====


def test_update_user_success(test_db: Session):
    """Test updating a user."""
    client = TestClient(app)
    service = UserService(test_db)
    from app.schemas.system.users_schema import UserCreate

    user = service.create(
        UserCreate(
            username="update_test",
            email="update@example.com",
            password="old_password",
            display_name="Old Name",
        )
    )

    update_data = {
        "display_name": "New Name",
        "password": "new_password",
    }

    response = client.put(f"/api/users/{user.id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "New Name"

    # Verify password update
    test_db.refresh(user)
    assert service.verify_password("new_password", user.password_hash)


# ===== DELETE /api/users/{user_id} Tests =====


def test_delete_user_success(test_db: Session):
    """Test deleting a user."""
    client = TestClient(app)
    service = UserService(test_db)
    from app.schemas.system.users_schema import UserCreate

    user = service.create(
        UserCreate(
            username="delete_test",
            email="delete@example.com",
            password="password123",
            display_name="Delete Me",
        )
    )
    
    # Ensure user exists
    assert test_db.get(User, user.id) is not None
    
    # Check if service can find it
    found = service.get_by_id(user.id)
    if found is None:
        print(f"DEBUG: service.get_by_id({user.id}) returned None")
    assert found is not None

    response = client.delete(f"/api/users/{user.id}")
    if response.status_code != 204:
        print(f"DEBUG: delete failed: {response.status_code}, {response.text}")
    assert response.status_code == 204

    # Verify deletion
    assert test_db.get(User, user.id) is None


# ===== PATCH /api/users/{user_id}/roles Tests =====


def test_assign_user_roles(test_db: Session):
    """Test assigning roles to a user."""
    client = TestClient(app)
    service = UserService(test_db)
    from app.schemas.system.users_schema import UserCreate

    # Create user
    user = service.create(
        UserCreate(
            username="role_test",
            email="role@example.com",
            password="password123",
            display_name="Role Test",
        )
    )

    # Create roles
    r1 = Role(role_code="ADMIN", role_name="Administrator")
    r2 = Role(role_code="USER", role_name="User")
    test_db.add_all([r1, r2])
    test_db.commit()

    # Assign roles
    assignment_data = {"role_ids": [r1.id, r2.id]}
    response = client.patch(f"/api/users/{user.id}/roles", json=assignment_data)
    assert response.status_code == 200
    data = response.json()
    assert "ADMIN" in data["role_codes"]
    assert "USER" in data["role_codes"]

    # Verify in DB
    user_roles = test_db.query(UserRole).filter(UserRole.user_id == user.id).all()
    assert len(user_roles) == 2
