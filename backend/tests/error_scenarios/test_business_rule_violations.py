from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Lot, Order, OrderLine


def create_order_line(db: Session, master_data, qty=10):
    """Helper to create an order line."""
    # customer = master_data["customer"]
    delivery_place = master_data["delivery_place"]
    product = master_data["product1"]

    # Create valid order
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
    )
    db.add(order)
    db.flush()

    line = OrderLine(
        order_id=order.id,
        product_id=product.id,
        order_quantity=qty,
        delivery_date=date.today() + timedelta(days=7),
        delivery_place_id=delivery_place.id,
        unit="EA",
    )
    db.add(line)
    db.commit()
    db.refresh(line)
    return line


def test_allocate_expired_lot(client: TestClient, db: Session, master_data):
    """Test allocating an expired lot."""
    product = master_data["product1"]
    warehouse = master_data["warehouse"]
    supplier = master_data["supplier"]

    # Create expired lot
    expired_lot = Lot(
        lot_number="LOT-EXPIRED",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=100,
        received_date=date.today() - timedelta(days=100),
        expiry_date=date.today() - timedelta(days=1),
        status="expired",
        unit="EA",
    )
    db.add(expired_lot)
    db.commit()
    db.refresh(expired_lot)

    order_line = create_order_line(db, master_data)

    # Try to allocate
    response = client.post(
        "/api/allocations/drag-assign",
        json={"order_line_id": order_line.id, "lot_id": expired_lot.id, "allocated_quantity": 10},
    )

    # Current implementation returns 400 Bad Request for allocation errors
    assert response.status_code == 400
    assert "active" in response.text.lower()


def test_allocate_more_than_available(client: TestClient, db: Session, master_data):
    """Test allocating more than available quantity."""
    product = master_data["product1"]
    warehouse = master_data["warehouse"]
    supplier = master_data["supplier"]

    # Create lot with limited quantity
    lot = Lot(
        lot_number="LOT-LIMITED",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=10,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)

    order_line = create_order_line(db, master_data, qty=20)

    # Try to allocate more than available
    response = client.post(
        "/api/allocations/drag-assign",
        json={"order_line_id": order_line.id, "lot_id": lot.id, "allocated_quantity": 15},
    )

    # Current implementation returns 400 Bad Request for insufficient stock
    assert response.status_code == 400
    assert "insufficient" in response.text.lower()


def test_allocate_to_wrong_product(client: TestClient, db: Session, master_data):
    """Test allocating lot of product A to order line of product B."""
    product1 = master_data["product1"]
    product2 = master_data["product2"]
    warehouse = master_data["warehouse"]
    supplier = master_data["supplier"]

    # Lot is Product 1
    lot = Lot(
        lot_number="LOT-PRD-1",
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=100,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)

    # Order Line is Product 2 (create manually as helper uses product1)
    # customer = master_data["customer"]
    delivery_place = master_data["delivery_place"]

    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
    )
    db.add(order)
    db.flush()

    line = OrderLine(
        order_id=order.id,
        product_id=product2.id,  # Different product
        order_quantity=10,
        delivery_date=date.today() + timedelta(days=7),
        delivery_place_id=delivery_place.id,
        unit="KG",
    )
    db.add(line)
    db.commit()
    db.refresh(line)

    response = client.post(
        "/api/allocations/drag-assign",
        json={"order_line_id": line.id, "lot_id": lot.id, "allocated_quantity": 10},
    )

    # Current implementation returns 404 when lot doesn't match order line product
    assert response.status_code == 404
    assert "product" in response.text.lower()
