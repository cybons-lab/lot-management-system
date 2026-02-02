# backend/tests/api/test_lots.py
"""Comprehensive tests for lots API endpoints."""

from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import LotReceipt, Supplier, SupplierItem, Warehouse
from app.infrastructure.persistence.models.lot_master_model import LotMaster


def test_list_lots_filters_by_warehouse_code(db: Session, client: TestClient):
    """Test listing lots filtered by warehouse code."""

    wh1 = Warehouse(warehouse_code="W1", warehouse_name="Main", warehouse_type="internal")
    wh2 = Warehouse(warehouse_code="W2", warehouse_name="Sub", warehouse_type="internal")
    sup = Supplier(supplier_code="S1", supplier_name="Supplier")
    db.add_all([wh1, wh2, sup])
    db.flush()

    prod = SupplierItem(
        supplier_id=sup.id, maker_part_no="P1", display_name="Product 1", base_unit="EA"
    )
    db.add(prod)
    db.flush()

    db.flush()

    # Create LotMasters
    lm1 = LotMaster(supplier_item_id=prod.id, supplier_id=sup.id, lot_number="L-001")
    lm2 = LotMaster(supplier_item_id=prod.id, supplier_id=sup.id, lot_number="L-002")
    db.add_all([lm1, lm2])
    db.flush()

    # Create lots
    lot1 = LotReceipt(
        supplier_id=sup.id,
        supplier_item_id=prod.id,
        lot_master_id=lm1.id,
        warehouse_id=wh1.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=30),
        unit="EA",
    )
    lot2 = LotReceipt(
        supplier_id=sup.id,
        supplier_item_id=prod.id,
        lot_master_id=lm2.id,
        warehouse_id=wh2.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=40),
        unit="EA",
    )
    db.add_all([lot1, lot2])
    db.commit()

    # Test warehouse filter
    r = client.get("/api/lots", params={"warehouse_code": "W1", "with_stock": False})
    assert r.status_code == 200


def test_list_lots_filters_by_supplier_item_id(db: Session, client: TestClient):
    """Test listing lots filtered by product ID."""

    wh = Warehouse(warehouse_code="W1", warehouse_name="Main", warehouse_type="internal")
    sup = Supplier(supplier_code="S1", supplier_name="Supplier")
    db.add_all([wh, sup])
    db.flush()

    product_a = SupplierItem(
        supplier_id=sup.id, maker_part_no="PA", display_name="Product A", base_unit="EA"
    )
    product_b = SupplierItem(
        supplier_id=sup.id, maker_part_no="PB", display_name="Product B", base_unit="EA"
    )
    db.add_all([product_a, product_b])
    db.flush()

    # Create LotMasters
    lm_a = LotMaster(supplier_item_id=product_a.id, supplier_id=sup.id, lot_number="L-A")
    lm_b = LotMaster(supplier_item_id=product_b.id, supplier_id=sup.id, lot_number="L-B")
    db.add_all([lm_a, lm_b])
    db.flush()

    lot_a = LotReceipt(
        supplier_id=sup.id,
        lot_master_id=lm_a.id,
        warehouse_id=wh.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=15),
        supplier_item_id=product_a.id,
        unit="EA",
    )
    lot_b = LotReceipt(
        supplier_id=sup.id,
        lot_master_id=lm_b.id,
        warehouse_id=wh.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=25),
        supplier_item_id=product_b.id,
        unit="EA",
    )
    db.add_all([lot_a, lot_b])
    db.commit()

    # Test product filter
    r = client.get("/api/lots", params={"supplier_item_id": product_a.id, "with_stock": False})
    assert r.status_code == 200
    body = r.json()
    assert len(body) >= 1


def test_list_lots_filters_by_expiry_date(db: Session, client: TestClient):
    """Test listing lots filtered by expiry date range."""

    wh = Warehouse(
        warehouse_code="WH-EXP", warehouse_name="Expiry Warehouse", warehouse_type="internal"
    )
    sup = Supplier(supplier_code="SUP-EXP", supplier_name="Expiry Supplier")
    db.add_all([wh, sup])
    db.flush()

    prod = SupplierItem(
        supplier_id=sup.id, maker_part_no="PROD-EXP", display_name="Expiry Product", base_unit="EA"
    )
    db.add(prod)
    db.flush()

    # Create LotMasters
    lm1 = LotMaster(supplier_item_id=prod.id, supplier_id=sup.id, lot_number="LOT-EXP-1")
    lm2 = LotMaster(supplier_item_id=prod.id, supplier_id=sup.id, lot_number="LOT-EXP-2")
    lm3 = LotMaster(supplier_item_id=prod.id, supplier_id=sup.id, lot_number="LOT-EXP-3")
    db.add_all([lm1, lm2, lm3])
    db.flush()

    today = date.today()
    lot1 = LotReceipt(
        supplier_id=sup.id,
        supplier_item_id=prod.id,
        lot_master_id=lm1.id,
        warehouse_id=wh.id,
        received_date=today,
        expiry_date=today + timedelta(days=10),
        unit="EA",
    )
    lot2 = LotReceipt(
        supplier_id=sup.id,
        supplier_item_id=prod.id,
        lot_master_id=lm2.id,
        warehouse_id=wh.id,
        received_date=today,
        expiry_date=today + timedelta(days=30),
        unit="EA",
    )
    lot3 = LotReceipt(
        supplier_id=sup.id,
        supplier_item_id=prod.id,
        lot_master_id=lm3.id,
        warehouse_id=wh.id,
        received_date=today,
        expiry_date=today + timedelta(days=60),
        unit="EA",
    )
    db.add_all([lot1, lot2, lot3])
    db.commit()

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


def test_get_lot_not_found(db: Session, client: TestClient):
    """Test getting non-existent lot returns 404."""
    r = client.get("/api/lots/99999")
    assert r.status_code == 404


def test_update_lot_not_found(db: Session, client: TestClient):
    """Test updating non-existent lot returns 404."""
    update_payload = {"lot_number": "NEW-NUMBER"}
    r = client.put("/api/lots/99999", json=update_payload)
    assert r.status_code == 404
