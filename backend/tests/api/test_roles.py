# backend/tests/api/test_roles.py
"""Tests for roles API endpoints."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Role


def test_list_roles_success(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test listing roles."""

    # Create roles with unique test codes
    r1 = Role(role_code="ADMIN_TEST", role_name="Administrator Test")
    r2 = Role(role_code="USER_TEST", role_name="User Test")
    db.add_all([r1, r2])
    db.commit()

    response = client.get("/api/roles", headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()
    codes = [r["role_code"] for r in data]
    assert "ADMIN_TEST" in codes
    assert "USER_TEST" in codes


# ===== GET /api/roles/{role_id} Tests =====


def test_get_role_success(db: Session, client: TestClient, superuser_token_headers: dict[str, str]):
    """Test getting a single role."""

    role = Role(role_code="TEST", role_name="Test Role")
    db.add(role)
    db.commit()

    response = client.get(f"/api/roles/{role.id}", headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["role_code"] == "TEST"


def test_get_role_not_found(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test getting a non-existent role."""
    response = client.get("/api/roles/99999", headers=superuser_token_headers)
    assert response.status_code == 404


# ===== POST /api/roles Tests =====


def test_create_role_success(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test creating a new role."""

    role_data = {
        "role_code": "NEW_ROLE",
        "role_name": "New Role",
        "description": "Description",
    }

    response = client.post("/api/roles", json=role_data, headers=superuser_token_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["role_code"] == "NEW_ROLE"
    assert "id" in data

    # Verify in DB
    db_role = db.query(Role).filter(Role.role_code == "NEW_ROLE").first()
    assert db_role is not None


def test_create_role_duplicate_code(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test creating role with duplicate code."""

    r1 = Role(role_code="DUP", role_name="Original")
    db.add(r1)
    db.commit()

    role_data = {
        "role_code": "DUP",
        "role_name": "Duplicate",
    }

    response = client.post("/api/roles", json=role_data, headers=superuser_token_headers)
    assert response.status_code == 409


# ===== PUT /api/roles/{role_id} Tests =====


def test_update_role_success(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test updating a role."""

    role = Role(role_code="UPDATE", role_name="Old Name")
    db.add(role)
    db.commit()

    update_data = {
        "role_name": "New Name",
        "description": "Updated Desc",
    }

    response = client.put(
        f"/api/roles/{role.id}", json=update_data, headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role_name"] == "New Name"
    assert data["description"] == "Updated Desc"


# ===== DELETE /api/roles/{role_id} Tests =====


def test_delete_role_success(
    db: Session, client: TestClient, superuser_token_headers: dict[str, str]
):
    """Test deleting a role."""

    role = Role(role_code="DELETE", role_name="Delete Me")
    db.add(role)
    db.commit()

    response = client.delete(f"/api/roles/{role.id}", headers=superuser_token_headers)
    assert response.status_code == 204

    # Verify deletion
    assert db.get(Role, role.id) is None
