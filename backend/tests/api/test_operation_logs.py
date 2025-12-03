# backend/tests/api/test_operation_logs.py
"""Tests for operation logs API endpoints."""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import OperationLog, User


def _truncate_all(db: Session):
    for table in [OperationLog, User]:
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


def test_list_operation_logs_empty(test_db: Session):
    """Test listing logs when none exist."""
    client = TestClient(app)
    response = client.get("/api/operation-logs")
    assert response.status_code == 200


def test_list_operation_logs_with_user_filter(test_db: Session, sample_user: User):
    """Test listing logs filtered by user."""
    client = TestClient(app)

    # Create log
    log = OperationLog(
        user_id=sample_user.id,
        operation_type="create",
        target_type="product",
        target_id="PROD-001",
        description="Test log",
    )
    test_db.add(log)
    test_db.commit()

    response = client.get("/api/operation-logs", params={"user_id": sample_user.id})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_list_operation_logs_with_type_filter(test_db: Session, sample_user: User):
    """Test filtering by operation type."""
    client = TestClient(app)

    log = OperationLog(
        user_id=sample_user.id,
        operation_type="delete",
        target_type="warehouse",
        target_id="WH-001",
    )
    test_db.add(log)
    test_db.commit()

    response = client.get("/api/operation-logs", params={"operation_type": "delete"})
    assert response.status_code == 200


def test_list_operation_logs_with_pagination(test_db: Session, sample_user: User):
    """Test pagination."""
    client = TestClient(app)

    # Create multiple logs
    for i in range(5):
        log = OperationLog(
            user_id=sample_user.id,
            operation_type="create",
            target_type="product",
            target_id=f"PROD-{i}",
        )
        test_db.add(log)
    test_db.commit()

    response = client.get("/api/operation-logs", params={"skip": 2, "limit": 2})
    assert response.status_code == 200
