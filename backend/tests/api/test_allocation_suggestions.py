# backend/tests/api/test_allocation_suggestions.py
"""Comprehensive tests for allocation suggestions API endpoints.

Tests cover:
- POST /allocation-suggestions/preview - Preview allocation suggestions (order mode only)
- GET /allocation-suggestions - List allocation suggestions with filters
- Error scenarios (validation, missing parameters)
"""

import os
from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import get_db
from app.infrastructure.persistence.models import (
    AllocationSuggestion,
    Customer,
    DeliveryPlace,
    Lot,
    Order,
    OrderLine,
    Product,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.main import application


# ---- Test DB session using conftest.py fixtures
def _truncate_all(db: Session):
    """Clean up test data in dependency order."""
    for table in [
        AllocationSuggestion,
        OrderLine,
        Order,
        Lot,
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
    """Provide clean database session for each test with COMMIT behavior."""
    # Create engine for this test module
    TEST_DATABASE_URL = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+psycopg2://testuser:testpass@localhost:5433/lot_management_test",
    )
    engine = create_engine(TEST_DATABASE_URL)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Clean before test
    _truncate_all(session)

    from app.application.services.auth.auth_service import AuthService
    from app.core import database as core_database
    from app.infrastructure.persistence.models import User

    # Override FastAPI dependency
    def override_get_db():
        yield session

    def override_get_current_user():
        return User(id=1, username="test_user", is_active=True)

    application.dependency_overrides[get_db] = override_get_db
    application.dependency_overrides[core_database.get_db] = override_get_db
    application.dependency_overrides[AuthService.get_current_user] = override_get_current_user

    yield session
    session.rollback()

    # Clean after test
    _truncate_all(session)
    session.close()

    # Remove override
    application.dependency_overrides.clear()


@pytest.fixture
def master_data(test_db: Session):
    """Create master data for allocation suggestions testing."""
    # Warehouse (explicitly set ID for SQLite compatibility)
    warehouse = Warehouse(
        warehouse_code="WH-001",
        warehouse_name="Main Warehouse",
        warehouse_type="internal",
    )
    test_db.add(warehouse)
    test_db.commit()
    test_db.refresh(warehouse)

    # Customer (explicitly set ID)
    customer = Customer(
        customer_code="CUST-001",
        customer_name="Test Customer",
    )
    test_db.add(customer)
    test_db.commit()
    test_db.refresh(customer)

    # Product (explicitly set ID)
    product = Product(
        maker_part_code="PROD-001",
        product_name="Test Product",
        base_unit="EA",
    )
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)

    # Delivery Place
    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DEL-001",
        delivery_place_name="Test Delivery Place",
    )
    test_db.add(delivery_place)
    test_db.commit()
    test_db.refresh(delivery_place)

    test_db.refresh(delivery_place)

    # Create LotMaster
    lot_master = LotMaster(
        product_id=product.id,
        lot_number="LOT-001",
    )
    test_db.add(lot_master)
    test_db.commit()

    # Create lot with stock
    lot = Lot(
        lot_master_id=lot_master.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        lot_number="LOT-001",
        current_quantity=Decimal("100.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
    )
    test_db.add(lot)
    test_db.commit()
    test_db.refresh(lot)

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


def test_preview_allocation_suggestions_order_mode_success(test_db: Session, master_data: dict):
    """Test preview allocation suggestions in order mode."""
    client = TestClient(application)

    # Create order explicitly for this test
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
    )
    test_db.add(order)
    test_db.commit()

    order_line = OrderLine(
        order_id=order.id,
        product_id=master_data["product"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=Decimal("10.000"),
        unit="EA",
        delivery_place_id=master_data["delivery_place"].id,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()

    # Test: Preview in order mode
    payload = {"mode": "order", "order_scope": {"order_line_id": order_line.id}}

    response = client.post("/api/v2/forecast/suggestions/preview", json=payload)
    assert response.status_code == 200

    # ...

    response = client.post("/api/v2/forecast/suggestions/preview", json=payload)
    assert response.status_code == 200

    # ...
