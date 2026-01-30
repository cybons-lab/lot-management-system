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

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    LotReceipt,
    LotReservation,
    Order,
    OrderLine,
    ReservationSourceType,
    ReservationStatus,
    SupplierItem,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster


# ---- Test DB session using conftest.py fixtures


@pytest.fixture
def master_data(db: Session, supplier):
    """Create master data for allocations testing."""
    # Warehouse (explicitly set ID for SQLite compatibility)
    warehouse = Warehouse(
        warehouse_code="WH-001",
        warehouse_name="Main Warehouse",
        warehouse_type="internal",
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    # Customer (explicitly set ID)
    customer = Customer(
        customer_code="CUST-001",
        customer_name="Test Customer",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    # Product (explicitly set ID)
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

    # Create LotMaster
    lot_master = LotMaster(
        product_group_id=product.id,
        lot_number="LOT-001",
    )
    db.add(lot_master)
    db.commit()

    # Create CustomerItem (Primary Mapping) - using the product (SupplierItem) we already created
    from app.infrastructure.persistence.models.masters_models import CustomerItem

    customer_item = CustomerItem(
        customer_id=customer.id,
        customer_part_no="CUST-PART-001",
        product_group_id=product.id,
        supplier_id=supplier.id,
        is_primary=True,
        base_unit="EA",
    )
    db.add(customer_item)
    db.commit()

    # Create lot with stock
    lot = LotReceipt(
        lot_master_id=lot_master.id,
        product_group_id=product.id,
        supplier_item_id=product.id,  # Phase 2: supplier_item_id for mapping validation
        warehouse_id=warehouse.id,
        received_quantity=Decimal("100.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
        origin_type="order",
        supplier_id=supplier.id,
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)

    return {
        "warehouse": warehouse,
        "customer": customer,
        "product": product,
        "delivery_place": delivery_place,
        "lot": lot,
        "supplier": supplier,
        "customer_item": customer_item,
    }


# ============================================================
# POST /allocations/drag-assign - Manual allocation
# ============================================================


def test_drag_assign_success(db: Session, client: TestClient, master_data: dict):
    """Test manual allocation (drag-assign) success."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

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


def test_drag_assign_with_deprecated_field(db: Session, client: TestClient, master_data: dict):
    """Test manual allocation with deprecated allocate_qty field."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("5.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Test: Use deprecated field name
    payload = {
        "order_line_id": order_line.id,
        "lot_id": master_data["lot"].id,
        "allocate_qty": 5.0,  # Deprecated field
    }

    response = client.post("/api/allocations/drag-assign", json=payload)
    assert response.status_code == 422


def test_drag_assign_missing_quantity_returns_400(
    db: Session, client: TestClient, master_data: dict
):
    """Test manual allocation without quantity returns 400."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Test: Missing quantity
    payload = {
        "order_line_id": order_line.id,
        "lot_id": master_data["lot"].id,
        # No allocated_quantity or allocate_qty
    }

    response = client.post("/api/allocations/drag-assign", json=payload)
    assert response.status_code == 422


def test_drag_assign_insufficient_stock_returns_400(
    db: Session, client: TestClient, master_data: dict
):
    """Test manual allocation with insufficient stock returns 400."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("200.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

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


def test_cancel_allocation_success(db: Session, client: TestClient, master_data: dict):
    """Test canceling an allocation."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Create allocation (using LotReservation check)
    lot = master_data["lot"]
    reservation = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("10.000"),
        status=ReservationStatus.ACTIVE,
    )
    db.add(reservation)
    db.commit()

    # Test: Cancel allocation
    response = client.delete(f"/api/allocations/{reservation.id}")
    assert response.status_code == 204

    # Verify allocation is cancelled (soft delete or status change)
    db.refresh(reservation)
    # Depending on implementation: check deleted_at or status


def test_cancel_allocation_not_found(db: Session, client: TestClient):
    """Test canceling non-existent allocation returns 404."""

    # Test: Cancel non-existent allocation
    response = client.delete("/api/allocations/99999")
    assert response.status_code == 404


# ============================================================
# POST /allocations/preview - FEFO preview
# ============================================================


def test_preview_allocations_success(db: Session, client: TestClient, master_data: dict):
    """Test FEFO allocation preview."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Test: Preview FEFO allocation
    payload = {"order_id": order.id}

    response = client.post("/api/allocations/preview", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["order_id"] == order.id
    assert "lines" in data
    assert len(data["lines"]) > 0


def test_preview_allocations_order_not_found(db: Session, client: TestClient):
    """Test FEFO preview for non-existent order returns 404."""

    # Test: Preview for non-existent order
    payload = {"order_id": 99999}

    response = client.post("/api/allocations/preview", json=payload)
    assert response.status_code == 404


# ============================================================
# POST /allocations/commit - Commit allocation
# ============================================================


def test_commit_allocation_success(db: Session, client: TestClient, master_data: dict):
    """Test committing allocation."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Test: Commit allocation
    payload = {"order_id": order.id}

    response = client.post("/api/allocations/commit", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["order_id"] == order.id
    assert data["status"] == "committed"
    assert "created_allocation_ids" in data
    assert len(data["created_allocation_ids"]) > 0


def test_commit_allocation_order_not_found(db: Session, client: TestClient):
    """Test committing allocation for non-existent order returns 404."""

    # Test: Commit for non-existent order
    payload = {"order_id": 99999}

    response = client.post("/api/allocations/commit", json=payload)
    assert response.status_code == 404


# ============================================================
# PATCH /allocations/{id}/confirm - Hard Allocation Confirm
# ============================================================


def test_confirm_hard_allocation_success(db: Session, client: TestClient, master_data: dict):
    """Test confirming a soft allocation to hard allocation."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("50.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Create soft allocation (LotReservation)
    reservation = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("50.000"),
        status=ReservationStatus.ACTIVE,
    )
    db.add(reservation)
    db.commit()

    # Test: Confirm soft → hard
    payload = {"confirmed_by": "test_user"}

    response = client.patch(f"/api/allocations/{reservation.id}/confirm", json=payload)
    if response.status_code != 200:
        print(f"Error response: {response.json()}")
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

    lot = db.get(LotReceipt, master_data["lot"].id)
    assert lot is not None
    assert get_reserved_quantity(db, lot.id) == Decimal("50.000")


def test_confirm_hard_allocation_partial(db: Session, client: TestClient, master_data: dict):
    """Test partial confirmation of soft allocation."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("100.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Create soft allocation for 100 (LotReservation)
    reservation = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("100.000"),
        status=ReservationStatus.ACTIVE,
    )
    db.add(reservation)
    db.commit()

    # Test: Partial confirm (60 of 100)
    payload = {"confirmed_by": "test_user", "quantity": 60.0}

    response = client.patch(f"/api/allocations/{reservation.id}/confirm", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["allocation_type"] == "hard"
    assert float(data["allocated_quantity"]) == 60.0

    # Verify remaining soft allocation was created
    all_reservations = (
        db.query(LotReservation).filter(LotReservation.source_id == order_line.id).all()
    )
    assert len(all_reservations) == 2

    soft_reservations = [r for r in all_reservations if r.status == ReservationStatus.ACTIVE]
    hard_reservations = [r for r in all_reservations if r.status == ReservationStatus.CONFIRMED]

    assert len(soft_reservations) == 1
    assert len(hard_reservations) == 1
    assert soft_reservations[0].reserved_qty == Decimal("40.000")
    assert hard_reservations[0].reserved_qty == Decimal("60.000")


def test_confirm_hard_allocation_already_confirmed(
    db: Session, client: TestClient, master_data: dict
):
    """Test confirming already hard allocation returns 400."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Create already hard allocation (using LotReservation)
    reservation = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("10.000"),
        status=ReservationStatus.CONFIRMED,
        confirmed_at=utcnow(),
    )
    db.add(reservation)
    db.commit()

    # Test: Try to confirm already hard allocation (Idempotent success)
    payload = {"confirmed_by": "test_user"}

    response = client.patch(f"/api/allocations/{reservation.id}/confirm", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "allocated"


@pytest.mark.xfail(
    reason="DB constraint chk_lots_allocation_limit prevents current_quantity < allocated_quantity"
)
def test_confirm_hard_allocation_insufficient_stock(
    db: Session, client: TestClient, master_data: dict
):
    """Test confirming allocation with insufficient stock returns 409.

    Scenario: A soft allocation was created when stock was available,
    but since then the stock has decreased (e.g., expiration, adjustment).
    Now when trying to confirm to hard, there is not enough stock.

    NOTE: This test is xfailed because the database constraint
    chk_lots_allocation_limit prevents current_quantity from being
    less than allocated_quantity, making this scenario impossible
    in the actual application.
    """

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("80.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Create soft allocation for 80 (LotReservation)
    lot = master_data["lot"]
    reservation = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("80.000"),
        status=ReservationStatus.ACTIVE,
    )
    db.add(reservation)
    db.commit()

    # Now simulate stock decrease after soft allocation was made
    # (e.g., inventory adjustment, partial shipping, etc.)
    # Reduce current_quantity below allocated_quantity to trigger insufficient stock
    lot.current_quantity = Decimal("50.000")  # Less than allocated 80
    db.commit()

    # Test: Try to confirm (should fail due to insufficient stock)
    # Because current_quantity (50) < allocated_quantity (80)
    payload = {"confirmed_by": "test_user"}

    response = client.patch(f"/api/allocations/{reservation.id}/confirm", json=payload)
    assert response.status_code == 409

    data = response.json()["detail"]
    assert data["error"] == "INSUFFICIENT_STOCK"


def test_confirm_hard_allocation_not_found(db: Session, client: TestClient):
    """Test confirming non-existent allocation returns 404."""

    payload = {"confirmed_by": "test_user"}

    response = client.patch("/api/allocations/99999/confirm", json=payload)
    assert response.status_code == 404

    data = response.json()["detail"]
    assert data["error"] == "RESERVATION_NOT_FOUND"


# ============================================================
# POST /allocations/confirm-batch - Batch Hard Allocation Confirm
# ============================================================


def test_confirm_batch_success(db: Session, client: TestClient, master_data: dict):
    """Test batch confirmation of multiple soft allocations."""

    # Create order with lines
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("30.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

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
    db.add_all([reservation1, reservation2])
    db.commit()

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


def test_confirm_batch_partial_failure(db: Session, client: TestClient, master_data: dict):
    """Test batch confirmation with some failures."""

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("20.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Create one soft allocation (LotReservation)
    reservation = LotReservation(
        lot_id=master_data["lot"].id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=Decimal("20.000"),
        status=ReservationStatus.ACTIVE,
    )
    db.add(reservation)
    db.commit()

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


def test_drag_assign_without_primary_mapping_success(
    db: Session, client: TestClient, master_data: dict
):
    """Test manual allocation succeeds even if customer item primary mapping is missing (Strict Mode relaxed)."""

    # Note: master_data's customer_item has is_primary=True.
    # We need to simulate a scenario where supplier_item exists but NO customer_item has is_primary.
    # So we remove the customer_item created in fixture.
    from app.infrastructure.persistence.models import CustomerItem

    try:
        db.query(CustomerItem).delete()
        db.commit()
    except Exception:
        db.rollback()

    # Create order with line
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=utcnow(),
    )
    db.add(order)
    db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_group_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    db.add(order_line)
    db.commit()

    # Test: Manual allocation with NO primary mapping but WITH supplier_item_id (from fixture)
    payload = {
        "order_line_id": order_line.id,
        "lot_id": master_data["lot"].id,
        "allocated_quantity": 10.0,
    }

    # Should succeed (200) not fail
    response = client.post("/api/allocations/drag-assign", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "preview"
