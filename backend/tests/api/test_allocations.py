# backend/tests/api/test_allocations.py
"""Comprehensive tests for allocations API endpoints.

Tests cover:
- POST /allocations/drag-assign - Manual allocation
- DELETE /allocations/{id} - Cancel allocation
- POST /allocations/preview - FEFO preview
- POST /allocations/commit - Commit allocation
- Error scenarios (validation, not found, conflicts)
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import (
    Allocation,
    Customer,
    DeliveryPlace,
    Lot,
    Order,
    OrderLine,
    Product,
    Warehouse,
)


# ---- Test DB session using conftest.py fixtures
def _truncate_all(db: Session):
    """Clean up test data in dependency order."""
    for table in [Allocation, OrderLine, Order, Lot, DeliveryPlace, Product, Customer, Warehouse]:
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
    """Create master data for allocations testing."""
    # Warehouse (explicitly set ID for SQLite compatibility)
    warehouse = Warehouse(
        id=1,
        warehouse_code="WH-001",
        warehouse_name="Main Warehouse",
        warehouse_type="internal",
    )
    test_db.add(warehouse)
    test_db.commit()
    test_db.refresh(warehouse)

    # Customer (explicitly set ID)
    customer = Customer(
        id=1,
        customer_code="CUST-001",
        customer_name="Test Customer",
    )
    test_db.add(customer)
    test_db.commit()
    test_db.refresh(customer)

    # Product (explicitly set ID)
    product = Product(
        id=1,
        maker_part_code="PROD-001",
        product_name="Test Product",
        base_unit="EA",
    )
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)

    # Delivery Place
    delivery_place = DeliveryPlace(
        id=1,
        customer_id=customer.id,
        delivery_place_code="DEL-001",
        delivery_place_name="Test Delivery Place",
    )
    test_db.add(delivery_place)
    test_db.commit()
    test_db.refresh(delivery_place)

    # Create lot with stock
    lot = Lot(
        id=1,
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
# POST /allocations/drag-assign - Manual allocation
# ============================================================


def test_drag_assign_success(test_db: Session, master_data: dict):
    """Test manual allocation (drag-assign) success."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        id=1,
        order_number="ORD-001",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()

    order_line = OrderLine(
        id=1,
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

    # Test: Manual allocation
    payload = {
        "order_line_id": order_line.id,
        "lot_id": master_data["lot"].id,
        "allocated_quantity": 10.0,
    }

    response = client.post("/api/allocations/drag-assign", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert "allocation_id" in data
    assert data["remaining_lot_qty"] == 90.0  # 100 - 10


def test_drag_assign_with_deprecated_field(test_db: Session, master_data: dict):
    """Test manual allocation with deprecated allocate_qty field."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        id=10,
        order_number="ORD-DEP",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()

    order_line = OrderLine(
        id=10,
        order_id=order.id,
        product_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("5.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()

    # Test: Use deprecated field name
    payload = {
        "order_line_id": order_line.id,
        "lot_id": master_data["lot"].id,
        "allocate_qty": 5.0,  # Deprecated field
    }

    response = client.post("/api/allocations/drag-assign", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_drag_assign_missing_quantity_returns_400(test_db: Session, master_data: dict):
    """Test manual allocation without quantity returns 400."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        id=20,
        order_number="ORD-NO-QTY",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()

    order_line = OrderLine(
        id=20,
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

    # Test: Missing quantity
    payload = {
        "order_line_id": order_line.id,
        "lot_id": master_data["lot"].id,
        # No allocated_quantity or allocate_qty
    }

    response = client.post("/api/allocations/drag-assign", json=payload)
    assert response.status_code == 400
    assert "allocated_quantity" in response.json()["detail"].lower()


def test_drag_assign_insufficient_stock_returns_400(test_db: Session, master_data: dict):
    """Test manual allocation with insufficient stock returns 400."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        id=30,
        order_number="ORD-INSUF",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()

    order_line = OrderLine(
        id=30,
        order_id=order.id,
        product_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("200.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()

    # Test: Allocate more than available (lot has 100)
    payload = {
        "order_line_id": order_line.id,
        "lot_id": master_data["lot"].id,
        "allocated_quantity": 200.0,
    }

    response = client.post("/api/allocations/drag-assign", json=payload)
    assert response.status_code in [400, 409]  # Insufficient stock


# ============================================================
# DELETE /allocations/{id} - Cancel allocation
# ============================================================


def test_cancel_allocation_success(test_db: Session, master_data: dict):
    """Test canceling an allocation."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        id=40,
        order_number="ORD-CANCEL",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()

    order_line = OrderLine(
        id=40,
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

    # Create allocation
    allocation = Allocation(
        id=1,
        order_line_id=order_line.id,
        lot_id=master_data["lot"].id,
        allocated_quantity=Decimal("10.000"),
        allocation_status="confirmed",
    )
    test_db.add(allocation)
    test_db.commit()

    # Test: Cancel allocation
    response = client.delete(f"/api/allocations/{allocation.id}")
    assert response.status_code == 204

    # Verify allocation is cancelled (soft delete or status change)
    test_db.refresh(allocation)
    # Depending on implementation: check deleted_at or status


def test_cancel_allocation_not_found(test_db: Session):
    """Test canceling non-existent allocation returns 404."""
    client = TestClient(app)

    # Test: Cancel non-existent allocation
    response = client.delete("/api/allocations/99999")
    assert response.status_code == 404


# ============================================================
# POST /allocations/preview - FEFO preview
# ============================================================


def test_preview_allocations_success(test_db: Session, master_data: dict):
    """Test FEFO allocation preview."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        id=50,
        order_number="ORD-PREVIEW",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()

    order_line = OrderLine(
        id=50,
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

    # Test: Preview FEFO allocation
    payload = {"order_id": order.id}

    response = client.post("/api/allocations/preview", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["order_id"] == order.id
    assert "lines" in data
    assert len(data["lines"]) > 0


def test_preview_allocations_order_not_found(test_db: Session):
    """Test FEFO preview for non-existent order returns 404."""
    client = TestClient(app)

    # Test: Preview for non-existent order
    payload = {"order_id": 99999}

    response = client.post("/api/allocations/preview", json=payload)
    assert response.status_code == 404


# ============================================================
# POST /allocations/commit - Commit allocation
# ============================================================


def test_commit_allocation_success(test_db: Session, master_data: dict):
    """Test committing allocation."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        id=60,
        order_number="ORD-COMMIT",
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.commit()

    order_line = OrderLine(
        id=60,
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

    # Test: Commit allocation
    payload = {"order_id": order.id}

    response = client.post("/api/allocations/commit", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["order_id"] == order.id
    assert data["status"] == "committed"
    assert "created_allocation_ids" in data
    assert len(data["created_allocation_ids"]) > 0


def test_commit_allocation_order_not_found(test_db: Session):
    """Test committing allocation for non-existent order returns 404."""
    client = TestClient(app)

    # Test: Commit for non-existent order
    payload = {"order_id": 99999}

    response = client.post("/api/allocations/commit", json=payload)
    assert response.status_code == 404
