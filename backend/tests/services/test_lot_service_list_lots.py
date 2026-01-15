
from datetime import date
from sqlalchemy.orm import Session
from app.application.services.inventory.lot_service import LotService
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.inventory_models import Lot
from app.infrastructure.persistence.models.masters_models import Supplier, Warehouse, Product
from app.infrastructure.persistence.models.product_warehouse_model import ProductWarehouse

def test_list_lots_with_primary_priority(db: Session, service_master_data):
    """Test list_lots with primary_supplier_ids to reproduce 500 error."""
    
    # Setup data
    product = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]
    
    # Ensure ProductWarehouse exists
    pw = ProductWarehouse(product_id=product.id, warehouse_id=warehouse.id)
    db.merge(pw)
    db.flush()

    # Create a lot
    lot_master = LotMaster(
        lot_number="LOT-TEST-500",
        product_id=product.id,
        supplier_id=supplier.id,
    )
    db.add(lot_master)
    db.flush()

    lot = Lot(
        lot_master_id=lot_master.id,
        lot_number="LOT-TEST-500",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=100,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot)
    db.flush()

    service = LotService(db)
    
    # Test case 1: No primary suppliers (empty list)
    print("Testing with empty primary_supplier_ids...")
    results = service.list_lots(primary_supplier_ids=[])
    assert len(results) > 0
    print("Success empty list")

    # Test case 2: With primary supplier
    print(f"Testing with primary_supplier_ids=[{supplier.id}]...")
    results = service.list_lots(primary_supplier_ids=[supplier.id])
    assert len(results) > 0
    print("Success with valid id")

    # Test case 3: With non-matching primary supplier
    print("Testing with non-matching primary_supplier_ids=[99999]...")
    results = service.list_lots(primary_supplier_ids=[99999])
    assert len(results) > 0
    print("Success with non-matching id")
