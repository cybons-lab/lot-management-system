from datetime import date

from sqlalchemy.orm import Session

from app.application.services.inventory.inventory_service import InventoryService


def test_get_inventory_items_primary_staff_only(db: Session, service_master_data):
    """Test filtering inventory items by primary staff (current user)."""
    from app.infrastructure.persistence.models.assignments.assignment_models import (
        UserSupplierAssignment,
    )
    from app.infrastructure.persistence.models.inventory_models import LotReceipt
    from app.infrastructure.persistence.models.lot_master_model import LotMaster
    from app.infrastructure.persistence.models.masters_models import Supplier
    from app.infrastructure.persistence.models.product_warehouse_model import ProductWarehouse

    service = InventoryService(db)
    product1 = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    user = service_master_data["user"]

    # 0. Ensure ProductWarehouse exists
    pw = ProductWarehouse(product_group_id=product1.id, warehouse_id=warehouse.id)
    db.merge(pw)
    db.flush()

    # 1. Create a supplier assigned to the current user
    assigned_supplier = Supplier(
        supplier_code="SUP-ASSIGNED",
        supplier_name="Assigned Supplier",
    )
    db.add(assigned_supplier)
    db.flush()

    # Assign user as primary staff
    assignment = UserSupplierAssignment(
        user_id=user.id, supplier_id=assigned_supplier.id, is_primary=True
    )
    db.add(assignment)
    db.flush()

    # 2. Create unassigned supplier (used from fixture)
    unassigned_supplier = service_master_data["supplier"]

    # 3. Create lots for assigned supplier
    lot_master1 = LotMaster(
        lot_number="LOT-ASSIGNED",
        product_group_id=product1.id,
        supplier_id=assigned_supplier.id,
    )
    db.add(lot_master1)
    db.flush()

    lot1 = LotReceipt(
        lot_master_id=lot_master1.id,
        product_group_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=assigned_supplier.id,
        received_quantity=50,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot1)

    # 4. Create lots for unassigned supplier
    lot_master2 = LotMaster(
        lot_number="LOT-UNASSIGNED",
        product_group_id=product1.id,
        supplier_id=unassigned_supplier.id,
    )
    db.add(lot_master2)
    db.flush()

    lot2 = LotReceipt(
        lot_master_id=lot_master2.id,
        product_group_id=product1.id,
        warehouse_id=warehouse.id,
        supplier_id=unassigned_supplier.id,
        received_quantity=30,
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    db.add(lot2)
    db.flush()

    # 5. Fetch with assigned_staff_only=True
    response = service.get_inventory_items(assigned_staff_only=True, current_user_id=user.id)
    items = response.items

    # 6. Verify results
    # Should only contain item from assigned supplier
    assert len(items) == 1
    assert items[0].total_quantity == 50

    # 7. Verify fetch without filter returns both (aggregated by product/warehouse)
    response_all = service.get_inventory_items()
    items_all = response_all.items
    print(f"DEBUG: All Items: {len(items_all)}")
    for i in items_all:
        print(
            f"DEBUG: Item: pid={i.product_group_id}, wid={i.warehouse_id}, qty={i.total_quantity}, name={i.product_name}"
        )

    target_all = [
        i for i in items_all if i.product_group_id == product1.id and i.warehouse_id == warehouse.id
    ]
    assert len(target_all) == 1
    assert target_all[0].total_quantity == 80
