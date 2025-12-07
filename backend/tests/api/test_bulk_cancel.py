from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import Allocation, Lot, Order, OrderLine, Product


def test_cancel_by_order_line(client, db: Session, normal_user_token_headers):
    # Setup Data
    product = Product(maker_part_code="P-CANCEL", product_name="Cancel Test", base_unit="EA")
    db.add(product)
    db.commit()

    lot = Lot(
        lot_number="LOT-CANCEL",
        product_id=product.id,
        current_quantity=Decimal("100"),
        allocated_quantity=Decimal("0"),
        status="active",
        received_date=date.today(),
        expiry_date=date.today(),
    )
    db.add(lot)
    db.commit()

    order = Order(order_number="ORD-CANCEL", customer_id=1, status="open")
    db.add(order)
    db.commit()

    line = OrderLine(
        order_id=order.id, product_id=product.id, order_quantity=Decimal("50"), status="pending"
    )
    db.add(line)
    db.commit()

    # Create Allocations
    alloc1 = Allocation(
        order_line_id=line.id, lot_id=lot.id, allocated_quantity=Decimal("10"), status="allocated"
    )
    alloc2 = Allocation(
        order_line_id=line.id, lot_id=lot.id, allocated_quantity=Decimal("20"), status="allocated"
    )
    # Different line allocation (should not be cancelled)
    line2 = OrderLine(
        order_id=order.id, product_id=product.id, order_quantity=Decimal("10"), status="pending"
    )
    db.add(line2)
    db.commit()

    alloc3 = Allocation(
        order_line_id=line2.id, lot_id=lot.id, allocated_quantity=Decimal("5"), status="allocated"
    )

    db.add(alloc1)
    db.add(alloc2)
    db.add(alloc3)

    # Update lot allocated quantity
    lot.allocated_quantity = Decimal("35")
    db.commit()

    # Call API
    response = client.post(
        "/api/allocations/cancel-by-order-line",
        json={"order_line_id": line.id},
        headers=normal_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["cancelled_ids"]) == 2
    assert alloc1.id in data["cancelled_ids"]
    assert alloc2.id in data["cancelled_ids"]
    assert alloc3.id not in data["cancelled_ids"]

    # Verify DB
    db.expire_all()
    assert db.get(Allocation, alloc1.id) is None
    assert db.get(Allocation, alloc2.id) is None
    assert db.get(Allocation, alloc3.id) is not None

    updated_lot = db.get(Lot, lot.id)
    # 35 - 10 - 20 = 5
    assert updated_lot.allocated_quantity == Decimal("5")
