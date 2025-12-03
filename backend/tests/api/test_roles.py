# backend/tests/api/test_roles.py
"""Tests for roles API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import app
from app.models import Role


def _truncate_all(db: Session):
    """Clean up test data."""
    try:
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


# ===== GET /api/roles Tests =====


def test_list_roles_success(test_db: Session):
    """Test listing roles."""
    client = TestClient(app)

    # Create roles
    r1 = Role(role_code="ADMIN", role_name="Administrator")
    r2 = Role(role_code="USER", role_name="User")
    test_db.add_all([r1, r2])
    test_db.commit()

    response = client.get("/api/roles")
    assert response.status_code == 200
    data = response.json()
    codes = [r["role_code"] for r in data]
    assert "ADMIN" in codes
    assert "USER" in codes


# ===== GET /api/roles/{role_id} Tests =====


def test_get_role_success(test_db: Session):
    """Test getting a single role."""
    client = TestClient(app)

    role = Role(role_code="TEST", role_name="Test Role")
    test_db.add(role)
    test_db.commit()

    response = client.get(f"/api/roles/{role.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["role_code"] == "TEST"


def test_get_role_not_found(test_db: Session):
    """Test getting a non-existent role."""
    client = TestClient(app)
    response = client.get("/api/roles/99999")
    assert response.status_code == 404


# ===== POST /api/roles Tests =====


def test_create_role_success(test_db: Session):
    """Test creating a new role."""
    client = TestClient(app)

    role_data = {
        "role_code": "NEW_ROLE",
        "role_name": "New Role",
        "description": "Description",
    }

    response = client.post("/api/roles", json=role_data)
    assert response.status_code == 201
    data = response.json()
    assert data["role_code"] == "NEW_ROLE"
    assert "id" in data

    # Verify in DB
    db_role = test_db.query(Role).filter(Role.role_code == "NEW_ROLE").first()
    assert db_role is not None


def test_create_role_duplicate_code(test_db: Session):
    """Test creating role with duplicate code."""
    client = TestClient(app)

    r1 = Role(role_code="DUP", role_name="Original")
    test_db.add(r1)
    test_db.commit()

    role_data = {
        "role_code": "DUP",
        "role_name": "Duplicate",
    }

    response = client.post("/api/roles", json=role_data)
    assert response.status_code == 409


# ===== PUT /api/roles/{role_id} Tests =====


def test_update_role_success(test_db: Session):
    """Test updating a role."""
    client = TestClient(app)

    role = Role(role_code="UPDATE", role_name="Old Name")
    test_db.add(role)
    test_db.commit()

    update_data = {
        "role_name": "New Name",
        "description": "Updated Desc",
    }

    response = client.put(f"/api/roles/{role.id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["role_name"] == "New Name"
    assert data["description"] == "Updated Desc"


# ===== DELETE /api/roles/{role_id} Tests =====


def test_delete_role_success(test_db: Session):
    """Test deleting a role."""
    client = TestClient(app)

    role = Role(role_code="DELETE", role_name="Delete Me")
    test_db.add(role)
    test_db.commit()

    response = client.delete(f"/api/roles/{role.id}")
    assert response.status_code == 204

    # Verify deletion
    assert test_db.get(Role, role.id) is None
