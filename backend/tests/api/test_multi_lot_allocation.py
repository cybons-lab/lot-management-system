# backend/tests/api/test_multi_lot_allocation.py

from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.services.allocations.suggestion import AllocationSuggestionService
from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    ForecastCurrent,
    LotReceipt,
    SupplierItem,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster


# Setup DB fixture similar to other tests


@pytest.fixture
def master_data(db: Session, supplier):
    # Setup Master Data
    warehouse = Warehouse(
        warehouse_code="WH-MULTI", warehouse_name="Multi Hub", warehouse_type="internal"
    )
    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PROD-MULTI",
        display_name="Multi Product",
        base_unit="EA",
    )
    customer = Customer(customer_code="CUST-MULTI", customer_name="Global Cust")
    db.add_all([warehouse, product, customer])
    db.commit()
    db.refresh(warehouse)
    db.refresh(product)
    db.refresh(customer)

    delivery_place = DeliveryPlace(
        customer_id=customer.id, delivery_place_code="DP-MULTI", delivery_place_name="DP Name"
    )
    db.add(delivery_place)
    db.commit()
    db.refresh(delivery_place)

    return {
        "warehouse": warehouse,
        "product": product,
        "customer": customer,
        "delivery_place": delivery_place,
    }


def test_multi_lot_soft_allocation(db: Session, master_data):
    """
    Test that a single forecast line is split across multiple lots
    with correct priority and forecast_id linkage.
    """
    product = master_data["product"]
    warehouse = master_data["warehouse"]

    # 1. Setup 2 Lots
    # Lot A: Expires earlier (should be picked first), Qty 60
    lm_a = LotMaster(supplier_item_id=product.id, lot_number="LOT-A")
    db.add(lm_a)
    db.flush()

    lot_a = LotReceipt(
        lot_master_id=lm_a.id,
        supplier_item_id=product.id,
        warehouse_id=warehouse.id,
        received_quantity=Decimal("60.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=30),
        origin_type="order",
    )
    # Lot B: Expires later, Qty 60
    lm_b = LotMaster(supplier_item_id=product.id, lot_number="LOT-B")
    db.add(lm_b)
    db.flush()

    lot_b = LotReceipt(
        lot_master_id=lm_b.id,
        supplier_item_id=product.id,
        warehouse_id=warehouse.id,
        received_quantity=Decimal("60.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=60),
        origin_type="order",
    )
    db.add_all([lot_a, lot_b])
    db.commit()

    # 2. Setup 1 Forecast Line demanding 100
    forecast = ForecastCurrent(
        customer_id=master_data["customer"].id,
        delivery_place_id=master_data["delivery_place"].id,
        supplier_item_id=product.id,
        forecast_date=date.today() + timedelta(days=10),
        forecast_quantity=Decimal("100.000"),
        forecast_period="2025-12",
        unit="EA",
    )
    db.add(forecast)
    db.commit()
    db.refresh(forecast)

    # 3. Allocating using Service
    service = AllocationSuggestionService(db)
    response = service.regenerate_for_periods(["2025-12"])

    # 4. Assertions
    # We expect 2 suggestions (splits)
    assert len(response.suggestions) == 2

    # Sort by priority
    suggestions = sorted(response.suggestions, key=lambda x: x.priority)

    s1 = suggestions[0]  # Priority 1
    s2 = suggestions[1]  # Priority 2

    # Check S1 (Should be Lot A, 60.0)
    assert s1.priority == 1
    assert s1.lot_id == lot_a.id
    assert s1.quantity == Decimal("60.000")
    assert s1.forecast_id == forecast.id

    # Check S2 (Should be Lot B, 40.0)
    assert s2.priority == 2
    assert s2.lot_id == lot_b.id
    assert s2.quantity == Decimal("40.000")
    assert s2.forecast_id == forecast.id

    # Check total stats
    assert response.stats.total_allocated_quantity == Decimal("100.000")
    assert response.stats.total_shortage_quantity == Decimal("0.000")
