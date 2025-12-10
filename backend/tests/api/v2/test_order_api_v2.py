from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    Order,
    OrderLine,
    Product,
)


@pytest.fixture
def setup_order_data(db_session):
    # Master Data
    product = Product(
        maker_part_code="PRD-ORD-001",
        product_name="Test Product Order",
        base_unit="EA",
    )
    db_session.add(product)

    customer = Customer(
        customer_code="CUST-ORD",
        customer_name="Test Customer Order",
    )
    db_session.add(customer)
    db_session.flush()

    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-ORD",
        delivery_place_name="Test DP Order",
        jiku_code="JK-001",
    )
    db_session.add(delivery_place)
    db_session.commit()

    # Existing Order
    order = Order(
        customer_id=customer.id,
        order_date=date.today(),
        status="open",
    )
    db_session.add(order)
    db_session.flush()

    order_line = OrderLine(
        order_id=order.id,
        product_id=product.id,
        delivery_place_id=delivery_place.id,
        delivery_date=date.today() + timedelta(days=5),
        order_quantity=Decimal("50.0"),
        unit="EA",
        customer_order_no="PO-001",
    )
    db_session.add(order_line)
    db_session.commit()

    db_session.refresh(product)
    db_session.refresh(customer)
    db_session.refresh(delivery_place)
    db_session.refresh(order)

    return {
        "product": product,
        "customer": customer,
        "delivery_place": delivery_place,
        "order": order,
        "order_line": order_line,
    }


def test_list_orders(client, setup_order_data):
    """Test GET /api/v2/order/"""
    response = client.get("/api/v2/order/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Check if created order is in the list
    target = next((item for item in data if item["id"] == setup_order_data["order"].id), None)
    assert target is not None
    assert target["customer_id"] == setup_order_data["customer"].id


def test_get_order(client, setup_order_data):
    """Test GET /api/v2/order/{order_id}"""
    order = setup_order_data["order"]
    response = client.get(f"/api/v2/order/{order.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == order.id
    assert len(data.get("lines", [])) >= 1
    assert data["lines"][0]["product_code"] == "PRD-ORD-001"


def test_create_order(client, setup_order_data):
    """Test POST /api/v2/order/"""
    customer = setup_order_data["customer"]
    delivery_place = setup_order_data["delivery_place"]
    product = setup_order_data["product"]

    payload = {
        "customer_id": customer.id,
        "order_date": date.today().isoformat(),
        # delivery_place_id is not in OrderCreate schema (OrderBase), passing it here is ignored or causes error if Strict
        # But setup_order_data used it for Model. Let's stick to Schema.
        "lines": [
            {
                "product_id": product.id,
                "order_quantity": 20.0,
                "unit": "EA",
                "delivery_date": (date.today() + timedelta(days=10)).isoformat(),
                "customer_order_no": "PO-NEW",  # Shortened just in case
                "delivery_place_id": delivery_place.id,  # Required in OrderLineBase
            }
        ],
    }

    response = client.post("/api/v2/order/", json=payload)
    if response.status_code != 201:
        print(response.json())

    assert response.status_code == 201
    data = response.json()
    assert data["customer_id"] == customer.id
    assert len(data["lines"]) == 1
    assert float(data["lines"][0]["order_quantity"]) == 20.0


def test_import_orders(client, setup_order_data):
    """Test POST /api/v2/order/import"""
    customer = setup_order_data["customer"]
    delivery_place = setup_order_data["delivery_place"]
    product = setup_order_data["product"]
    order = setup_order_data["order"]  # Import usually adds lines to existing or new order groups?
    # API def says import_orders takes order_id, so it adds/imports lines to a context?

    # Check router.py: import_order_lines(..., order_id=payload.order_id, ...)

    payload = {
        "customer_code": customer.customer_code,
        "product_code": product.maker_part_code,
        "order_date": date.today().isoformat(),
        "order_id": order.id,
        "delivery_place_id": delivery_place.id,
        "source_file_name": "test_import.csv",
        "lines": [
            {
                "customer_order_no": "IMP001",  # Max 6 chars
                "quantity": 30.0,
                "unit": "EA",
                "delivery_date": (date.today() + timedelta(days=15)).isoformat(),
                "customer_order_line_no": "1",
            }
        ],
    }

    response = client.post("/api/v2/order/import", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert len(data["created_line_ids"]) == 1
    assert data["errors"] == []
