# backend/tests/api/test_multi_lot_allocation.py

import os
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.application.services.allocations.suggestion import AllocationSuggestionService
from app.core.database import get_db
from app.infrastructure.persistence.models import (
    AllocationSuggestion,
    Customer,
    DeliveryPlace,
    ForecastCurrent,
    LotReceipt,
    Product,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.main import app


# Setup DB fixture similar to other tests
def _truncate_all(db: Session):
    for table in [
        AllocationSuggestion,
        ForecastCurrent,
        LotReceipt,
        LotMaster,
        DeliveryPlace,
        Product,
        Customer,
        Warehouse,
    ]:
        try:
            db.query(table).delete()
        except Exception:
            db.rollback()
    db.commit()


@pytest.fixture
def test_db(db_engine):
    TEST_DATABASE_URL = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+psycopg2://testuser:testpass@localhost:5433/lot_management_test",
    )
    engine = create_engine(TEST_DATABASE_URL)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    _truncate_all(session)

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    yield session

    _truncate_all(session)
    session.close()
    app.dependency_overrides.clear()


@pytest.fixture
def master_data(test_db: Session):
    # Setup Master Data
    warehouse = Warehouse(
        warehouse_code="WH-MULTI", warehouse_name="Multi Hub", warehouse_type="internal"
    )
    product = Product(maker_part_code="PROD-MULTI", product_name="Multi Product", base_unit="EA")
    customer = Customer(customer_code="CUST-MULTI", customer_name="Global Cust")
    test_db.add_all([warehouse, product, customer])
    test_db.commit()
    test_db.refresh(warehouse)
    test_db.refresh(product)
    test_db.refresh(customer)

    delivery_place = DeliveryPlace(
        customer_id=customer.id, delivery_place_code="DP-MULTI", delivery_place_name="DP Name"
    )
    test_db.add(delivery_place)
    test_db.commit()
    test_db.refresh(delivery_place)

    return {
        "warehouse": warehouse,
        "product": product,
        "customer": customer,
        "delivery_place": delivery_place,
    }


def test_multi_lot_soft_allocation(test_db: Session, master_data):
    """
    Test that a single forecast line is split across multiple lots
    with correct priority and forecast_id linkage.
    """
    product = master_data["product"]
    warehouse = master_data["warehouse"]

    # 1. Setup 2 Lots
    # Lot A: Expires earlier (should be picked first), Qty 60
    lm_a = LotMaster(product_id=product.id, lot_number="LOT-A")
    test_db.add(lm_a)
    test_db.flush()

    lot_a = LotReceipt(
        lot_master_id=lm_a.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_quantity=Decimal("60.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=30),
        origin_type="order",
    )
    # Lot B: Expires later, Qty 60
    lm_b = LotMaster(product_id=product.id, lot_number="LOT-B")
    test_db.add(lm_b)
    test_db.flush()

    lot_b = LotReceipt(
        lot_master_id=lm_b.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_quantity=Decimal("60.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=60),
        origin_type="order",
    )
    test_db.add_all([lot_a, lot_b])
    test_db.commit()

    # 2. Setup 1 Forecast Line demanding 100
    forecast = ForecastCurrent(
        customer_id=master_data["customer"].id,
        delivery_place_id=master_data["delivery_place"].id,
        product_id=product.id,
        forecast_date=date.today() + timedelta(days=10),
        forecast_quantity=Decimal("100.000"),
        forecast_period="2025-12",
        unit="EA",
    )
    test_db.add(forecast)
    test_db.commit()
    test_db.refresh(forecast)

    # 3. Allocating using Service
    service = AllocationSuggestionService(test_db)
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
