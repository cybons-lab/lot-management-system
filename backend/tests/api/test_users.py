# backend/tests/api/test_users.py
"""Comprehensive tests for users API endpoints.

Tests cover:
- GET /users - List users with filters
- GET /users/{id} - Get user detail
- POST /users - Create user
- PUT /users/{id} - Update user
- DELETE /users/{id} - Delete user
- PATCH /users/{id}/roles - Assign roles to user
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


@pytest.fixture
def sample_role(test_db: Session):
    """Create a sample role for testing."""
    role = Role(
        role_code="test_role",
        role_name="Test Role",
        description="Test role for testing",
    )
    test_db.add(role)
    test_db.commit()
    test_db.refresh(role)
    return role


# ============================================================
# GET /users - List users
# ============================================================


def test_list_users_success(test_db: Session):
    """Test listing users."""
    client = TestClient(app)

    # Create test users
    user1 = User(
        username="user1",
        email="user1@example.com",
        password_hash="hashed_password_1",
        display_name="User One",
        is_active=True,
    )
    user2 = User(
        username="user2",
        email="user2@example.com",
        password_hash="hashed_password_2",
        display_name="User Two",
        is_active=True,
    )
    test_db.add_all([user1, user2])
    test_db.commit()

    # Test: List all users
    response = client.get("/api/users")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2
    assert data[0]["username"] == "user1"
    assert data[1]["username"] == "user2"


def test_list_users_with_is_active_filter(test_db: Session):
    """Test listing users filtered by is_active."""
    client = TestClient(app)

    # Create active and inactive users
    user_active = User(
        username="active_user",
        email="active@example.com",
        password_hash="hashed",
        display_name="Active User",
        is_active=True,
    )
    user_inactive = User(
        username="inactive_user",
        email="inactive@example.com",
        password_hash="hashed",
        display_name="Inactive User",
        is_active=False,
    )
    test_db.add_all([user_active, user_inactive])
    test_db.commit()

    # Test: Filter by is_active=true
    response = client.get("/api/users", params={"is_active": True})
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["username"] == "active_user"


def test_list_users_with_pagination(test_db: Session):
    """Test user list pagination."""
    client = TestClient(app)

    # Create 5 users
    for i in range(5):
        user = User(
            username=f"user{i}",
            email=f"user{i}@example.com",
            password_hash="hashed",
            display_name=f"User {i}",
            is_active=True,
        )
        test_db.add(user)
    test_db.commit()

    # Test: Pagination (skip 2, limit 2)
    response = client.get("/api/users", params={"skip": 2, "limit": 2})
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2


# ============================================================
# GET /users/{id} - Get user detail
# ============================================================


def test_get_user_success(test_db: Session, sample_role: Role):
    """Test getting user detail."""
    client = TestClient(app)

    # Create user with role
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
        display_name="Test User",
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    # Assign role
    user_role = UserRole(user_id=user.id, role_id=sample_role.id)
    test_db.add(user_role)
    test_db.commit()

    # Test: Get user detail
    response = client.get(f"/api/users/{user.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "role_codes" in data


def test_get_user_not_found(test_db: Session):
    """Test getting non-existent user returns 404."""
    client = TestClient(app)

    # Test: Get non-existent user
    response = client.get("/api/users/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ============================================================
# POST /users - Create user
# ============================================================


def test_create_user_success(test_db: Session):
    """Test creating a user."""
    client = TestClient(app)

    # Test: Create user
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "SecurePassword123!",
        "display_name": "New User",
    }

    response = client.post("/api/users", json=user_data)
    assert response.status_code == 201

    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert "password" not in data  # Password should not be returned


def test_create_user_duplicate_username_returns_409(test_db: Session):
    """Test creating user with duplicate username returns 409."""
    client = TestClient(app)

    # Create existing user
    existing = User(
        username="existinguser",
        email="existing@example.com",
        password_hash="hashed",
        display_name="Existing User",
    )
    test_db.add(existing)
    test_db.commit()

    # Test: Try to create user with same username
    user_data = {
        "username": "existinguser",  # Duplicate
        "email": "different@example.com",
        "password": "SecurePassword123!",
        "display_name": "Another User",
    }

    response = client.post("/api/users", json=user_data)
    assert response.status_code == 409
    assert "username" in response.json()["detail"].lower()


def test_create_user_duplicate_email_returns_409(test_db: Session):
    """Test creating user with duplicate email returns 409."""
    client = TestClient(app)

    # Create existing user
    existing = User(
        username="user1",
        email="existing@example.com",
        password_hash="hashed",
        display_name="Existing User",
    )
    test_db.add(existing)
    test_db.commit()

    # Test: Try to create user with same email
    user_data = {
        "username": "differentuser",
        "email": "existing@example.com",  # Duplicate
        "password": "SecurePassword123!",
        "display_name": "Another User",
    }

    response = client.post("/api/users", json=user_data)
    assert response.status_code == 409
    assert "email" in response.json()["detail"].lower()


# ============================================================
# PUT /users/{id} - Update user
# ============================================================


def test_update_user_success(test_db: Session):
    """Test updating a user."""
    client = TestClient(app)

    # Create user
    user = User(
        username="olduser",
        email="old@example.com",
        password_hash="hashed",
        display_name="Old Name",
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    # Test: Update user
    update_data = {
        "display_name": "New Name",
        "email": "new@example.com",
        "is_active": False,
    }

    response = client.put(f"/api/users/{user.id}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    assert data["display_name"] == "New Name"
    assert data["email"] == "new@example.com"
    assert data["is_active"] is False


def test_update_user_not_found(test_db: Session):
    """Test updating non-existent user returns 404."""
    client = TestClient(app)

    # Test: Update non-existent user
    update_data = {"display_name": "New Name"}

    response = client.put("/api/users/99999", json=update_data)
    assert response.status_code == 404


# ============================================================
# DELETE /users/{id} - Delete user
# ============================================================


def test_delete_user_success(test_db: Session):
    """Test deleting a user."""
    client = TestClient(app)

    # Create user
    user = User(
        username="deleteuser",
        email="delete@example.com",
        password_hash="hashed",
        display_name="Delete User",
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    # Test: Delete user
    response = client.delete(f"/api/users/{user.id}")
    assert response.status_code == 204

    # Verify user is deleted
    deleted = test_db.query(User).filter(User.id == user.id).first()
    assert deleted is None


def test_delete_user_not_found(test_db: Session):
    """Test deleting non-existent user returns 404."""
    client = TestClient(app)

    # Test: Delete non-existent user
    response = client.delete("/api/users/99999")
    assert response.status_code == 404


# ============================================================
# PATCH /users/{id}/roles - Assign roles to user
# ============================================================


def test_assign_user_roles_success(test_db: Session, sample_role: Role):
    """Test assigning roles to a user."""
    client = TestClient(app)

    # Create user
    user = User(
        username="roleuser",
        email="role@example.com",
        password_hash="hashed",
        display_name="Role User",
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    # Test: Assign role
    assignment_data = {"role_ids": [sample_role.id]}

    response = client.patch(f"/api/users/{user.id}/roles", json=assignment_data)
    assert response.status_code == 200

    data = response.json()
    assert "role_codes" in data
    assert sample_role.role_code in data["role_codes"]


def test_assign_user_roles_not_found(test_db: Session, sample_role: Role):
    """Test assigning roles to non-existent user returns 404."""
    client = TestClient(app)

    # Test: Assign role to non-existent user
    assignment_data = {"role_ids": [sample_role.id]}

    response = client.patch("/api/users/99999/roles", json=assignment_data)
    assert response.status_code == 404
