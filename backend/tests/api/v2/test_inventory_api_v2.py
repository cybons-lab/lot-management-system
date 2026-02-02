from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.infrastructure.persistence.models import LotReceipt, Supplier, SupplierItem, Warehouse
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.product_warehouse_model import ProductWarehouse


@pytest.fixture
def setup_inventory_data(db_session, supplier):
    """Set up test data for inventory tests."""
    # Create product
    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PRD-INV-001",
        display_name="Test Product Inventory",
        base_unit="EA",
    )
    db_session.add(product)

    # Create supplier
    supplier = Supplier(
        supplier_code="SUP-INV",
        supplier_name="Test Supplier Inventory",
    )
    db_session.add(supplier)

    # Create warehouse
    warehouse = Warehouse(
        warehouse_code="WH-INV",
        warehouse_name="Test Warehouse Inventory",
        warehouse_type="internal",
    )
    db_session.add(warehouse)
    db_session.flush()

    # Register product_warehouse (required for v_inventory_summary)
    pw = ProductWarehouse(supplier_item_id=product.id, warehouse_id=warehouse.id)
    db_session.add(pw)

    # Create LotMaster
    lot_master = LotMaster(
        supplier_item_id=product.id,
        supplier_id=supplier.id,
        lot_number="LOT-INV-001",
    )
    db_session.add(lot_master)
    db_session.commit()

    # Create lot with stock
    lot = LotReceipt(
        lot_master_id=lot_master.id,
        supplier_item_id=product.id,
        supplier_id=supplier.id,
        warehouse_id=warehouse.id,
        received_quantity=Decimal("100.0"),
        unit="EA",
        status="active",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=180),
    )
    db_session.add(lot)
    db_session.commit()

    db_session.refresh(product)
    db_session.refresh(supplier)
    db_session.refresh(warehouse)
    db_session.refresh(lot)

    return {
        "product": product,
        "supplier": supplier,
        "warehouse": warehouse,
        "lot": lot,
    }


def test_list_inventory(client, setup_inventory_data):
    """Test GET /api/v2/inventory/"""
    response = client.get("/api/v2/inventory/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


def test_get_inventory_item(client, setup_inventory_data):
    """Test GET /api/v2/inventory/{supplier_item_id}/{warehouse_id}"""
    product = setup_inventory_data["product"]
    warehouse = setup_inventory_data["warehouse"]

    response = client.get(f"/api/v2/inventory/{product.id}/{warehouse.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_item_id"] == product.id
    assert data["warehouse_id"] == warehouse.id


def test_get_inventory_stats(client, setup_inventory_data):
    """Test GET /api/v2/inventory/stats"""
    response = client.get("/api/v2/inventory/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_products" in data
    assert "total_warehouses" in data
    assert "total_quantity" in data


def test_list_inventory_by_warehouse(client, setup_inventory_data):
    """Test GET /api/v2/inventory/by-warehouse"""
    response = client.get("/api/v2/inventory/by-warehouse")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_list_inventory_by_product(client, setup_inventory_data):
    """Test GET /api/v2/inventory/by-product"""
    response = client.get("/api/v2/inventory/by-product")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_list_inventory_by_supplier(client, setup_inventory_data):
    """Test GET /api/v2/inventory/by-supplier"""
    response = client.get("/api/v2/inventory/by-supplier")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
