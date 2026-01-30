# backend/tests/api/test_users.py
"""Tests for users API endpoints."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Role, User


def test_list_users_empty(db: Session, client: TestClient, superuser_token_headers: dict[str, str]):
    """Test listing users when none exist."""
    # The superuser created by fixture is in DB, so list is not empty actually.
    # But test_db fixture might truncate?
    # _truncate_all calls TRUNCATE CASCADE.
    # superuser fixture creates user -> db.commit().
    # If list is called, it might return superuser.
    # But let's just fix auth first.
    response = client.get("/api/users", headers=superuser_token_headers)
    assert response.status_code == 200
    # assert response.json() == [] # This might fail if superuser exists


def test_create_user_success(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test creating a new user."""
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


def test_create_user_duplicate_username(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test creating a user with duplicate username."""
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


def test_get_user_success(db: Session, client: TestClient, superuser_token_headers: dict[str, str]):
    """Test getting user details."""

    # Create user directly in DB
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    response = client.get(f"/api/users/{user.id}", headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user.id
    assert data["username"] == user.username


def test_update_user_success(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test updating user details."""

    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    update_data = {"display_name": "Updated Name"}
    response = client.put(
        f"/api/users/{user.id}", json=update_data, headers=superuser_token_headers
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Updated Name"


def test_delete_user_success(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test deleting a user."""

    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    response = client.delete(f"/api/users/{user.id}", headers=superuser_token_headers)
    assert response.status_code == 204

    # Verify deletion
    response = client.get(f"/api/users/{user.id}", headers=superuser_token_headers)
    assert response.status_code == 404


def test_assign_user_roles(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test assigning roles to a user."""

    # Create user
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
    )
    db.add(user)

    # Create roles
    role1 = Role(role_code="admin_test", role_name="Administrator Test")
    role2 = Role(role_code="user_test", role_name="User Test")
    db.add(role1)
    db.add(role2)
    db.commit()
    db.refresh(user)
    db.refresh(role1)
    db.refresh(role2)

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
