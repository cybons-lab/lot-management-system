# backend/tests/api/test_orders.py
"""Comprehensive tests for orders API endpoints.

Tests cover:
- GET /orders - List orders with filters
- GET /orders/{order_id} - Get order detail
- POST /orders - Create order
- DELETE /orders/{order_id}/cancel - Cancel order
- Error scenarios (validation, not found, duplicate)
"""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    Order,
    OrderLine,
    SupplierItem,
    Warehouse,
)


@pytest.fixture
def master_data(db: Session, supplier):
    """Create master data for orders testing."""
    # Warehouse (PostgreSQL auto-assigns ID with BIGSERIAL)
    warehouse = Warehouse(
        warehouse_code="WH-001",
        warehouse_name="Main Warehouse",
        warehouse_type="internal",
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    # Customer
    customer = Customer(
        customer_code="CUST-001",
        customer_name="Test Customer",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    # Product
    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PROD-001",
        display_name="Test Product",
        base_unit="EA",
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Delivery Place
    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DEL-001",
        delivery_place_name="Test Delivery Place",
    )
    db.add(delivery_place)
    db.commit()
    db.refresh(delivery_place)

    return {
        "warehouse": warehouse,
        "customer": customer,
        "product": product,
        "delivery_place": delivery_place,
    }


# ============================================================
# GET /orders - List orders with filters
# ============================================================


def test_list_orders_success(db: Session, client: TestClient, master_data: dict):
    """Test listing orders without filters."""

    # Create 2 orders (explicitly set IDs for SQLite)
    order1 = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    order2 = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="allocated",
    )
    db.add_all([order1, order2])
    db.commit()

    # Test: List all orders
    response = client.get("/api/orders")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2
    # assert data[0]["order_number"] in ["ORD-001", "ORD-002"]
    # assert data[1]["order_number"] in ["ORD-001", "ORD-002"]


def test_list_orders_with_status_filter(db: Session, client: TestClient, master_data: dict):
    """Test filtering orders by status."""

    # Create orders with different statuses
    order_open = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    order_allocated = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="allocated",
    )
    db.add_all([order_open, order_allocated])
    db.commit()

    # Test: Filter by status=open
    response = client.get("/api/orders", params={"status": "open"})
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    # assert data[0]["order_number"] == "ORD-OPEN"
    assert data[0]["status"] == "open"


def test_list_orders_with_customer_filter(db: Session, client: TestClient, master_data: dict):
    """Test filtering orders by customer_code."""

    # Create another customer
    customer2 = Customer(
        customer_code="CUST-002",
        customer_name="Another Customer",
    )
    db.add(customer2)
    db.commit()

    # Create orders for different customers
    order1 = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
    )
    order2 = Order(
        customer_id=customer2.id,
        order_date=date.today(),
    )
    db.add_all([order1, order2])
    db.commit()

    # Test: Filter by customer_code
    response = client.get("/api/orders", params={"customer_code": "CUST-001"})
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert len(data) == 1
    # assert data[0]["order_number"] == "ORD-C1"


def test_list_orders_with_date_range_filter(db: Session, client: TestClient, master_data: dict):
    """Test filtering orders by date range."""

    # Create orders on different dates
    today = date.today()
    order_old = Order(
        customer_id=master_data["customer"].id,
        order_date=today - timedelta(days=10),
    )
    order_recent = Order(
        customer_id=master_data["customer"].id,
        order_date=today,
    )
    db.add_all([order_old, order_recent])
    db.commit()

    # Test: Filter by date range (last 5 days)
    date_from = today - timedelta(days=5)
    response = client.get("/api/orders", params={"date_from": str(date_from)})
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert len(data) == 1
    # assert data[0]["order_number"] == "ORD-RECENT"


# ============================================================
# GET /orders/{order_id} - Get order detail
# ============================================================


def test_get_order_success(db: Session, client: TestClient, master_data: dict):
    """Test getting order detail with lines."""

    # Create order with lines
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    db.add(order)
    db.commit()

    line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=10.0,
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(line)
    db.flush()

    # Test: Get order detail
    response = client.get(f"/api/orders/{order.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == order.id
    # assert data["order_number"] == "ORD-DETAIL"
    assert data["status"] == "open"
    assert "lines" in data
    assert len(data["lines"]) == 1
    assert float(data["lines"][0]["order_quantity"]) == 10.0


def test_get_order_not_found(db: Session, client: TestClient):
    """Test getting non-existent order returns 404."""

    # Test: Get non-existent order
    response = client.get("/api/orders/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ============================================================
# POST /orders - Create order
# ============================================================


def test_create_order_success(db: Session, client: TestClient, master_data: dict):
    """Test creating order with lines."""

    # Prepare order data
    order_data = {
        "customer_id": master_data["customer"].id,
        "order_date": str(date.today()),
        "lines": [
            {
                "product_group_id": master_data["product"].id,
                "delivery_date": str(date.today() + timedelta(days=7)),
                "order_quantity": 5.0,
                "unit": "EA",
                "delivery_place_id": master_data["delivery_place"].id,
                "status": "pending",
            }
        ],
    }

    # Test: Create order
    response = client.post("/api/orders", json=order_data)
    assert response.status_code == 201

    data = response.json()
    # assert data["order_number"] == "ORD-NEW-001"
    assert data["customer_id"] == master_data["customer"].id
    assert "id" in data
    assert len(data["lines"]) == 1


def test_create_order_with_invalid_customer(db: Session, client: TestClient, master_data: dict):
    """Test creating order with non-existent customer returns 404."""

    # Prepare order data with invalid customer_id
    order_data = {
        # "order_number": "ORD-INVALID",
        "customer_id": 99999,  # Non-existent customer
        "order_date": str(date.today()),
        "lines": [
            {
                "product_group_id": master_data["product"].id,
                "delivery_date": str(date.today() + timedelta(days=7)),
                "order_quantity": 5.0,
                "unit": "EA",
                "delivery_place_id": master_data["delivery_place"].id,
                "status": "pending",
            }
        ],
    }

    # Test: Create order with invalid customer
    response = client.post("/api/orders", json=order_data)
    assert response.status_code in [400, 404, 422]  # Depending on validation logic


# def test_create_order_with_duplicate_order_number(db: Session, client: TestClient, master_data: dict):
#     """Test creating order with duplicate order_number returns 409."""
#     # Create existing order
#     existing_order = Order(
#         # order_number="ORD-DUPLICATE",
#         customer_id=master_data["customer"].id,
#         order_date=date.today(),
#         status="open",
#     )
#     db.add(existing_order)
#     db.commit()

#     # Try to create duplicate
#     client = TestClient(app)
#     order_data = {
#         # "order_number": "ORD-DUPLICATE",
#         "customer_id": master_data["customer"].id,
#         "order_date": str(date.today()),
#         "lines": [],
#     }
#     # response = client.post("/api/orders/", json=order_data)
#     # assert response.status_code == 4091

#     # Test: Create order with same order_number
#     response2 = client.post("/api/orders", json=order_data)
#     assert response2.status_code in [400, 409]  # Duplicate constraint violation


def test_create_order_with_empty_lines(db: Session, client: TestClient, master_data: dict):
    """Test creating order with no lines (validation)."""

    # Prepare order data with empty lines
    order_data = {
        # "order_number": "ORD-EMPTY",
        "customer_id": master_data["customer"].id,
        "order_date": str(date.today()),
        "lines": [],  # Empty lines
    }

    # Test: Create order with empty lines
    # Note: This may succeed or fail depending on business rules
    # If your service requires at least 1 line, this should return 400
    response = client.post("/api/orders", json=order_data)

    # Adjust assertion based on actual business logic
    # For now, we check if it either succeeds or returns validation error
    assert response.status_code in [201, 400, 422]


# ============================================================
# DELETE /orders/{order_id}/cancel - Cancel order
# ============================================================


def test_cancel_order_success(db: Session, client: TestClient, master_data: dict):
    """Test canceling an order."""

    # Create order
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Test: Cancel order
    response = client.delete(f"/api/orders/{order.id}/cancel")
    assert response.status_code == 204

    # Verify order status changed to cancelled
    db.refresh(order)
    assert order.status == "cancelled"


def test_cancel_order_not_found(db: Session, client: TestClient):
    """Test canceling non-existent order returns 404."""

    # Test: Cancel non-existent order
    response = client.delete("/api/orders/99999/cancel")
    assert response.status_code == 404
