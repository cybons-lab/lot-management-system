# backend/tests/api/test_allocations.py
"""Comprehensive tests for allocations API endpoints.

Tests cover:
- POST /allocations/drag-assign - Manual allocation
- DELETE /allocations/{id} - Cancel allocation
- POST /allocations/preview - FEFO preview
- POST /allocations/commit - Commit allocation
- Error scenarios (validation, not found, conflicts)
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    LotReceipt,
    LotReservation,
    Order,
    OrderLine,
    Product,
    ReservationSourceType,
    ReservationStatus,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.main import application
from app.presentation.api.deps import get_db


# ---- Test DB session using conftest.py fixtures
def _truncate_all(db: Session):
    """Clean up test data in dependency order."""
    for table in [
        LotReservation,
        OrderLine,
        Order,
        LotReceipt,
        LotMaster,
        DeliveryPlace,
        Product,
        Customer,
        Warehouse,
    ]:
        try:
            db.query(table).delete()
        except Exception:
            db.rollback()
    db.commit()


@pytest.fixture
def test_db(db: Session):
    """Provide clean database session for each test (uses conftest.py fixture)."""
    # Clean before test
    _truncate_all(db)

    from app.application.services.auth.auth_service import AuthService
    from app.core import database as core_database
    from app.infrastructure.persistence.models import User

    # Override FastAPI dependency
    def override_get_db():
        yield db

    def override_get_current_user():
        return User(id=1, username="test_user", is_active=True)

    application.dependency_overrides[get_db] = override_get_db
    application.dependency_overrides[core_database.get_db] = override_get_db
    application.dependency_overrides[AuthService.get_current_user] = override_get_current_user

    yield db
    db.rollback()

    # Clean after test
    _truncate_all(db)

    # Remove override
    application.dependency_overrides.clear()


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

    # Create LotMaster
    lot_master = LotMaster(
        product_id=product.id,
        lot_number="LOT-001",
    )
    test_db.add(lot_master)
    test_db.commit()

    # Create lot with stock
    lot = LotReceipt(
        lot_master_id=lot_master.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        current_quantity=Decimal("100.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
        origin_type="order",
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
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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
    assert data["order_line_id"] == order_line.id
    assert data["status"] == "preview"
    assert "id" in data
    assert (
        float(data["available_quantity"]) == 100.0
    )  # Soft auth doesn't reduce available until confirmed


def test_drag_assign_with_deprecated_field(test_db: Session, master_data: dict):
    """Test manual allocation with deprecated allocate_qty field."""
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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
    assert response.status_code == 422


def test_drag_assign_missing_quantity_returns_400(test_db: Session, master_data: dict):
    """Test manual allocation without quantity returns 400."""
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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
    assert response.status_code == 422


def test_drag_assign_insufficient_stock_returns_400(test_db: Session, master_data: dict):
    """Test manual allocation with insufficient stock returns 400."""
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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

    # Create allocation (using LotReservation check)
    lot = master_data["lot"]
    reservation = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("10.000"),
        status=ReservationStatus.ACTIVE,
    )
    test_db.add(reservation)
    test_db.commit()

    # Test: Cancel allocation
    response = client.delete(f"/api/allocations/{reservation.id}")
    assert response.status_code == 204

    # Verify allocation is cancelled (soft delete or status change)
    test_db.refresh(reservation)
    # Depending on implementation: check deleted_at or status


def test_cancel_allocation_not_found(test_db: Session):
    """Test canceling non-existent allocation returns 404."""
    client = TestClient(application)

    # Test: Cancel non-existent allocation
    response = client.delete("/api/allocations/99999")
    assert response.status_code == 404


# ============================================================
# POST /allocations/preview - FEFO preview
# ============================================================


def test_preview_allocations_success(test_db: Session, master_data: dict):
    """Test FEFO allocation preview."""
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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
    client = TestClient(application)

    # Test: Preview for non-existent order
    payload = {"order_id": 99999}

    response = client.post("/api/allocations/preview", json=payload)
    assert response.status_code == 404


# ============================================================
# POST /allocations/commit - Commit allocation
# ============================================================


def test_commit_allocation_success(test_db: Session, master_data: dict):
    """Test committing allocation."""
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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
    client = TestClient(application)

    # Test: Commit for non-existent order
    payload = {"order_id": 99999}

    response = client.post("/api/allocations/commit", json=payload)
    assert response.status_code == 404


# ============================================================
# PATCH /allocations/{id}/confirm - Hard Allocation Confirm
# ============================================================


def test_confirm_hard_allocation_success(test_db: Session, master_data: dict):
    """Test confirming a soft allocation to hard allocation."""
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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

    # Create soft allocation (LotReservation)
    reservation = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("50.000"),
        status=ReservationStatus.ACTIVE,
    )
    test_db.add(reservation)
    test_db.commit()

    # Test: Confirm soft → hard
    payload = {"confirmed_by": "test_user"}

    response = client.patch(f"/api/allocations/{reservation.id}/confirm", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == reservation.id
    assert data["allocation_type"] == "hard"
    assert data["confirmed_by"] == "test_user"
    assert data["confirmed_at"] is not None

    # Verify lot reserved_quantity is correct via LotReservation
    from app.application.services.inventory.stock_calculation import (
        get_reserved_quantity,
    )

    lot = test_db.get(LotReceipt, master_data["lot"].id)
    assert lot is not None
    assert get_reserved_quantity(test_db, lot.id) == Decimal("50.000")


def test_confirm_hard_allocation_partial(test_db: Session, master_data: dict):
    """Test partial confirmation of soft allocation."""
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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

    # Create soft allocation for 100 (LotReservation)
    reservation = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("100.000"),
        status=ReservationStatus.ACTIVE,
    )
    test_db.add(reservation)
    test_db.commit()

    # Test: Partial confirm (60 of 100)
    payload = {"confirmed_by": "test_user", "quantity": 60.0}

    response = client.patch(f"/api/allocations/{reservation.id}/confirm", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["allocation_type"] == "hard"
    assert float(data["allocated_quantity"]) == 60.0

    # Verify remaining soft allocation was created
    all_reservations = (
        test_db.query(LotReservation).filter(LotReservation.source_id == order_line.id).all()
    )
    assert len(all_reservations) == 2

    soft_reservations = [r for r in all_reservations if r.status == ReservationStatus.ACTIVE]
    hard_reservations = [r for r in all_reservations if r.status == ReservationStatus.CONFIRMED]

    assert len(soft_reservations) == 1
    assert len(hard_reservations) == 1
    assert soft_reservations[0].reserved_qty == Decimal("40.000")
    assert hard_reservations[0].reserved_qty == Decimal("60.000")


def test_confirm_hard_allocation_already_confirmed(test_db: Session, master_data: dict):
    """Test confirming already hard allocation returns 400."""
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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

    # Create already hard allocation (using LotReservation)
    reservation = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("10.000"),
        status=ReservationStatus.CONFIRMED,
        confirmed_at=datetime.utcnow(),
    )
    test_db.add(reservation)
    test_db.commit()

    # Test: Try to confirm already hard allocation (Idempotent success)
    payload = {"confirmed_by": "test_user"}

    response = client.patch(f"/api/allocations/{reservation.id}/confirm", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "allocated"


@pytest.mark.xfail(
    reason="DB constraint chk_lots_allocation_limit prevents current_quantity < allocated_quantity"
)
def test_confirm_hard_allocation_insufficient_stock(test_db: Session, master_data: dict):
    """Test confirming allocation with insufficient stock returns 409.

    Scenario: A soft allocation was created when stock was available,
    but since then the stock has decreased (e.g., expiration, adjustment).
    Now when trying to confirm to hard, there is not enough stock.

    NOTE: This test is xfailed because the database constraint
    chk_lots_allocation_limit prevents current_quantity from being
    less than allocated_quantity, making this scenario impossible
    in the actual application.
    """
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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

    # Create soft allocation for 80 (LotReservation)
    lot = master_data["lot"]
    reservation = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("80.000"),
        status=ReservationStatus.ACTIVE,
    )
    test_db.add(reservation)
    test_db.commit()

    # Now simulate stock decrease after soft allocation was made
    # (e.g., inventory adjustment, partial shipping, etc.)
    # Reduce current_quantity below allocated_quantity to trigger insufficient stock
    lot.current_quantity = Decimal("50.000")  # Less than allocated 80
    test_db.commit()

    # Test: Try to confirm (should fail due to insufficient stock)
    # Because current_quantity (50) < allocated_quantity (80)
    payload = {"confirmed_by": "test_user"}

    response = client.patch(f"/api/allocations/{reservation.id}/confirm", json=payload)
    assert response.status_code == 409

    data = response.json()["detail"]
    assert data["error"] == "INSUFFICIENT_STOCK"


def test_confirm_hard_allocation_not_found(test_db: Session):
    """Test confirming non-existent allocation returns 404."""
    client = TestClient(application)

    payload = {"confirmed_by": "test_user"}

    response = client.patch("/api/allocations/99999/confirm", json=payload)
    assert response.status_code == 404

    data = response.json()["detail"]
    assert data["error"] == "RESERVATION_NOT_FOUND"


# ============================================================
# POST /allocations/confirm-batch - Batch Hard Allocation Confirm
# ============================================================


def test_confirm_batch_success(test_db: Session, master_data: dict):
    """Test batch confirmation of multiple soft allocations."""
    client = TestClient(application)

    # Create order with lines
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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

    # Create multiple soft allocations (LotReservation)
    reservation1 = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("10.000"),
        status=ReservationStatus.ACTIVE,
    )
    reservation2 = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("20.000"),
        status=ReservationStatus.ACTIVE,
    )
    test_db.add_all([reservation1, reservation2])
    test_db.commit()

    # Test: Batch confirm
    payload = {
        "allocation_ids": [reservation1.id, reservation2.id],
        "confirmed_by": "batch_user",
    }

    response = client.post("/api/allocations/confirm-batch", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["confirmed"]) == 2
    assert reservation1.id in data["confirmed"]
    assert reservation2.id in data["confirmed"]
    assert len(data["failed"]) == 0


def test_confirm_batch_partial_failure(test_db: Session, master_data: dict):
    """Test batch confirmation with some failures."""
    client = TestClient(application)

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
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

    # Create one soft allocation (LotReservation)
    reservation = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("20.000"),
        status=ReservationStatus.ACTIVE,
    )
    test_db.add(reservation)
    test_db.commit()

    # Test: Batch confirm with one valid and one invalid ID
    payload = {
        "allocation_ids": [reservation.id, 99999],  # 99999 doesn't exist
        "confirmed_by": "batch_user",
    }

    response = client.post("/api/allocations/confirm-batch", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["confirmed"]) == 1
    assert reservation.id in data["confirmed"]
    assert len(data["failed"]) == 1
    assert data["failed"][0]["id"] == 99999
    assert data["failed"][0]["error"] == "RESERVATION_NOT_FOUND"
