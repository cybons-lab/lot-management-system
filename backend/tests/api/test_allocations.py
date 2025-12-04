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
# POST /allocations/drag-assign - Manual allocation
# ============================================================


def test_drag_assign_success(test_db: Session, master_data: dict):
    """Test manual allocation (drag-assign) success."""
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
    assert float(data["remaining_lot_qty"]) == 90.0  # 100 - 10


def test_drag_assign_with_deprecated_field(test_db: Session, master_data: dict):
    """Test manual allocation with deprecated allocate_qty field."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        order_number="ORD-DEP",
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
        order_number="ORD-NO-QTY",
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
        order_number="ORD-INSUF",
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


@pytest.mark.xfail(reason="Persistent SQLAlchemy session error: Instance is not persistent")
def test_cancel_allocation_success(test_db: Session, master_data: dict):
    """Test canceling an allocation."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        order_number="ORD-CANCEL",
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

    # Update lot allocated quantity to simulate existing allocation
    lot = master_data["lot"]
    lot.allocated_quantity = Decimal("10.000")
    test_db.add(lot)
    test_db.commit()

    # Create allocation
    allocation = Allocation(
        order_line_id=order_line.id,
        lot_id=master_data["lot"].id,
        allocated_quantity=Decimal("10.000"),
        status="allocated",
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
        order_number="ORD-PREVIEW",
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
        order_number="ORD-COMMIT",
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


# ============================================================
# PATCH /allocations/{id}/confirm - Hard Allocation Confirm
# ============================================================


def test_confirm_hard_allocation_success(test_db: Session, master_data: dict):
    """Test confirming a soft allocation to hard allocation."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        order_number="ORD-HARD-001",
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
        order_quantity=Decimal("50.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()

    # Create soft allocation (allocation_type='soft', not updating lot.allocated_quantity)
    allocation = Allocation(
        order_line_id=order_line.id,
        lot_id=master_data["lot"].id,
        allocated_quantity=Decimal("50.000"),
        allocation_type="soft",
        status="allocated",
    )
    test_db.add(allocation)
    test_db.commit()

    # Verify initial lot state
    # NOTE: 既存コードでは引当作成時にallocated_quantityが加算される
    # このテストでは直接Allocationを作成しているので、手動で設定する必要がある
    lot = test_db.get(Lot, master_data["lot"].id)
    lot.allocated_quantity = Decimal("50.000")  # Soft引当作成をシミュレート
    test_db.commit()

    # Test: Confirm soft → hard
    payload = {"confirmed_by": "test_user"}

    response = client.patch(f"/api/allocations/{allocation.id}/confirm", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == allocation.id
    assert data["allocation_type"] == "hard"
    assert data["confirmed_by"] == "test_user"
    assert data["confirmed_at"] is not None

    # Verify lot allocated_quantity is unchanged (already added at allocation creation)
    test_db.refresh(lot)
    assert lot.allocated_quantity == Decimal("50.000")  # 変更なし


def test_confirm_hard_allocation_partial(test_db: Session, master_data: dict):
    """Test partial confirmation of soft allocation."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        order_number="ORD-HARD-PART",
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
        order_quantity=Decimal("100.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()

    # Create soft allocation for 100
    allocation = Allocation(
        order_line_id=order_line.id,
        lot_id=master_data["lot"].id,
        allocated_quantity=Decimal("100.000"),
        allocation_type="soft",
        status="allocated",
    )
    test_db.add(allocation)
    test_db.commit()

    # Simulate that allocation creation already added to lot.allocated_quantity
    lot = test_db.get(Lot, master_data["lot"].id)
    lot.allocated_quantity = Decimal("100.000")
    test_db.commit()

    # Test: Partial confirm (60 of 100)
    payload = {"confirmed_by": "test_user", "quantity": 60.0}

    response = client.patch(f"/api/allocations/{allocation.id}/confirm", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["allocation_type"] == "hard"
    assert float(data["allocated_quantity"]) == 60.0

    # Verify remaining soft allocation was created
    all_allocations = (
        test_db.query(Allocation).filter(Allocation.order_line_id == order_line.id).all()
    )
    assert len(all_allocations) == 2

    soft_allocations = [a for a in all_allocations if a.allocation_type == "soft"]
    hard_allocations = [a for a in all_allocations if a.allocation_type == "hard"]

    assert len(soft_allocations) == 1
    assert len(hard_allocations) == 1
    assert soft_allocations[0].allocated_quantity == Decimal("40.000")
    assert hard_allocations[0].allocated_quantity == Decimal("60.000")


def test_confirm_hard_allocation_already_confirmed(test_db: Session, master_data: dict):
    """Test confirming already hard allocation returns 400."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        order_number="ORD-HARD-DUP",
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

    # Create already hard allocation
    allocation = Allocation(
        order_line_id=order_line.id,
        lot_id=master_data["lot"].id,
        allocated_quantity=Decimal("10.000"),
        allocation_type="hard",  # Already hard
        status="allocated",
    )
    test_db.add(allocation)
    test_db.commit()

    # Test: Try to confirm already hard allocation
    payload = {"confirmed_by": "test_user"}

    response = client.patch(f"/api/allocations/{allocation.id}/confirm", json=payload)
    assert response.status_code == 400

    data = response.json()["detail"]
    assert data["error"] == "ALREADY_CONFIRMED"


def test_confirm_hard_allocation_insufficient_stock(test_db: Session, master_data: dict):
    """Test confirming allocation with insufficient stock returns 409."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        order_number="ORD-HARD-INSUF",
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
        order_quantity=Decimal("80.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()

    # Use up most of the lot's stock with a hard allocation
    lot = master_data["lot"]
    lot.allocated_quantity = Decimal("90.000")  # Only 10 available
    test_db.commit()

    # Create soft allocation for 80 (more than available 10)
    allocation = Allocation(
        order_line_id=order_line.id,
        lot_id=lot.id,
        allocated_quantity=Decimal("80.000"),
        allocation_type="soft",
        status="allocated",
    )
    test_db.add(allocation)
    test_db.commit()

    # Test: Try to confirm (should fail due to insufficient stock)
    payload = {"confirmed_by": "test_user"}

    response = client.patch(f"/api/allocations/{allocation.id}/confirm", json=payload)
    assert response.status_code == 409

    data = response.json()["detail"]
    assert data["error"] == "INSUFFICIENT_STOCK"


def test_confirm_hard_allocation_not_found(test_db: Session):
    """Test confirming non-existent allocation returns 404."""
    client = TestClient(app)

    payload = {"confirmed_by": "test_user"}

    response = client.patch("/api/allocations/99999/confirm", json=payload)
    assert response.status_code == 404

    data = response.json()["detail"]
    assert data["error"] == "ALLOCATION_NOT_FOUND"


# ============================================================
# POST /allocations/confirm-batch - Batch Hard Allocation Confirm
# ============================================================


def test_confirm_batch_success(test_db: Session, master_data: dict):
    """Test batch confirmation of multiple soft allocations."""
    client = TestClient(app)

    # Create order with lines
    order = Order(
        order_number="ORD-BATCH",
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
        order_quantity=Decimal("30.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()

    # Create multiple soft allocations
    allocation1 = Allocation(
        order_line_id=order_line.id,
        lot_id=master_data["lot"].id,
        allocated_quantity=Decimal("10.000"),
        allocation_type="soft",
        status="allocated",
    )
    allocation2 = Allocation(
        order_line_id=order_line.id,
        lot_id=master_data["lot"].id,
        allocated_quantity=Decimal("20.000"),
        allocation_type="soft",
        status="allocated",
    )
    test_db.add_all([allocation1, allocation2])
    test_db.commit()

    # Test: Batch confirm
    payload = {
        "allocation_ids": [allocation1.id, allocation2.id],
        "confirmed_by": "batch_user",
    }

    response = client.post("/api/allocations/confirm-batch", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["confirmed"]) == 2
    assert allocation1.id in data["confirmed"]
    assert allocation2.id in data["confirmed"]
    assert len(data["failed"]) == 0


def test_confirm_batch_partial_failure(test_db: Session, master_data: dict):
    """Test batch confirmation with some failures."""
    client = TestClient(app)

    # Create order with line
    order = Order(
        order_number="ORD-BATCH-FAIL",
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
        order_quantity=Decimal("20.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()

    # Create one soft allocation
    allocation = Allocation(
        order_line_id=order_line.id,
        lot_id=master_data["lot"].id,
        allocated_quantity=Decimal("20.000"),
        allocation_type="soft",
        status="allocated",
    )
    test_db.add(allocation)
    test_db.commit()

    # Test: Batch confirm with one valid and one invalid ID
    payload = {
        "allocation_ids": [allocation.id, 99999],  # 99999 doesn't exist
        "confirmed_by": "batch_user",
    }

    response = client.post("/api/allocations/confirm-batch", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["confirmed"]) == 1
    assert allocation.id in data["confirmed"]
    assert len(data["failed"]) == 1
    assert data["failed"][0]["id"] == 99999
    assert data["failed"][0]["error"] == "ALLOCATION_NOT_FOUND"
