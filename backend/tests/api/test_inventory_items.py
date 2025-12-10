# backend/tests/api/test_inventory_items.py
"""Comprehensive tests for inventory items API endpoints."""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Lot, Product, Supplier, Warehouse
from app.main import app
from app.presentation.api.deps import get_db


def _truncate_all(db: Session):
    for table in [Lot, Product, Supplier, Warehouse]:
        try:
            db.query(table).delete()
        except Exception:
            pass
    db.commit()


@pytest.fixture
def test_db(db: Session):
    _truncate_all(db)

    # Ensure view exists (since Base.metadata.create_all doesn't create views)
    # Also drop table if it was created by create_all (because it's defined as a model)
    from sqlalchemy import text
    from sqlalchemy.exc import ProgrammingError

    try:
        db.execute(text("DROP TABLE IF EXISTS v_inventory_summary CASCADE"))
    except ProgrammingError:
        db.rollback()

    try:
        db.execute(text("DROP VIEW IF EXISTS v_inventory_summary CASCADE"))
    except ProgrammingError:
        db.rollback()

    db.execute(
        text("""
        CREATE OR REPLACE VIEW v_inventory_summary AS
        SELECT
            l.product_id,
            l.warehouse_id,
            SUM(l.current_quantity) AS total_quantity,
            COALESCE(SUM(r.reserved_qty), 0) AS allocated_quantity,
            (SUM(l.current_quantity) - COALESCE(SUM(r.reserved_qty), 0)) AS available_quantity,
            COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
            (SUM(l.current_quantity) - COALESCE(SUM(r.reserved_qty), 0) + COALESCE(SUM(ipl.planned_quantity), 0)) AS available_with_provisional,
            MAX(l.updated_at) AS last_updated
        FROM lots l
        LEFT JOIN lot_reservations r ON l.id = r.lot_id AND r.status IN ('active', 'confirmed')
        LEFT JOIN inbound_plan_lines ipl ON l.product_id = ipl.product_id
        LEFT JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
        WHERE l.status = 'active'
        GROUP BY l.product_id, l.warehouse_id
    """)
    )
    db.commit()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield db
    _truncate_all(db)
    app.dependency_overrides.clear()


@pytest.fixture
def sample_data(test_db: Session):
    """Create sample data for inventory testing."""
    warehouse = Warehouse(
        warehouse_code="WH-001",
        warehouse_name="Main Warehouse",
        warehouse_type="internal",
    )
    test_db.add(warehouse)
    test_db.commit()
    test_db.refresh(warehouse)

    product = Product(
        maker_part_code="PROD-001",
        product_name="Test Product",
        base_unit="EA",
    )
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)

    supplier = Supplier(
        supplier_code="SUP-001",
        supplier_name="Test Supplier",
    )
    test_db.add(supplier)
    test_db.commit()
    test_db.refresh(supplier)

    # Create lot with stock
    lot = Lot(
        lot_number="LOT-001",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=Decimal("100.000"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
        status="active",
    )
    test_db.add(lot)
    test_db.commit()

    return {
        "warehouse": warehouse,
        "product": product,
        "supplier": supplier,
        "lot": lot,
    }


def test_list_inventory_items_empty(test_db: Session):
    """Test listing inventory items when none exist."""
    client = TestClient(app)
    response = client.get("/api/inventory-items")
    assert response.status_code == 200
    assert response.json() == []


def test_list_inventory_items_with_filters(test_db: Session, sample_data):
    """Test listing inventory items with filters."""
    client = TestClient(app)

    # Filter by product_id
    response = client.get("/api/inventory-items", params={"product_id": sample_data["product"].id})
    assert response.status_code == 200

    # Filter by warehouse_id
    response = client.get(
        "/api/inventory-items", params={"warehouse_id": sample_data["warehouse"].id}
    )
    assert response.status_code == 200


def test_get_inventory_item_success(test_db: Session, sample_data):
    """Test getting inventory item by product and warehouse."""
    client = TestClient(app)

    product_id = sample_data["product"].id
    warehouse_id = sample_data["warehouse"].id

    response = client.get(f"/api/inventory-items/{product_id}/{warehouse_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["product_id"] == product_id
    assert data["warehouse_id"] == warehouse_id


def test_get_inventory_item_not_found(test_db: Session):
    """Test getting non-existent inventory item returns 404."""
    client = TestClient(app)
    response = client.get("/api/inventory-items/99999/99999")
    assert response.status_code == 404


def test_list_inventory_by_supplier(test_db: Session, sample_data):
    """Test listing inventory grouped by supplier."""
    client = TestClient(app)

    response = client.get("/api/inventory-items/by-supplier")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_list_inventory_by_warehouse(test_db: Session, sample_data):
    """Test listing inventory grouped by warehouse."""
    client = TestClient(app)

    response = client.get("/api/inventory-items/by-warehouse")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_list_inventory_by_product(test_db: Session, sample_data):
    """Test listing inventory grouped by product."""
    client = TestClient(app)

    response = client.get("/api/inventory-items/by-product")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_inventory_item_reflects_lot_quantities(test_db: Session, sample_data):
    """Test that inventory item aggregates lot quantities correctly."""
    client = TestClient(app)

    product_id = sample_data["product"].id
    warehouse_id = sample_data["warehouse"].id

    response = client.get(f"/api/inventory-items/{product_id}/{warehouse_id}")
    assert response.status_code == 200
    data = response.json()

    # Should match the lot quantities - using lot_reservations for allocated
    # Since no reservations are created, allocated_quantity is 0
    assert float(data["total_quantity"]) == 100.0
    assert float(data["allocated_quantity"]) == 0.0
