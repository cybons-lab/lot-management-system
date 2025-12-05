from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.models import Customer, DeliveryPlace, Order, OrderLine, Product
from app.services.orders.order_service import OrderService


@pytest.fixture
def order_filtering_data(db: Session):
    # Create master data
    customer = Customer(customer_code="CUST-FILTER", customer_name="Filter Customer")
    db.add(customer)

    product = Product(
        maker_part_code="PROD-FILTER",
        product_name="Filter Product",
        internal_unit="EA",
        base_unit="EA",
    )
    db.add(product)

    delivery_place = DeliveryPlace(
        delivery_place_code="DP-FILTER", delivery_place_name="Filter Place", customer_id=1
    )  # dummy fk
    db.add(delivery_place)

    db.flush()

    # Create orders with different types
    # Order 1: Spot
    order1 = Order(
        order_number="ORD-SPOT",
        customer_id=customer.id,
        order_date=date(2025, 1, 1),
        status="pending",
    )
    db.add(order1)
    db.flush()
    db.add(
        OrderLine(
            order_id=order1.id,
            product_id=product.id,
            delivery_place_id=delivery_place.id,
            order_quantity=Decimal("10"),
            unit="EA",
            delivery_date=date(2025, 1, 10),
            order_type="SPOT",
            status="pending",
        )
    )

    # Order 2: Forecast Linked
    order2 = Order(
        order_number="ORD-FC",
        customer_id=customer.id,
        order_date=date(2025, 1, 2),
        status="pending",
    )
    db.add(order2)
    db.flush()
    db.add(
        OrderLine(
            order_id=order2.id,
            product_id=product.id,
            delivery_place_id=delivery_place.id,
            order_quantity=Decimal("20"),
            unit="EA",
            delivery_date=date(2025, 1, 11),
            order_type="FORECAST_LINKED",
            status="pending",
        )
    )

    # Order 3: Mixed (if possible, but usually order lines have same type? Assuming mixed is possible or tested line by line)
    # Let's stick to 1 type per order for list filtering verification

    db.commit()
    return {"customer": customer}


def test_filter_orders_by_type(db: Session, order_filtering_data):
    service = OrderService(db)

    # Test SPOT
    spot_orders = service.get_orders(order_type="SPOT")
    assert len(spot_orders) >= 1
    assert any(o.order_number == "ORD-SPOT" for o in spot_orders)
    assert not any(o.order_number == "ORD-FC" for o in spot_orders)

    # Test FORECAST_LINKED
    fc_orders = service.get_orders(order_type="FORECAST_LINKED")
    assert len(fc_orders) >= 1
    assert any(o.order_number == "ORD-FC" for o in fc_orders)
    assert not any(o.order_number == "ORD-SPOT" for o in fc_orders)

    # Test None (ALL)
    # May return other existing orders too, but should contain both
    all_orders = service.get_orders(order_type=None, limit=1000)
    order_nums = [o.order_number for o in all_orders]
    assert "ORD-SPOT" in order_nums
    assert "ORD-FC" in order_nums
