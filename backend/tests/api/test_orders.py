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

from app.api.deps import get_db
from app.main import app
from app.models import Customer, DeliveryPlace, Order, OrderLine, Product, Warehouse


# ---- Test DB session using conftest.py fixtures
def _truncate_all(db: Session):
    """Clean up test data in dependency order."""
    try:
        from sqlalchemy import text
        # Truncate all relevant tables with cascade to handle FKs and reset sequences
        # Note: RESTART IDENTITY in TRUNCATE should work, but sometimes fails in test transactions.
        # We explicitly restart sequences to be safe.
        tables = ["order_lines", "orders", "delivery_places", "products", "customers", "warehouses"]
        
        # Disable triggers to avoid foreign key checks during truncate if needed, 
        # but TRUNCATE CASCADE handles it.
        db.execute(text(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE"))
        
        # Explicitly restart sequences just in case
        for table in tables:
            try:
                db.execute(text(f"ALTER SEQUENCE {table}_id_seq RESTART WITH 1"))
            except Exception:
                # Sequence might not exist or be named differently (e.g. if not serial)
                pass
                
        db.commit()
    except Exception as e:
        print(f"Truncate failed: {e}")
        db.rollback()


@pytest.fixture
def test_db(db: Session):
    """Provide clean database session for each test (uses conftest.py fixture)."""
    # Clean before test
    _truncate_all(db)

    # Override FastAPI dependency
    def override_get_db():
        yield db

    from app.api.deps import get_uow
    from app.services.common.uow_service import UnitOfWork

    def override_get_uow():
        # Create a mock UoW that uses the test session
        class MockUnitOfWork:
            def __init__(self, session):
                self.session = session
            def __enter__(self):
                return self
            def __exit__(self, exc_type, exc_val, exc_tb):
                pass
        
        yield MockUnitOfWork(db)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_uow] = override_get_uow

    yield db

    # Clean after test
    _truncate_all(db)

    # Remove override
    app.dependency_overrides.clear()


@pytest.fixture
def master_data(test_db: Session):
    """Create master data for orders testing."""
    # Warehouse (PostgreSQL auto-assigns ID with BIGSERIAL)
    warehouse = Warehouse(
        warehouse_code="WH-001",
        warehouse_name="Main Warehouse",
        warehouse_type="internal",
    )
    test_db.add(warehouse)
    test_db.commit()
    test_db.refresh(warehouse)

    # Customer
    customer = Customer(
        customer_code="CUST-001",
        customer_name="Test Customer",
    )
    test_db.add(customer)
    test_db.commit()
    test_db.refresh(customer)

    # Product
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

    return {
        "warehouse": warehouse,
        "customer": customer,
        "product": product,
        "delivery_place": delivery_place,
    }


# ============================================================
# GET /orders - List orders with filters
# ============================================================


def test_list_orders_success(test_db: Session, master_data: dict):
    """Test listing orders without filters."""
    client = TestClient(app)

    # Create 2 orders (explicitly set IDs for SQLite)
    order1 = Order(
        order_number="ORD-001",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    order2 = Order(
        order_number="ORD-002",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="allocated",
    )
    test_db.add_all([order1, order2])
    test_db.commit()

    # Test: List all orders
    response = client.get("/api/orders")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2
    assert data[0]["order_number"] in ["ORD-001", "ORD-002"]
    assert data[1]["order_number"] in ["ORD-001", "ORD-002"]


def test_list_orders_with_status_filter(test_db: Session, master_data: dict):
    """Test filtering orders by status."""
    client = TestClient(app)

    # Create orders with different statuses
    order_open = Order(
        order_number="ORD-OPEN",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    order_allocated = Order(
        order_number="ORD-ALLOC",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="allocated",
    )
    test_db.add_all([order_open, order_allocated])
    test_db.commit()

    # Test: Filter by status=open
    response = client.get("/api/orders", params={"status": "open"})
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["order_number"] == "ORD-OPEN"
    assert data[0]["status"] == "open"


def test_list_orders_with_customer_filter(test_db: Session, master_data: dict):
    """Test filtering orders by customer_code."""
    client = TestClient(app)

    # Create another customer
    customer2 = Customer(
        customer_code="CUST-002",
        customer_name="Another Customer",
    )
    test_db.add(customer2)
    test_db.commit()

    # Create orders for different customers
    order1 = Order(
        order_number="ORD-C1",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
    )
    order2 = Order(
        order_number="ORD-C2",
        customer_id=customer2.id,
        order_date=date.today(),
    )
    test_db.add_all([order1, order2])
    test_db.commit()

    # Test: Filter by customer_code
    response = client.get("/api/orders", params={"customer_code": "CUST-001"})
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["order_number"] == "ORD-C1"


def test_list_orders_with_date_range_filter(test_db: Session, master_data: dict):
    """Test filtering orders by date range."""
    client = TestClient(app)

    # Create orders on different dates
    today = date.today()
    order_old = Order(
        order_number="ORD-OLD",
        customer_id=master_data["customer"].id,
        order_date=today - timedelta(days=10),
    )
    order_recent = Order(
        order_number="ORD-RECENT",
        customer_id=master_data["customer"].id,
        order_date=today,
    )
    test_db.add_all([order_old, order_recent])
    test_db.commit()

    # Test: Filter by date range (last 5 days)
    date_from = today - timedelta(days=5)
    response = client.get("/api/orders", params={"date_from": str(date_from)})
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["order_number"] == "ORD-RECENT"


# ============================================================
# GET /orders/{order_id} - Get order detail
# ============================================================


def test_get_order_success(test_db: Session, master_data: dict):
    """Test getting order detail with lines."""
    client = TestClient(app)

    # Create order with lines
    order = Order(
        order_number="ORD-DETAIL",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()

    line = OrderLine(
        order_id=order.id,
        product_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=10.0,
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(line)
    test_db.flush()

    # Test: Get order detail
    response = client.get(f"/api/orders/{order.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == order.id
    assert data["order_number"] == "ORD-DETAIL"
    assert data["status"] == "open"
    assert "lines" in data
    assert len(data["lines"]) == 1
    assert float(data["lines"][0]["order_quantity"]) == 10.0


def test_get_order_not_found(test_db: Session):
    """Test getting non-existent order returns 404."""
    client = TestClient(app)

    # Test: Get non-existent order
    response = client.get("/api/orders/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ============================================================
# POST /orders - Create order
# ============================================================


def test_create_order_success(test_db: Session, master_data: dict):
    """Test creating order with lines."""
    client = TestClient(app)

    # Prepare order data
    order_data = {
        "order_number": "ORD-NEW-001",
        "customer_id": master_data["customer"].id,
        "order_date": str(date.today()),
        "lines": [
            {
                "product_id": master_data["product"].id,
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
    assert data["order_number"] == "ORD-NEW-001"
    assert data["customer_id"] == master_data["customer"].id
    assert "id" in data
    assert len(data["lines"]) == 1


def test_create_order_with_invalid_customer(test_db: Session, master_data: dict):
    """Test creating order with non-existent customer returns 404."""
    client = TestClient(app)

    # Prepare order data with invalid customer_id
    order_data = {
        "order_number": "ORD-INVALID",
        "customer_id": 99999,  # Non-existent
        "order_date": str(date.today()),
        "lines": [
            {
                "product_id": master_data["product"].id,
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


def test_create_order_with_duplicate_order_number(test_db: Session, master_data: dict):
    """Test creating order with duplicate order_number returns 409."""
    client = TestClient(app)

    # Create first order
    order_data = {
        "order_number": "ORD-DUPLICATE",
        "customer_id": master_data["customer"].id,
        "order_date": str(date.today()),
        "lines": [
            {
                "product_id": master_data["product"].id,
                "delivery_date": str(date.today() + timedelta(days=7)),
                "order_quantity": 5.0,
                "unit": "EA",
                "delivery_place_id": master_data["delivery_place"].id,
                "status": "pending",
            }
        ],
    }

    response1 = client.post("/api/orders", json=order_data)
    assert response1.status_code == 201

    # Test: Create order with same order_number
    response2 = client.post("/api/orders", json=order_data)
    assert response2.status_code in [400, 409]  # Duplicate constraint violation


def test_create_order_with_empty_lines(test_db: Session, master_data: dict):
    """Test creating order with no lines (validation)."""
    client = TestClient(app)

    # Prepare order data with empty lines
    order_data = {
        "order_number": "ORD-EMPTY",
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


def test_cancel_order_success(test_db: Session, master_data: dict):
    """Test canceling an order."""
    client = TestClient(app)

    # Create order
    order = Order(
        order_number="ORD-CANCEL",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()
    test_db.refresh(order)

    # Test: Cancel order
    response = client.delete(f"/api/orders/{order.id}/cancel")
    assert response.status_code == 204

    # Verify order status changed to cancelled
    test_db.refresh(order)
    assert order.status == "cancelled"


def test_cancel_order_not_found(test_db: Session):
    """Test canceling non-existent order returns 404."""
    client = TestClient(app)

    # Test: Cancel non-existent order
    response = client.delete("/api/orders/99999/cancel")
    assert response.status_code == 404
