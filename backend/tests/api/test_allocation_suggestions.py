# backend/tests/api/test_allocation_suggestions.py
"""Comprehensive tests for allocation suggestions API endpoints.

Tests cover:
- POST /allocation-suggestions/preview - Preview allocation suggestions (order mode only)
- GET /allocation-suggestions - List allocation suggestions with filters
- Error scenarios (validation, missing parameters)
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
    Order,
    OrderLine,
    SupplierItem,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster


# ---- Test DB session using conftest.py fixtures


@pytest.fixture
def master_data(db: Session, supplier):
    """Create master data for allocation suggestions testing."""
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

    db.refresh(delivery_place)

    # Create LotMaster
    lot_master = LotMaster(
        product_group_id=product.id,
        lot_number="LOT-001",
    )
    db.add(lot_master)
    db.commit()

    # Create lot with stock
    lot = LotReceipt(
        lot_master_id=lot_master.id,
        product_group_id=product.id,
        warehouse_id=warehouse.id,
        received_quantity=Decimal("100.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
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
    }


# ============================================================
# POST /allocation-suggestions/preview - Preview suggestions
# ============================================================


def test_preview_allocation_suggestions_order_mode_success(
    db: Session, client: TestClient, master_data: dict
):
    """Test preview allocation suggestions in order mode."""

    # Create order explicitly for this test
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

    # Test: Preview in order mode
    payload = {"mode": "order", "order_scope": {"order_line_id": order_line.id}}

    response = client.post("/api/v2/forecast/suggestions/preview", json=payload)
    assert response.status_code == 200

    # ...

    response = client.post("/api/v2/forecast/suggestions/preview", json=payload)
    assert response.status_code == 200

    # ...
