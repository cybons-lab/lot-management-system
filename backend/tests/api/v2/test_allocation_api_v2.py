from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    Lot,
    Order,
    OrderLine,
    Product,
    Supplier,
    Warehouse,
)


@pytest.fixture
def setup_allocation_data(db_session):
    # Master Data
    supplier = Supplier(supplier_code="sup_alloc", supplier_name="Test Supplier Alloc")
    db_session.add(supplier)

    product = Product(
        maker_part_code="PRD-ALLOC-001",
        product_name="Test Product Alloc",
        base_unit="EA",
    )
    db_session.add(product)

    warehouse = Warehouse(
        warehouse_code="WH-ALLOC",
        warehouse_name="Test Warehouse Alloc",
        warehouse_type="internal",
    )
    db_session.add(warehouse)

    customer = Customer(
        customer_code="CUST-ALLOC",
        customer_name="Test Customer Alloc",
    )
    db_session.add(customer)
    db_session.flush()

    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-ALLOC",
        delivery_place_name="Test DP Alloc",
    )
    db_session.add(delivery_place)
    db_session.commit()

    # Lot
    lot = Lot(
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        lot_number="LOT-ALLOC-001",
        current_quantity=Decimal("100.0"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
    )
    db_session.add(lot)

    # Order & OrderLine
    order = Order(
        customer_id=customer.id,
        order_date=date.today(),
    )
    db_session.add(order)
    db_session.flush()

    order_line = OrderLine(
        order_id=order.id,
        product_id=product.id,
        delivery_place_id=delivery_place.id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.0"),
        unit="EA",
    )
    db_session.add(order_line)
    db_session.commit()

    db_session.refresh(lot)
    db_session.refresh(order_line)

    return {"lot": lot, "order": order, "order_line": order_line, "product": product}


def test_manual_allocate(client, setup_allocation_data):
    """Test manual allocation creation."""
    lot = setup_allocation_data["lot"]
    order_line = setup_allocation_data["order_line"]

    payload = {"order_line_id": order_line.id, "lot_id": lot.id, "allocated_quantity": 5.0}

    response = client.post("/api/v2/allocation/manual", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["order_line_id"] == order_line.id
    assert data["lot_id"] == lot.id
    assert float(data["allocated_quantity"]) == 5.0
    assert data["status"] == "allocated"  # or preview/soft depending on implementation

    # Verify logical deletion of quantity (reservation)
    # Check if available quantity reflects reservation
    avail_response = client.get(
        "/api/v2/lot/available", params={"product_id": lot.product_id, "min_quantity": 0}
    )
    assert avail_response.status_code == 200
    avail_data = avail_response.json()
    # Should be 100 - 5 = 95
    target_lot = next(item for item in avail_data if item["lot_id"] == lot.id)
    assert float(target_lot["available_qty"]) == 95.0


def test_manual_allocate_insufficient_stock(client, setup_allocation_data):
    """Test allocation failure due to insufficient stock."""
    lot = setup_allocation_data["lot"]
    order_line = setup_allocation_data["order_line"]

    payload = {
        "order_line_id": order_line.id,
        "lot_id": lot.id,
        "allocated_quantity": 101.0,  # Exceeds 100
    }

    response = client.post("/api/v2/allocation/manual", json=payload)

    # Depending on implementation, might return 400 or 404/422 with detail
    assert response.status_code in [400, 404, 422]
    # Check error message if possible


def test_list_allocations_by_order(client, setup_allocation_data):
    """Test listing allocations by order ID."""
    lot = setup_allocation_data["lot"]
    order = setup_allocation_data["order"]
    order_line = setup_allocation_data["order_line"]

    # Create allocation first
    client.post(
        "/api/v2/allocation/manual",
        json={"order_line_id": order_line.id, "lot_id": lot.id, "allocated_quantity": 10.0},
    )

    response = client.get(f"/api/v2/allocation/by-order/{order.id}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    item = data[0]
    assert item["order_line_id"] == order_line.id
    assert item["lot_id"] == lot.id
    assert float(item["allocated_quantity"]) == 10.0
