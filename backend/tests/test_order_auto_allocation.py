from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Lot, Order, OrderLine, Product, Warehouse


def test_order_allocation_single_lot_fit(db: Session):
    """
    Test that Order Allocation prefers "Single Lot Fit" over strict FEFO splitting.
    """
    # 1. Setup Master Data
    product = Product(
        maker_part_code="TEST-AUTO-001",
        product_name="Test Auto Product",
        base_unit="pcs",
        internal_unit="pcs",
        external_unit="pcs",
        qty_per_internal_unit=Decimal("1.0"),
    )
    db.add(product)

    warehouse = Warehouse(
        warehouse_code="WH-AUTO", warehouse_name="Auto Warehouse", warehouse_type="internal"
    )
    db.add(warehouse)
    db.commit()

    today = date.today()

    # 2. Setup Lots
    # Lot A: Older (Expiry D+5), Small Qty (50)
    lot_a = Lot(
        product_id=product.id,
        warehouse_id=warehouse.id,
        lot_number="LOT-A-SMALL",
        current_quantity=Decimal("50"),
        allocated_quantity=Decimal("0"),
        expiry_date=today + timedelta(days=5),
        received_date=today,
        status="active",
        unit="pcs",
    )
    db.add(lot_a)

    # Lot B: Newer (Expiry D+10), Large Qty (100)
    lot_b = Lot(
        product_id=product.id,
        warehouse_id=warehouse.id,
        lot_number="LOT-B-LARGE",
        current_quantity=Decimal("100"),
        allocated_quantity=Decimal("0"),
        expiry_date=today + timedelta(days=10),
        received_date=today,
        status="active",
        unit="pcs",
    )
    db.add(lot_b)
    db.commit()

    # 3. Setup Order Context (Customer, DeliveryPlace)
    from app.infrastructure.persistence.models.masters_models import Customer, DeliveryPlace

    customer = Customer(customer_code="CUST-AUTO", customer_name="Auto Customer")
    db.add(customer)
    db.flush()

    delivery_place = DeliveryPlace(
        delivery_place_code="DP-AUTO",
        delivery_place_name="Auto Delivery Place",
        customer_id=customer.id,
    )
    db.add(delivery_place)
    db.commit()

    # 4. Setup Order
    order = Order(
        order_date=today, status="open", customer_id=customer.id, order_number="ORD-AUTO-001"
    )
    db.add(order)
    db.flush()

    order_line = OrderLine(
        order_id=order.id,
        product_id=product.id,
        delivery_place_id=delivery_place.id,
        delivery_date=today + timedelta(days=20),
        order_quantity=Decimal("80"),
        unit="pcs",
        status="pending",
        order_type="ORDER",
    )
    db.add(order_line)
    db.commit()

    # 5. Execute Preview (New Logic) [Renumbered]
    from app.application.services.allocations.fefo import preview_fefo_allocation

    result = preview_fefo_allocation(db, order.id)

    assert len(result.lines) == 1
    line_res = result.lines[0]

    # Verify allocations
    # Expectation: Single allocation from Lot B (100 qty lot), skipping Lot A (50 qty lot).
    assert len(line_res.allocations) == 1
    alloc = line_res.allocations[0]

    assert alloc.lot_id == lot_b.id, f"Should allocate from Lot B (Large), got {alloc.lot_number}"
    assert alloc.allocate_qty == 80.0
    assert alloc.lot_number == "LOT-B-LARGE"
