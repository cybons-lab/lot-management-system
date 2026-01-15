# backend/tests/api/test_lots.py
"""Comprehensive tests for lots API endpoints."""

import os
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import get_db
from app.infrastructure.persistence.models import Lot, Product, Supplier, Warehouse
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.main import app


def _truncate_all(db: Session):
    """Clean up test data."""
    # Aggressive cleanup to avoid contamination
    from app.infrastructure.persistence.models import LotReservation, StockHistory

    try:
        db.query(LotReservation).delete()
        db.query(StockHistory).delete()
        db.query(Lot).delete()
        db.query(LotMaster).delete()
        db.query(Product).delete()
        db.query(Supplier).delete()
        db.query(Warehouse).delete()
        db.commit()
    except Exception:
        db.rollback()


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

    _truncate_all(session)

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    yield session

    _truncate_all(session)
    session.close()
    app.dependency_overrides.clear()


# ===== GET tests with basic lot data =====


def test_list_lots_filters_by_warehouse_code(test_db: Session):
    """Test listing lots filtered by warehouse code."""
    client = TestClient(app)

    wh1 = Warehouse(warehouse_code="W1", warehouse_name="Main", warehouse_type="internal")
    wh2 = Warehouse(warehouse_code="W2", warehouse_name="Sub", warehouse_type="internal")
    sup = Supplier(supplier_code="S1", supplier_name="Supplier")
    prod = Product(maker_part_code="P1", product_name="Product 1", base_unit="EA")
    test_db.add_all([wh1, wh2, sup, prod])
    test_db.flush()

    test_db.flush()

    # Create LotMasters
    lm1 = LotMaster(product_id=prod.id, supplier_id=sup.id, lot_number="L-001")
    lm2 = LotMaster(product_id=prod.id, supplier_id=sup.id, lot_number="L-002")
    test_db.add_all([lm1, lm2])
    test_db.flush()

    # Create lots
    lot1 = Lot(
        supplier_id=sup.id,
        product_id=prod.id,
        lot_master_id=lm1.id,
        lot_number="L-001",
        warehouse_id=wh1.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=30),
        unit="EA",
    )
    lot2 = Lot(
        supplier_id=sup.id,
        product_id=prod.id,
        lot_master_id=lm2.id,
        lot_number="L-002",
        warehouse_id=wh2.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=40),
        unit="EA",
    )
    test_db.add_all([lot1, lot2])
    test_db.commit()

    # Test warehouse filter
    r = client.get("/api/lots", params={"warehouse_code": "W1", "with_stock": False})
    assert r.status_code == 200


def test_list_lots_filters_by_product_id(test_db: Session):
    """Test listing lots filtered by product ID."""
    client = TestClient(app)

    wh = Warehouse(warehouse_code="W1", warehouse_name="Main", warehouse_type="internal")
    sup = Supplier(supplier_code="S1", supplier_name="Supplier")
    product_a = Product(maker_part_code="PA", product_name="Product A", base_unit="EA")
    product_b = Product(maker_part_code="PB", product_name="Product B", base_unit="EA")
    test_db.add_all([wh, sup, product_a, product_b])
    test_db.flush()

    # Create LotMasters
    lm_a = LotMaster(product_id=product_a.id, supplier_id=sup.id, lot_number="L-A")
    lm_b = LotMaster(product_id=product_b.id, supplier_id=sup.id, lot_number="L-B")
    test_db.add_all([lm_a, lm_b])
    test_db.flush()

    lot_a = Lot(
        supplier_id=sup.id,
        lot_master_id=lm_a.id,
        lot_number="L-A",
        warehouse_id=wh.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=15),
        product_id=product_a.id,
        unit="EA",
    )
    lot_b = Lot(
        supplier_id=sup.id,
        lot_master_id=lm_b.id,
        lot_number="L-B",
        warehouse_id=wh.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=25),
        product_id=product_b.id,
        unit="EA",
    )
    test_db.add_all([lot_a, lot_b])
    test_db.commit()

    # Test product filter
    r = client.get("/api/lots", params={"product_id": product_a.id, "with_stock": False})
    assert r.status_code == 200
    body = r.json()
    assert len(body) >= 1


def test_list_lots_filters_by_expiry_date(test_db: Session):
    """Test listing lots filtered by expiry date range."""
    client = TestClient(app)

    wh = Warehouse(
        warehouse_code="WH-EXP", warehouse_name="Expiry Warehouse", warehouse_type="internal"
    )
    sup = Supplier(supplier_code="SUP-EXP", supplier_name="Expiry Supplier")
    prod = Product(maker_part_code="PROD-EXP", product_name="Expiry Product", base_unit="EA")
    test_db.add_all([wh, sup, prod])
    test_db.flush()

    # Create LotMasters
    lm1 = LotMaster(product_id=prod.id, supplier_id=sup.id, lot_number="LOT-EXP-1")
    lm2 = LotMaster(product_id=prod.id, supplier_id=sup.id, lot_number="LOT-EXP-2")
    lm3 = LotMaster(product_id=prod.id, supplier_id=sup.id, lot_number="LOT-EXP-3")
    test_db.add_all([lm1, lm2, lm3])
    test_db.flush()

    today = date.today()
    lot1 = Lot(
        supplier_id=sup.id,
        product_id=prod.id,
        lot_master_id=lm1.id,
        lot_number="LOT-EXP-1",
        warehouse_id=wh.id,
        received_date=today,
        expiry_date=today + timedelta(days=10),
        unit="EA",
    )
    lot2 = Lot(
        supplier_id=sup.id,
        product_id=prod.id,
        lot_master_id=lm2.id,
        lot_number="LOT-EXP-2",
        warehouse_id=wh.id,
        received_date=today,
        expiry_date=today + timedelta(days=30),
        unit="EA",
    )
    lot3 = Lot(
        supplier_id=sup.id,
        product_id=prod.id,
        lot_master_id=lm3.id,
        lot_number="LOT-EXP-3",
        warehouse_id=wh.id,
        received_date=today,
        expiry_date=today + timedelta(days=60),
        unit="EA",
    )
    test_db.add_all([lot1, lot2, lot3])
    test_db.commit()

    # Test expiry date filter
    expiry_from = today + timedelta(days=20)
    expiry_to = today + timedelta(days=50)
    r = client.get(
        "/api/lots",
        params={"expiry_from": str(expiry_from), "expiry_to": str(expiry_to), "with_stock": False},
    )
    assert r.status_code == 200
    body = r.json()
    # Verify filter works
    for lot in body:
        if lot.get("expiry_date"):
            expiry = date.fromisoformat(lot["expiry_date"])
            assert expiry >= expiry_from and expiry <= expiry_to


def test_get_lot_not_found(test_db: Session):
    """Test getting non-existent lot returns 404."""
    client = TestClient(app)
    r = client.get("/api/lots/99999")
    assert r.status_code == 404


def test_update_lot_not_found(test_db: Session):
    """Test updating non-existent lot returns 404."""
    client = TestClient(app)
    update_payload = {"lot_number": "NEW-NUMBER"}
    r = client.put("/api/lots/99999", json=update_payload)
    assert r.status_code == 404
