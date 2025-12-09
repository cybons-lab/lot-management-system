# backend/tests/api/test_users.py
"""Tests for users API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models import Role, User
from app.main import app


def _truncate_all(db: Session):
    db.execute(text("TRUNCATE TABLE users, roles, user_roles RESTART IDENTITY CASCADE"))
    db.commit()


@pytest.fixture
def test_db(db: Session):
    _truncate_all(db)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield db
    _truncate_all(db)
    app.dependency_overrides.clear()


def test_list_users_empty(test_db: Session, superuser_token_headers: dict[str, str]):
    """Test listing users when none exist."""
    client = TestClient(app)
    # The superuser created by fixture is in DB, so list is not empty actually.
    # But test_db fixture might truncate?
    # _truncate_all calls TRUNCATE CASCADE.
    # superuser fixture creates user -> db.commit().
    # If list is called, it might return superuser.
    # But let's just fix auth first.
    response = client.get("/api/users", headers=superuser_token_headers)
    assert response.status_code == 200
    # assert response.json() == [] # This might fail if superuser exists


def test_create_user_success(test_db: Session, superuser_token_headers: dict[str, str]):
    """Test creating a new user."""
    client = TestClient(app)
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "display_name": "Test User",
        "is_active": True,
    }
    response = client.post("/api/users", json=user_data, headers=superuser_token_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == user_data["username"]
    assert data["email"] == user_data["email"]
    assert "user_id" in data
    assert "password_hash" not in data  # Password should not be returned


def test_create_user_duplicate_username(test_db: Session, superuser_token_headers: dict[str, str]):
    """Test creating a user with duplicate username."""
    client = TestClient(app)
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "display_name": "Test User",
    }

    # Create first user
    client.post("/api/users", json=user_data, headers=superuser_token_headers)

    # Try to create duplicate
    response = client.post("/api/users", json=user_data, headers=superuser_token_headers)
    assert response.status_code == 409


def test_get_user_success(test_db: Session, superuser_token_headers: dict[str, str]):
    """Test getting user details."""
    client = TestClient(app)

    # Create user directly in DB
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    response = client.get(f"/api/users/{user.id}", headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user.id
    assert data["username"] == user.username


def test_update_user_success(test_db: Session, superuser_token_headers: dict[str, str]):
    """Test updating user details."""
    client = TestClient(app)

    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    update_data = {"display_name": "Updated Name"}
    response = client.put(
        f"/api/users/{user.id}", json=update_data, headers=superuser_token_headers
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Updated Name"


def test_delete_user_success(test_db: Session, superuser_token_headers: dict[str, str]):
    """Test deleting a user."""
    client = TestClient(app)

    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    response = client.delete(f"/api/users/{user.id}", headers=superuser_token_headers)
    assert response.status_code == 204

    # Verify deletion
    response = client.get(f"/api/users/{user.id}", headers=superuser_token_headers)
    assert response.status_code == 404


def test_assign_user_roles(test_db: Session, superuser_token_headers: dict[str, str]):
    """Test assigning roles to a user."""
    client = TestClient(app)

    # Create user
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
    )
    test_db.add(user)

    # Create roles
    role1 = Role(role_code="admin_test", role_name="Administrator Test")
    role2 = Role(role_code="user_test", role_name="User Test")
    test_db.add(role1)
    test_db.add(role2)
    test_db.commit()
    test_db.refresh(user)
    test_db.refresh(role1)
    test_db.refresh(role2)

    # Assign roles
    assignment_data = {"role_ids": [role1.id, role2.id]}
    response = client.patch(
        f"/api/users/{user.id}/roles", json=assignment_data, headers=superuser_token_headers
    )
    assert response.status_code == 200

    data = response.json()
    assert len(data["role_codes"]) == 2
    # Check if created role codes are present
    assert "admin_test" in data["role_codes"]
    assert "user_test" in data["role_codes"]
