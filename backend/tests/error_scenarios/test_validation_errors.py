import pytest
from fastapi.testclient import TestClient


@pytest.mark.skip(reason="POST /api/inbound-plans/ not implemented yet")
def test_create_inbound_plan_validation_error(client: TestClient):
    """Test validation error for inbound plan creation."""
    # Missing required fields
    response = client.post("/api/inbound-plans/", json={})
    assert response.status_code == 422

    # Invalid type (status should be str/enum, passing int)
    # Note: Pydantic might coerce int to str, so use something definitely invalid for other fields
    # e.g. supplier_id should be int, pass "invalid"
    response = client.post(
        "/api/inbound-plans/",
        json={"supplier_id": "invalid", "warehouse_id": 1, "status": "planned", "lines": []},
    )
    assert response.status_code == 422
    assert "supplier_id" in response.text


@pytest.mark.skip(reason="POST /api/orders/ not implemented yet")
def test_create_order_validation_error(client: TestClient):
    """Test validation error for order creation."""
    # Missing required fields
    response = client.post("/api/orders/", json={})
    assert response.status_code == 422

    # Invalid date format
    response = client.post(
        "/api/orders/",
        json={"customer_id": 1, "delivery_place_id": 1, "order_date": "invalid-date", "lines": []},
    )
    assert response.status_code == 422
    assert "order_date" in response.text


@pytest.mark.skip(reason="POST /api/adjustments/ not implemented yet")
def test_create_adjustment_validation_error(client: TestClient):
    """Test validation error for adjustment creation."""
    # Missing required fields
    response = client.post("/api/adjustments/", json={})
    assert response.status_code == 422

    # Invalid adjustment type
    response = client.post(
        "/api/adjustments/",
        json={
            "lot_id": 1,
            "adjustment_type": "invalid_type",
            "adjusted_quantity": 10,
            "reason": "Test",
            "adjusted_by": 1,
        },
    )
    assert response.status_code == 422
    assert "adjustment_type" in response.text
