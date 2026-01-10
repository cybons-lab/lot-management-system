# backend/tests/api/test_operation_logs.py
"""Tests for operation logs API endpoints."""

import pytest
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from app.core.config import settings
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.logs_models import OperationLog
from app.main import app


def _truncate_all(db: Session):
    for table in [OperationLog]:
        try:
            db.query(table).delete()
        except Exception:
            pass
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


@pytest.fixture
def sample_user(test_db: Session):
    """Create sample user for logs."""
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
        display_name="Test User",
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


def test_list_operation_logs_empty(test_db: Session, superuser_token_headers):
    """Test listing logs when none exist."""
    client = TestClient(app)
    response = client.get("/api/operation-logs", headers=superuser_token_headers)
    assert response.status_code == 200


def test_list_operation_logs_with_user_filter(
    test_db: Session, sample_user: User, superuser_token_headers
):
    """Test listing logs filtered by user."""
    client = TestClient(app)

    # Create log
    log = OperationLog(
        user_id=sample_user.id,
        operation_type="create",
        target_table="products",
        target_id=1,
        changes={"description": "Test log"},
    )
    test_db.add(log)
    test_db.commit()

    response = client.get(
        "/api/operation-logs",
        params={"user_id": sample_user.id},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) >= 1


def test_list_operation_logs_with_type_filter(
    test_db: Session, sample_user: User, superuser_token_headers
):
    """Test filtering by operation type."""
    client = TestClient(app)

    log = OperationLog(
        user_id=sample_user.id,
        operation_type="delete",
        target_table="warehouses",
        target_id=2,
    )
    test_db.add(log)
    test_db.commit()

    response = client.get(
        "/api/operation-logs",
        params={"operation_type": "delete"},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) >= 1
    assert data["logs"][0]["operation_type"] == "delete"


def test_list_operation_logs_with_target_table_filter(
    test_db: Session, sample_user: User, superuser_token_headers
):
    """Test filtering by target table."""
    client = TestClient(app)

    log = OperationLog(
        user_id=sample_user.id,
        operation_type="create",
        target_table="products",
        target_id=1,
    )
    test_db.add(log)
    test_db.commit()

    response = client.get(
        "/api/operation-logs",
        headers=superuser_token_headers,
        params={"target_table": "products"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["logs"][0]["target_table"] == "products"


def test_get_filters(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test get filters."""
    response = client.get(
        "/api/operation-logs/filters",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "operation_types" in data
    assert "target_tables" in data
    assert isinstance(data["users"], list)


def test_list_operation_logs_with_pagination(
    test_db: Session, sample_user: User, superuser_token_headers
):
    """Test pagination."""
    client = TestClient(app)

    # Create multiple logs
    for i in range(5):
        log = OperationLog(
            user_id=sample_user.id,
            operation_type="create",
            target_table="products",
            target_id=i + 10,
        )
        test_db.add(log)
    test_db.commit()

    response = client.get(
        "/api/operation-logs",
        params={"skip": 2, "limit": 2},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 2
