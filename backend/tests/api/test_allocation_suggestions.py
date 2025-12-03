# backend/tests/api/test_allocation_suggestions.py
"""Comprehensive tests for allocation suggestions API endpoints.

Tests cover:
- POST /allocation-suggestions/preview - Preview allocation suggestions (forecast/order modes)
- GET /allocation-suggestions - List allocation suggestions with filters
- Error scenarios (validation, missing parameters)
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import (
    AllocationSuggestion,
    Customer,
    DeliveryPlace,
    ForecastHeader,
    ForecastLine,
    Lot,
    Order,
    OrderLine,
    Product,
    Warehouse,
)


# ---- Test DB session using conftest.py fixtures
def _truncate_all(db: Session):
    """Clean up test data in dependency order."""
    for table in [
        AllocationSuggestion,
        ForecastLine,
        ForecastHeader,
        OrderLine,
        Order,
        Lot,
        DeliveryPlace,
        Product,
        Customer,
        Warehouse,
    ]:
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
def master_data(test_db: Session):
    """Create master data for allocation suggestions testing."""
    # Warehouse (explicitly set ID for SQLite compatibility)
    warehouse = Warehouse(
        warehouse_code="WH-001",
        warehouse_name="Main Warehouse",
        warehouse_type="internal",
    )
    test_db.add(warehouse)
    test_db.commit()
    test_db.refresh(warehouse)

    # Customer (explicitly set ID)
    customer = Customer(
        customer_code="CUST-001",
        customer_name="Test Customer",
    )
    test_db.add(customer)
    test_db.commit()
    test_db.refresh(customer)

    # Product (explicitly set ID)
    product = Product(
        maker_part_code="PROD-001",
        product_name="Test Product",
        base_unit="EA",
    )
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)

    # Delivery Place
    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DEL-001",
        delivery_place_name="Test Delivery Place",
    )
    test_db.add(delivery_place)
    test_db.commit()
    test_db.refresh(delivery_place)

    # Create lot with stock
    lot = Lot(
        product_id=product.id,
        warehouse_id=warehouse.id,
        lot_number="LOT-001",
        current_quantity=Decimal("100.000"),
        allocated_quantity=Decimal("0.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
    )
    test_db.add(lot)
    test_db.commit()
    test_db.refresh(lot)

    return {
        "warehouse": warehouse,
        "customer": customer,
        "product": product,
        "delivery_place": delivery_place,
        "lot": lot,
    }


# ============================================================
# POST /allocation-suggestions/preview - Preview suggestions
# ============================================================


def test_preview_allocation_suggestions_order_mode_success(
    test_db: Session, master_data: dict
):
    """Test preview allocation suggestions in order mode."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        order_number="ORD-001",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()

    # Test: Preview in order mode
    payload = {"mode": "order", "order_scope": {"order_line_id": order_line.id}}

    response = client.post("/api/allocation-suggestions/preview", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "suggestions" in data or "allocations" in data  # Depending on schema


def test_preview_allocation_suggestions_order_mode_missing_line_id(test_db: Session):
    """Test preview in order mode without order_line_id returns 400."""
    client = TestClient(app)

    # Test: Missing order_line_id
    payload = {"mode": "order", "order_scope": {}}

    response = client.post("/api/allocation-suggestions/preview", json=payload)
    assert response.status_code == 400
    assert "order line id" in response.json()["detail"].lower()


def test_preview_allocation_suggestions_forecast_mode_success(
    test_db: Session, master_data: dict
):
    """Test preview allocation suggestions in forecast mode."""
    client = TestClient(app)

    # Create forecast header and line
    forecast_header = ForecastHeader(
        customer_id=master_data["customer"].id,
        forecast_period="2025-01",
        status="confirmed",
    )
    test_db.add(forecast_header)
    test_db.commit()

    forecast_line = ForecastLine(
        forecast_header_id=forecast_header.id,
        product_id=master_data["product"].id,
        forecast_quantity=Decimal("50.000"),
        delivery_date=date.today() + timedelta(days=30),
    )
    test_db.add(forecast_line)
    test_db.commit()

    # Test: Preview in forecast mode
    payload = {
        "mode": "forecast",
        "forecast_scope": {"forecast_periods": ["2025-01"]},
    }

    response = client.post("/api/allocation-suggestions/preview", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "suggestions" in data or "allocations" in data


def test_preview_allocation_suggestions_forecast_mode_missing_periods(test_db: Session):
    """Test preview in forecast mode without forecast_periods returns 400."""
    client = TestClient(app)

    # Test: Missing forecast_periods
    payload = {"mode": "forecast", "forecast_scope": {}}

    response = client.post("/api/allocation-suggestions/preview", json=payload)
    assert response.status_code == 400
    assert "forecast periods" in response.json()["detail"].lower()


def test_preview_allocation_suggestions_invalid_mode(test_db: Session):
    """Test preview with invalid mode returns 400."""
    client = TestClient(app)

    # Test: Invalid mode
    payload = {"mode": "invalid_mode"}

    response = client.post("/api/allocation-suggestions/preview", json=payload)
    assert response.status_code == 400
    assert "invalid mode" in response.json()["detail"].lower()


# ============================================================
# GET /allocation-suggestions - List suggestions
# ============================================================


def test_list_allocation_suggestions_success(test_db: Session, master_data: dict):
    """Test listing allocation suggestions."""
    client = TestClient(app)

    # Create allocation suggestions
    suggestion1 = AllocationSuggestion(
        forecast_period="2025-01",
        product_id=master_data["product"].id,
        customer_id=master_data["customer"].id,
        lot_id=master_data["lot"].id,
        suggested_quantity=Decimal("10.000"),
    )
    suggestion2 = AllocationSuggestion(
        forecast_period="2025-01",
        product_id=master_data["product"].id,
        customer_id=master_data["customer"].id,
        lot_id=master_data["lot"].id,
        suggested_quantity=Decimal("20.000"),
    )
    test_db.add_all([suggestion1, suggestion2])
    test_db.commit()

    # Test: List all suggestions
    response = client.get("/api/allocation-suggestions")
    assert response.status_code == 200

    data = response.json()
    assert "suggestions" in data
    assert data["total"] == 2
    assert len(data["suggestions"]) == 2


def test_list_allocation_suggestions_with_forecast_period_filter(
    test_db: Session, master_data: dict
):
    """Test listing suggestions filtered by forecast_period."""
    client = TestClient(app)

    # Create suggestions for different periods
    suggestion_jan = AllocationSuggestion(
        forecast_period="2025-01",
        product_id=master_data["product"].id,
        customer_id=master_data["customer"].id,
        lot_id=master_data["lot"].id,
        suggested_quantity=Decimal("10.000"),
    )
    suggestion_feb = AllocationSuggestion(
        forecast_period="2025-02",
        product_id=master_data["product"].id,
        customer_id=master_data["customer"].id,
        lot_id=master_data["lot"].id,
        suggested_quantity=Decimal("20.000"),
    )
    test_db.add_all([suggestion_jan, suggestion_feb])
    test_db.commit()

    # Test: Filter by forecast_period
    response = client.get("/api/allocation-suggestions", params={"forecast_period": "2025-01"})
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 1
    assert data["suggestions"][0]["forecast_period"] == "2025-01"


def test_list_allocation_suggestions_with_product_filter(
    test_db: Session, master_data: dict
):
    """Test listing suggestions filtered by product_id."""
    client = TestClient(app)

    # Create another product
    product2 = Product(
        maker_part_code="PROD-002",
        product_name="Another Product",
        base_unit="EA",
    )
    test_db.add(product2)
    test_db.commit()

    # Create suggestions for different products
    suggestion_p1 = AllocationSuggestion(
        forecast_period="2025-01",
        product_id=master_data["product"].id,
        customer_id=master_data["customer"].id,
        lot_id=master_data["lot"].id,
        suggested_quantity=Decimal("10.000"),
    )
    suggestion_p2 = AllocationSuggestion(
        forecast_period="2025-01",
        product_id=product2.id,
        customer_id=master_data["customer"].id,
        lot_id=master_data["lot"].id,
        suggested_quantity=Decimal("20.000"),
    )
    test_db.add_all([suggestion_p1, suggestion_p2])
    test_db.commit()

    # Test: Filter by product_id
    response = client.get(
        "/api/allocation-suggestions", params={"product_id": master_data["product"].id}
    )
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 1
    assert data["suggestions"][0]["product_id"] == master_data["product"].id


def test_list_allocation_suggestions_with_pagination(test_db: Session, master_data: dict):
    """Test pagination on suggestion list."""
    client = TestClient(app)

    # Create 5 suggestions
    for i in range(5):
        suggestion = AllocationSuggestion(
            id=30 + i,
            forecast_period="2025-01",
            product_id=master_data["product"].id,
            customer_id=master_data["customer"].id,
            lot_id=master_data["lot"].id,
            suggested_quantity=Decimal(f"{(i+1)*10}.000"),
        )
        test_db.add(suggestion)
    test_db.commit()

    # Test: Pagination (skip 2, limit 2)
    response = client.get("/api/allocation-suggestions", params={"skip": 2, "limit": 2})
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 5
    assert len(data["suggestions"]) == 2
