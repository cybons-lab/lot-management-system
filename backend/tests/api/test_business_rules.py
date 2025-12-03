# backend/tests/api/test_business_rules.py
"""Tests for business rules API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import BusinessRule


def _truncate_all(db: Session):
    db.query(BusinessRule).delete()
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


def test_list_business_rules_empty(test_db: Session):
    """Test listing business rules when none exist."""
    client = TestClient(app)
    response = client.get("/api/business-rules")
    assert response.status_code == 200


def test_list_business_rules_with_category_filter(test_db: Session):
    """Test filtering by category."""
    client = TestClient(app)

    rule = BusinessRule(
        rule_code="FEFO_ENABLED",
        rule_name="FEFO Allocation",
        category="allocation",
        value="true",
        description="Enable FEFO allocation",
    )
    test_db.add(rule)
    test_db.commit()

    response = client.get("/api/business-rules", params={"category": "allocation"})
    assert response.status_code == 200


def test_get_business_rule_success(test_db: Session):
    """Test getting business rule by code."""
    client = TestClient(app)

    rule = BusinessRule(
        rule_code="TEST_RULE",
        rule_name="Test Rule",
        category="test",
        value="100",
    )
    test_db.add(rule)
    test_db.commit()

    response = client.get("/api/business-rules/TEST_RULE")
    assert response.status_code == 200
    assert response.json()["rule_code"] == "TEST_RULE"


def test_get_business_rule_not_found(test_db: Session):
    """Test getting non-existent business rule."""
    client = TestClient(app)
    response = client.get("/api/business-rules/NONEXISTENT")
    assert response.status_code == 404


def test_update_business_rule_success(test_db: Session):
    """Test updating business rule."""
    client = TestClient(app)

    rule = BusinessRule(
        rule_code="UPDATE_TEST",
        rule_name="Update Test",
        category="test",
        value="old_value",
    )
    test_db.add(rule)
    test_db.commit()

    update_data = {"value": "new_value"}
    response = client.put("/api/business-rules/UPDATE_TEST", json=update_data)
    assert response.status_code == 200
    assert response.json()["value"] == "new_value"


def test_update_business_rule_not_found(test_db: Session):
    """Test updating non-existent business rule."""
    client = TestClient(app)
    response = client.put("/api/business-rules/NONEXISTENT", json={"value": "test"})
    assert response.status_code == 404
