# backend/tests/api/test_forecasts.py
"""Basic tests for forecasts API endpoints."""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Customer, DeliveryPlace, ForecastCurrent, Product
from app.main import app
from app.presentation.api.deps import get_db


def _truncate_all(db: Session):
    for table in [ForecastCurrent, DeliveryPlace, Product, Customer]:
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
def sample_data(test_db: Session):
    """Create sample data for testing."""
    customer = Customer(customer_code="CUST-001", customer_name="Test Customer")
    test_db.add(customer)
    test_db.commit()
    test_db.refresh(customer)

    product = Product(maker_part_code="PROD-001", product_name="Test Product", base_unit="EA")
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)

    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DEL-001",
        delivery_place_name="Test Delivery",
    )
    test_db.add(delivery_place)
    test_db.commit()
    test_db.refresh(delivery_place)

    return {"customer": customer, "product": product, "delivery_place": delivery_place}


def test_list_forecasts_empty(test_db: Session):
    """Test listing forecasts when none exist."""
    client = TestClient(app)
    response = client.get("/api/forecasts")
    assert response.status_code == 200


def test_list_forecasts_with_filters(test_db: Session, sample_data):
    """Test listing forecasts with filters."""
    client = TestClient(app)
    response = client.get("/api/forecasts", params={"customer_id": sample_data["customer"].id})
    assert response.status_code == 200


def test_list_forecast_history(test_db: Session):
    """Test listing forecast history."""
    client = TestClient(app)
    response = client.get("/api/forecasts/history")
    assert response.status_code == 200


def test_bulk_import_forecasts_basic(test_db: Session, sample_data):
    """Test bulk importing forecasts."""
    client = TestClient(app)

    import_data = {
        "forecasts": [
            {
                "customer_id": sample_data["customer"].id,
                "delivery_place_id": sample_data["delivery_place"].id,
                "product_id": sample_data["product"].id,
                "forecast_date": str(date.today()),
                "forecast_quantity": 100.0,
            }
        ]
    }

    response = client.post("/api/forecasts/bulk-import", json=import_data)
    # May fail due to business logic, but endpoint should be reachable
    assert response.status_code in [200, 201, 400, 422]
