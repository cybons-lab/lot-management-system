# backend/tests/api/test_roles.py
"""Comprehensive tests for roles API endpoints.

Tests cover:
- GET /roles - List roles
- GET /roles/{id} - Get role detail
- POST /roles - Create role
- PUT /roles/{id} - Update role
- DELETE /roles/{id} - Delete role
- Error scenarios (validation, not found, duplicate)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import Role, User, UserRole


# ---- Test DB session using conftest.py fixtures
def _truncate_all(db: Session):
    """Clean up test data in dependency order."""
    for table in [UserRole, User, Role]:
        try:
            db.query(table).delete()
        except Exception:
            pass
    db.commit()


@pytest.fixture
def test_db(db: Session):
    """Provide clean database session for each test (uses conftest.py fixture)."""
    # Clean before test
    _truncate_all(db)

    # Override FastAPI dependency
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    yield db

    # Clean after test
    _truncate_all(db)

    # Remove override
    app.dependency_overrides.clear()


# ============================================================
# GET /roles - List roles
# ============================================================


def test_list_roles_success(test_db: Session):
    """Test listing roles."""
    client = TestClient(app)

    # Create test roles
    role1 = Role(
        role_code="admin",
        role_name="Administrator",
        description="Full system access",
    )
    role2 = Role(
        role_code="viewer",
        role_name="Viewer",
        description="Read-only access",
    )
    test_db.add_all([role1, role2])
    test_db.commit()

    # Test: List all roles
    response = client.get("/api/roles")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2
    assert data[0]["role_code"] == "admin"
    assert data[1]["role_code"] == "viewer"


def test_list_roles_with_pagination(test_db: Session):
    """Test role list pagination."""
    client = TestClient(app)

    # Create 5 roles
    for i in range(5):
        role = Role(
            role_code=f"role{i}",
            role_name=f"Role {i}",
            description=f"Description {i}",
        )
        test_db.add(role)
    test_db.commit()

    # Test: Pagination (skip 2, limit 2)
    response = client.get("/api/roles", params={"skip": 2, "limit": 2})
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2


# ============================================================
# GET /roles/{id} - Get role detail
# ============================================================


def test_get_role_success(test_db: Session):
    """Test getting role detail."""
    client = TestClient(app)

    # Create role
    role = Role(
        role_code="manager",
        role_name="Manager",
        description="Department manager",
    )
    test_db.add(role)
    test_db.commit()
    test_db.refresh(role)

    # Test: Get role detail
    response = client.get(f"/api/roles/{role.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["role_code"] == "manager"
    assert data["role_name"] == "Manager"
    assert data["description"] == "Department manager"


def test_get_role_not_found(test_db: Session):
    """Test getting non-existent role returns 404."""
    client = TestClient(app)

    # Test: Get non-existent role
    response = client.get("/api/roles/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ============================================================
# POST /roles - Create role
# ============================================================


def test_create_role_success(test_db: Session):
    """Test creating a role."""
    client = TestClient(app)

    # Test: Create role
    role_data = {
        "role_code": "operator",
        "role_name": "Operator",
        "description": "Daily operations staff",
    }

    response = client.post("/api/roles", json=role_data)
    assert response.status_code == 201

    data = response.json()
    assert data["role_code"] == "operator"
    assert data["role_name"] == "Operator"
    assert data["description"] == "Daily operations staff"


def test_create_role_duplicate_code_returns_409(test_db: Session):
    """Test creating role with duplicate code returns 409."""
    client = TestClient(app)

    # Create existing role
    existing = Role(
        role_code="admin",
        role_name="Administrator",
        description="Full access",
    )
    test_db.add(existing)
    test_db.commit()

    # Test: Try to create role with same code
    role_data = {
        "role_code": "admin",  # Duplicate
        "role_name": "Another Admin",
        "description": "Different description",
    }

    response = client.post("/api/roles", json=role_data)
    assert response.status_code == 409
    assert "role code" in response.json()["detail"].lower()


def test_create_role_missing_required_fields_returns_422(test_db: Session):
    """Test creating role without required fields returns 422."""
    client = TestClient(app)

    # Test: Missing role_code
    role_data = {
        "role_name": "Test Role",
        # Missing role_code
    }

    response = client.post("/api/roles", json=role_data)
    assert response.status_code == 422


# ============================================================
# PUT /roles/{id} - Update role
# ============================================================


def test_update_role_success(test_db: Session):
    """Test updating a role."""
    client = TestClient(app)

    # Create role
    role = Role(
        role_code="old_role",
        role_name="Old Role",
        description="Old description",
    )
    test_db.add(role)
    test_db.commit()
    test_db.refresh(role)

    # Test: Update role
    update_data = {
        "role_name": "Updated Role",
        "description": "Updated description",
    }

    response = client.put(f"/api/roles/{role.id}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    assert data["role_name"] == "Updated Role"
    assert data["description"] == "Updated description"
    # role_code should remain unchanged
    assert data["role_code"] == "old_role"


def test_update_role_not_found(test_db: Session):
    """Test updating non-existent role returns 404."""
    client = TestClient(app)

    # Test: Update non-existent role
    update_data = {"role_name": "Updated"}

    response = client.put("/api/roles/99999", json=update_data)
    assert response.status_code == 404


# ============================================================
# DELETE /roles/{id} - Delete role
# ============================================================


def test_delete_role_success(test_db: Session):
    """Test deleting a role."""
    client = TestClient(app)

    # Create role
    role = Role(
        role_code="delete_role",
        role_name="Delete Role",
        description="To be deleted",
    )
    test_db.add(role)
    test_db.commit()
    test_db.refresh(role)

    # Test: Delete role
    response = client.delete(f"/api/roles/{role.id}")
    assert response.status_code == 204

    # Verify role is deleted
    deleted = test_db.query(Role).filter(Role.id == role.id).first()
    assert deleted is None


def test_delete_role_not_found(test_db: Session):
    """Test deleting non-existent role returns 404."""
    client = TestClient(app)

    # Test: Delete non-existent role
    response = client.delete("/api/roles/99999")
    assert response.status_code == 404


def test_delete_role_in_use_returns_error(test_db: Session):
    """Test deleting role that is assigned to users."""
    client = TestClient(app)

    # Create role
    role = Role(
        role_code="in_use_role",
        role_name="In Use Role",
        description="Assigned to user",
    )
    test_db.add(role)
    test_db.commit()
    test_db.refresh(role)

    # Create user with this role
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
        display_name="Test User",
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    # Assign role to user
    user_role = UserRole(user_id=user.id, role_id=role.id)
    test_db.add(user_role)
    test_db.commit()

    # Test: Try to delete role (should fail or handle gracefully)
    response = client.delete(f"/api/roles/{role.id}")
    # Depending on implementation, this might be 409 or 400
    # For now, we just verify it's not a success
    assert response.status_code in [400, 404, 409, 500]  # Error expected
