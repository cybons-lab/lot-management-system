# backend/tests/api/test_operation_logs.py
"""Tests for operation logs API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.logs_models import OperationLog


@pytest.fixture
def sample_user(db: Session):
    """Create sample user for logs."""
    existing_user = db.query(User).filter(User.username == "testuser").first()
    if existing_user:
        db.refresh(existing_user)
        return existing_user

    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
        display_name="Test User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_list_operation_logs_empty(db: Session, client: TestClient, superuser_token_headers):
    """Test listing logs when none exist."""
    response = client.get("/api/operation-logs", headers=superuser_token_headers)
    assert response.status_code == 200


def test_list_operation_logs_with_user_filter(
    db: Session, client: TestClient, sample_user: User, superuser_token_headers
):
    """Test listing logs filtered by user."""

    # Create log
    log = OperationLog(
        user_id=sample_user.id,
        operation_type="create",
        target_table="products",
        target_id=1,
        changes={"description": "Test log"},
    )
    db.add(log)
    db.commit()

    response = client.get(
        "/api/operation-logs",
        params={"user_id": sample_user.id},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) >= 1


def test_list_operation_logs_with_type_filter(
    db: Session, client: TestClient, sample_user: User, superuser_token_headers
):
    """Test filtering by operation type."""

    log = OperationLog(
        user_id=sample_user.id,
        operation_type="delete",
        target_table="warehouses",
        target_id=2,
    )
    db.add(log)
    db.commit()

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
    db: Session, client: TestClient, sample_user: User, superuser_token_headers
):
    """Test filtering by target table."""

    log = OperationLog(
        user_id=sample_user.id,
        operation_type="create",
        target_table="products",
        target_id=1,
    )
    db.add(log)
    db.commit()

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
    db: Session, client: TestClient, sample_user: User, superuser_token_headers
):
    """Test pagination."""

    # Create multiple logs
    for i in range(5):
        log = OperationLog(
            user_id=sample_user.id,
            operation_type="create",
            target_table="products",
            target_id=i + 10,
        )
        db.add(log)
    db.commit()

    response = client.get(
        "/api/operation-logs",
        params={"skip": 2, "limit": 2},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 2
