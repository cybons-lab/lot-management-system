from datetime import date

from sqlalchemy.orm import Session

from app.models.inventory_models import Lot
from app.services.inventory.inventory_service import InventoryService


def test_get_inventory_items(db: Session, service_master_data):
    """Test getting inventory items (summary)."""
    service = InventoryService(db)
    product1 = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]

    # Create lots
    lot1 = Lot(
        lot_number="LOT-INV-1",
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=100,
        allocated_quantity=10,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.flush()  # Flush to make it visible to view (in same transaction)

    # Note: v_inventory_summary view might not see uncommitted changes depending on isolation level
    # But in tests we usually run in transaction.
    # Let's see if flush is enough. If not, we might need to commit (but db fixture rolls back).
    # The view definition in conftest.py uses `FROM lots`, so it should see uncommitted changes in the same transaction.

    items = service.get_inventory_items()

    # Filter for our test data
    target_items = [
        i for i in items if i.product_id == product1.id and i.warehouse_id == warehouse.id
    ]

    assert len(target_items) == 1
    item = target_items[0]
    assert item.total_quantity == 100
    assert item.allocated_quantity == 10
    assert item.available_quantity == 90  # 100 - 10

    # Test filtering
    items_filtered = service.get_inventory_items(product_id=product1.id)
    assert len(items_filtered) >= 1
    assert items_filtered[0].product_id == product1.id


def test_get_inventory_item_by_product_warehouse(db: Session, service_master_data):
    """Test getting specific inventory item."""
    service = InventoryService(db)
    product1 = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]

    lot1 = Lot(
        lot_number="LOT-INV-2",
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=50,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.flush()

    item = service.get_inventory_item_by_product_warehouse(product1.id, warehouse.id)
    assert item is not None
    assert item.total_quantity == 50

    item_none = service.get_inventory_item_by_product_warehouse(99999, warehouse.id)
    assert item_none is None


def test_get_inventory_by_supplier(db: Session, service_master_data):
    """Test aggregation by supplier."""
    service = InventoryService(db)
    product1 = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]

    lot1 = Lot(
        lot_number="LOT-SUP-1",
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=30,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.flush()

    results = service.get_inventory_by_supplier()
    target = next((r for r in results if r["supplier_id"] == supplier.id), None)

    assert target is not None
    assert target["total_quantity"] >= 30
    assert target["lot_count"] >= 1


def test_get_inventory_by_warehouse(db: Session, service_master_data):
    """Test aggregation by warehouse."""
    service = InventoryService(db)
    product1 = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]

    lot1 = Lot(
        lot_number="LOT-WH-1",
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=40,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.flush()

    results = service.get_inventory_by_warehouse()
    target = next((r for r in results if r["warehouse_id"] == warehouse.id), None)

    assert target is not None
    assert target["total_quantity"] >= 40


def test_get_inventory_by_product(db: Session, service_master_data):
    """Test aggregation by product."""
    service = InventoryService(db)
    product1 = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]

    lot1 = Lot(
        lot_number="LOT-PRD-1",
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=60,
        allocated_quantity=5,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.flush()

    results = service.get_inventory_by_product()
    target = next((r for r in results if r["product_id"] == product1.id), None)

    assert target is not None
    assert target["total_quantity"] >= 60
    assert target["allocated_quantity"] >= 5
    assert target["available_quantity"] >= 55
