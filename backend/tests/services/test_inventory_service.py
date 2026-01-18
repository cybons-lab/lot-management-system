from datetime import date

from sqlalchemy.orm import Session

from app.application.services.inventory.inventory_service import InventoryService
from app.infrastructure.persistence.models import Supplier, Warehouse
from app.infrastructure.persistence.models.inventory_models import LotReceipt
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.product_warehouse_model import ProductWarehouse


def test_get_inventory_items(db: Session, service_master_data):
    """Test getting inventory items (summary)."""
    service = InventoryService(db)
    product1 = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]

    # Create LotMaster
    lot_master = LotMaster(
        lot_number="LOT-INV-1",
        product_id=product1.id,
        supplier_id=supplier.id,
    )
    db.add(lot_master)
    db.flush()

    # Create lots
    lot1 = LotReceipt(
        lot_master_id=lot_master.id,
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        received_quantity=100,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.flush()

    # Register to product_warehouse
    pw = ProductWarehouse(product_id=product1.id, warehouse_id=warehouse.id)
    db.merge(pw)
    db.flush()

    # Create reservation to simulate allocated quantity
    from app.infrastructure.persistence.models.lot_reservations_model import (
        LotReservation,
        ReservationSourceType,
        ReservationStatus,
    )

    res = LotReservation(
        lot_id=lot1.id,
        source_type=ReservationSourceType.ORDER,
        source_id=1,  # Dummy ID
        reserved_qty=10,
        status=ReservationStatus.CONFIRMED,
    )
    db.add(res)
    db.flush()

    # Note: v_inventory_summary view might not see uncommitted changes depending on isolation level
    # But in tests we usually run in transaction.
    # Let's see if flush is enough. If not, we might need to commit (but db fixture rolls back).
    # The view definition in conftest.py uses `FROM lots`, so it should see uncommitted changes in the same transaction.

    response = service.get_inventory_items()
    items = response.items
    # items = response.items

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
    # Test filtering
    response_filtered = service.get_inventory_items(product_id=product1.id)
    items_filtered = response_filtered.items
    assert len(items_filtered) >= 1
    assert items_filtered[0].product_id == product1.id


def test_get_inventory_item_by_product_warehouse(db: Session, service_master_data):
    """Test getting specific inventory item."""
    service = InventoryService(db)
    product1 = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]

    # Create LotMaster
    lot_master = LotMaster(
        lot_number="LOT-INV-2",
        product_id=product1.id,
        supplier_id=supplier.id,
    )
    db.add(lot_master)
    db.flush()

    lot1 = LotReceipt(
        lot_master_id=lot_master.id,
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        received_quantity=50,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.flush()

    # Register to product_warehouse
    pw = ProductWarehouse(product_id=product1.id, warehouse_id=warehouse.id)
    db.merge(pw)
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

    # Create LotMaster
    lot_master = LotMaster(
        lot_number="LOT-SUP-1",
        product_id=product1.id,
        supplier_id=supplier.id,
    )
    db.add(lot_master)
    db.flush()

    lot1 = LotReceipt(
        lot_master_id=lot_master.id,
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        received_quantity=30,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.flush()

    # Register to product_warehouse
    pw = ProductWarehouse(product_id=product1.id, warehouse_id=warehouse.id)
    db.merge(pw)
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

    # Create LotMaster
    lot_master = LotMaster(
        lot_number="LOT-WH-1",
        product_id=product1.id,
        supplier_id=supplier.id,
    )
    db.add(lot_master)
    db.flush()

    lot1 = LotReceipt(
        lot_master_id=lot_master.id,
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        received_quantity=40,
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

    # Create LotMaster
    lot_master = LotMaster(
        lot_number="LOT-PRD-1",
        product_id=product1.id,
        supplier_id=supplier.id,
    )
    db.add(lot_master)
    db.flush()

    lot1 = LotReceipt(
        lot_master_id=lot_master.id,
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        received_quantity=60,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.flush()

    # Register to product_warehouse
    pw = ProductWarehouse(product_id=product1.id, warehouse_id=warehouse.id)
    db.merge(pw)
    db.flush()

    # Create reservation to simulate allocated quantity
    from app.infrastructure.persistence.models.lot_reservations_model import (
        LotReservation,
        ReservationSourceType,
        ReservationStatus,
    )

    res = LotReservation(
        lot_id=lot1.id,
        source_type=ReservationSourceType.ORDER,
        source_id=2,  # Dummy ID
        reserved_qty=5,
        status=ReservationStatus.CONFIRMED,
    )
    db.add(res)
    db.flush()

    results = service.get_inventory_by_product()
    target = next((r for r in results if r["product_id"] == product1.id), None)

    assert target is not None
    assert target["total_quantity"] >= 60
    assert target["allocated_quantity"] >= 5
    assert target["available_quantity"] >= 55


def test_get_filter_options_stock_mode(db: Session, service_master_data):
    """Stock mode filter options should be limited to in-stock candidates."""
    service = InventoryService(db)
    product1 = service_master_data["product1"]
    product2 = service_master_data["product2"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]

    lot_master = LotMaster(
        lot_number="LOT-FILTER-1",
        product_id=product1.id,
        supplier_id=supplier.id,
    )
    db.add(lot_master)
    db.flush()

    lot = LotReceipt(
        lot_master_id=lot_master.id,
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        received_quantity=25,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot)
    db.flush()

    null_supplier_master = LotMaster(
        lot_number="LOT-FILTER-NULL",
        product_id=product1.id,
        supplier_id=None,
    )
    db.add(null_supplier_master)
    db.flush()

    null_supplier_lot = LotReceipt(
        lot_master_id=null_supplier_master.id,
        product_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=None,
        received_quantity=5,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(null_supplier_lot)
    db.flush()

    stock_options = service.get_filter_options(mode="stock")
    stock_product_ids = {p.id for p in stock_options.products}
    stock_supplier_ids = {s.id for s in stock_options.suppliers}
    stock_warehouse_ids = {w.id for w in stock_options.warehouses}

    assert product1.id in stock_product_ids
    assert product2.id not in stock_product_ids
    assert supplier.id in stock_supplier_ids
    assert None not in stock_supplier_ids
    assert warehouse.id in stock_warehouse_ids

    coerced_options = service.get_filter_options(mode="stock", tab="no_stock")
    assert coerced_options.effective_tab == "in_stock"

    master_options = service.get_filter_options(mode="master")
    master_product_ids = {p.id for p in master_options.products}

    assert product1.id in master_product_ids
    assert product2.id in master_product_ids
    assert master_options.effective_tab == "all"


def test_get_filter_options_stock_mode_mutuality(db: Session, service_master_data):
    """Stock mode filter options should mutually narrow products/suppliers/warehouses."""
    service = InventoryService(db)
    product1 = service_master_data["product1"]
    supplier1 = service_master_data["supplier"]
    warehouse1 = service_master_data["warehouse"]

    supplier2 = Supplier(supplier_code="SUP-ALT", supplier_name="Alt Supplier")
    warehouse2 = Warehouse(
        warehouse_code="WH-ALT", warehouse_name="Alt Warehouse", warehouse_type="internal"
    )
    db.add(supplier2)
    db.add(warehouse2)
    db.flush()

    master1 = LotMaster(
        lot_number="LOT-MUT-1",
        product_id=product1.id,
        supplier_id=supplier1.id,
    )
    master2 = LotMaster(
        lot_number="LOT-MUT-2",
        product_id=product1.id,
        supplier_id=supplier2.id,
    )
    db.add(master1)
    db.add(master2)
    db.flush()

    lot1 = LotReceipt(
        lot_master_id=master1.id,
        product_id=product1.id,
        warehouse_id=warehouse1.id,
        supplier_id=supplier1.id,
        received_quantity=10,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    lot2 = LotReceipt(
        lot_master_id=master2.id,
        product_id=product1.id,
        warehouse_id=warehouse2.id,
        supplier_id=supplier2.id,
        received_quantity=10,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)
    db.add(lot2)
    db.flush()

    options_by_supplier = service.get_filter_options(
        product_id=product1.id,
        supplier_id=supplier1.id,
        mode="stock",
    )
    assert {w.id for w in options_by_supplier.warehouses} == {warehouse1.id}

    options_by_warehouse = service.get_filter_options(
        product_id=product1.id,
        warehouse_id=warehouse2.id,
        mode="stock",
    )
    assert {s.id for s in options_by_warehouse.suppliers} == {supplier2.id}

    master_options = service.get_filter_options(
        product_id=product1.id,
        supplier_id=supplier1.id,
        mode="master",
    )
    master_warehouse_ids = {w.id for w in master_options.warehouses}
    assert warehouse1.id in master_warehouse_ids
    assert warehouse2.id in master_warehouse_ids
