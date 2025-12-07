import concurrent.futures
import uuid
from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Lot, Order, OrderLine


def create_order_line_for_concurrency(db: Session, master_data, qty=10):
    """Helper to create an order line."""
    customer = master_data["customer"]
    delivery_place = master_data["delivery_place"]
    product = master_data["product1"]

    order = Order(
        order_number=f"ORD-CONC-{uuid.uuid4()}",
        customer_id=customer.id,
        order_date=date.today(),
        status="confirmed",
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


def test_concurrent_allocation(client: TestClient, db: Session, master_data):
    """Test concurrent allocation requests for the same lot."""
    product = master_data["product1"]
    warehouse = master_data["warehouse"]
    supplier = master_data["supplier"]

    # Create lot with limited quantity (10)
    lot = Lot(
        lot_number=f"LOT-CONC-{uuid.uuid4()}",
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

    # Create two order lines, each requiring 10
    line1 = create_order_line_for_concurrency(db, master_data, qty=10)
    line2 = create_order_line_for_concurrency(db, master_data, qty=10)

    def call_allocation_api(line_id):
        return client.post(
            "/api/allocations/drag-assign",
            json={"order_line_id": line_id, "lot_id": lot.id, "allocated_quantity": 10},
        )

    # Note: TestClient is not thread-safe in some contexts, and it shares the app state.
    # But let's try. If it fails to run concurrently, it will run sequentially.
    # If sequentially, first succeeds, second fails.
    # If concurrent and race condition exists, both might succeed (which is bad).

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future1 = executor.submit(call_allocation_api, line1.id)
        future2 = executor.submit(call_allocation_api, line2.id)

        response1 = future1.result()
        response2 = future2.result()

    # One should succeed (200), one should fail (400 or 409)
    status_codes = [response1.status_code, response2.status_code]
    assert 200 in status_codes
    # The failing request can be 400 (Bad Request) or 409 (Conflict)
    assert 400 in status_codes or 409 in status_codes

    # Verify final quantity
    db.refresh(lot)
    assert lot.allocated_quantity == 10  # Should be 10 (fully allocated)
    assert lot.current_quantity == 10  # Total quantity remains 10
