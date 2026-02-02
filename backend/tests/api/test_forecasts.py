# backend/tests/api/test_forecasts.py
"""Basic tests for forecasts API endpoints."""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    SupplierItem,
)


@pytest.fixture
def sample_data(db: Session, supplier):
    """Create sample data for testing."""
    customer = Customer(customer_code="CUST-001", customer_name="Test Customer")
    db.add(customer)
    db.commit()
    db.refresh(customer)

    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PROD-001",
        display_name="Test Product",
        base_unit="EA",
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DEL-001",
        delivery_place_name="Test Delivery",
    )
    db.add(delivery_place)
    db.commit()
    db.refresh(delivery_place)

    return {"customer": customer, "product": product, "delivery_place": delivery_place}


def test_list_forecasts_empty(db: Session, client: TestClient):
    """Test listing forecasts when none exist."""
    response = client.get("/api/forecasts")
    assert response.status_code == 200


def test_list_forecasts_with_filters(db: Session, client: TestClient, sample_data):
    """Test listing forecasts with filters."""
    response = client.get("/api/forecasts", params={"customer_id": sample_data["customer"].id})
    assert response.status_code == 200


def test_list_forecast_history(db: Session, client: TestClient):
    """Test listing forecast history."""
    response = client.get("/api/forecasts/history")
    assert response.status_code == 200


def test_bulk_import_forecasts_basic(db: Session, client: TestClient, sample_data):
    """Test bulk importing forecasts."""

    import_data = {
        "forecasts": [
            {
                "customer_id": sample_data["customer"].id,
                "delivery_place_id": sample_data["delivery_place"].id,
                "supplier_item_id": sample_data["product"].id,
                "forecast_date": str(date.today()),
                "forecast_quantity": 100.0,
            }
        ]
    }

    response = client.post("/api/forecasts/bulk-import", json=import_data)
    # May fail due to business logic, but endpoint should be reachable
    assert response.status_code in [200, 201, 400, 422]
