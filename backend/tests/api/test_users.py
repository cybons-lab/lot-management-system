# backend/tests/api/test_users.py
"""Tests for users API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import app
from app.models import User, Role


from sqlalchemy import text

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


def test_list_users_empty(test_db: Session):
    """Test listing users when none exist."""
    client = TestClient(app)
    response = client.get("/api/users")
    assert response.status_code == 200
    assert response.json() == []


def test_create_user_success(test_db: Session):
    """Test creating a new user."""
    client = TestClient(app)
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "display_name": "Test User",
        "is_active": True,
    }
    response = client.post("/api/users", json=user_data)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == user_data["username"]
    assert data["email"] == user_data["email"]
    assert "user_id" in data
    assert "password_hash" not in data  # Password should not be returned


def test_create_user_duplicate_username(test_db: Session):
    """Test creating a user with duplicate username."""
    client = TestClient(app)
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "display_name": "Test User",
    }
    
    # Create first user
    client.post("/api/users", json=user_data)
    
    # Try to create duplicate
    response = client.post("/api/users", json=user_data)
    assert response.status_code == 409


def test_get_user_success(test_db: Session):
    """Test getting user details."""
    client = TestClient(app)
    
    # Create user directly in DB
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    response = client.get(f"/api/users/{user.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user.id
    assert data["username"] == user.username


def test_update_user_success(test_db: Session):
    """Test updating user details."""
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

    update_data = {"display_name": "Updated Name"}
    response = client.put(f"/api/users/{user.id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["display_name"] == "Updated Name"


def test_delete_user_success(test_db: Session):
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

    response = client.delete(f"/api/users/{user.id}")
    assert response.status_code == 204

    # Verify deletion
    response = client.get(f"/api/users/{user.id}")
    assert response.status_code == 404


def test_assign_user_roles(test_db: Session):
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
    role1 = Role(role_code="admin", role_name="Administrator")
    role2 = Role(role_code="user", role_name="User")
    test_db.add(role1)
    test_db.add(role2)
    test_db.commit()
    test_db.refresh(user)
    test_db.refresh(role1)
    test_db.refresh(role2)

    # Assign roles
    assignment_data = {"role_ids": [role1.id, role2.id]}
    response = client.patch(f"/api/users/{user.id}/roles", json=assignment_data)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data["role_codes"]) == 2
    assert "admin" in data["role_codes"]
    assert "user" in data["role_codes"]
