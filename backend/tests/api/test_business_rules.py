# backend/tests/api/test_business_rules.py
"""Tests for business rules API endpoints."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import BusinessRule


def test_list_business_rules_empty(db: Session, client: TestClient):
    """Test listing business rules when none exist."""
    response = client.get("/api/business-rules")
    assert response.status_code == 200


def test_list_business_rules_with_category_filter(db: Session, client: TestClient):
    """Test filtering by rule_type."""

    rule = BusinessRule(
        rule_code="FEFO_ENABLED",
        rule_name="FEFO Allocation",
        rule_type="allocation",
        rule_parameters={"value": "true"},
    )
    db.add(rule)
    db.commit()

    response = client.get("/api/business-rules", params={"rule_type": "allocation"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["rules"][0]["rule_code"] == "FEFO_ENABLED"


def test_get_business_rule_success(db: Session, client: TestClient):
    """Test getting business rule by code."""

    rule = BusinessRule(
        rule_code="TEST_RULE",
        rule_name="Test Rule",
        rule_type="other",
        rule_parameters={"value": "100"},
    )
    db.add(rule)
    db.commit()

    response = client.get("/api/business-rules/TEST_RULE")
    # The router endpoint for get by code is /api/business-rules/code/{rule_code}
    # But the test was using /api/business-rules/{rule_code} which might be confused with {rule_id} if rule_code is int-like?
    # Wait, the router has:
    # @router.get("/{rule_id}") -> get_business_rule (by ID)
    # @router.get("/code/{rule_code}") -> get_business_rule_by_code

    # So we should use /api/business-rules/code/TEST_RULE
    response = client.get("/api/business-rules/code/TEST_RULE")
    assert response.status_code == 200
    assert response.json()["rule_code"] == "TEST_RULE"


def test_get_business_rule_not_found(db: Session, client: TestClient):
    """Test getting non-existent business rule."""
    response = client.get("/api/business-rules/code/NONEXISTENT")
    assert response.status_code == 404


def test_update_business_rule_success(db: Session, client: TestClient):
    """Test updating business rule."""

    rule = BusinessRule(
        rule_code="UPDATE_TEST",
        rule_name="Update Test",
        rule_type="other",
        rule_parameters={"value": "old_value"},
    )
    db.add(rule)
    db.commit()

    # Update by ID
    update_data = {"rule_parameters": {"value": "new_value"}}
    response = client.put(f"/api/business-rules/{rule.id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["rule_parameters"]["value"] == "new_value"


def test_update_business_rule_not_found(db: Session, client: TestClient):
    """Test updating non-existent business rule."""
    response = client.put("/api/business-rules/99999", json={"rule_parameters": {"value": "test"}})
    assert response.status_code == 404
