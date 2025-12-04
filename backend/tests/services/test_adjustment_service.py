import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session

from app.services.inventory.adjustment_service import AdjustmentService
from app.schemas.inventory.inventory_schema import AdjustmentCreate
from app.models.inventory_models import Lot, StockHistory

def test_create_adjustment_increase(db: Session, service_master_data):
    """Test increasing inventory quantity."""
    service = AdjustmentService(db)
    product = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]
    
    user = service_master_data["user"]
    
    lot = Lot(
        lot_number="LOT-ADJ-1",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=100,
        received_date=date.today(),
        status="active",
        unit="EA"
    )
    db.add(lot)
    db.commit()
    
    adj_data = AdjustmentCreate(
        lot_id=lot.id,
        adjustment_type="found",
        adjusted_quantity=10,
        reason="Found extra items",
        adjusted_by=user.id
    )
    
    result = service.create_adjustment(adj_data)
    
    assert result.adjusted_quantity == 10
    assert result.lot_id == lot.id
    
    # Verify lot quantity updated
    db.refresh(lot)
    assert lot.current_quantity == 110
    
    # Verify stock history created
    history = db.query(StockHistory).filter(
        StockHistory.lot_id == lot.id,
        StockHistory.reference_type == "adjustment",
        StockHistory.reference_id == result.id
    ).first()
    assert history is not None
    assert history.quantity_change == 10
    assert history.quantity_after == 110

def test_create_adjustment_decrease(db: Session, service_master_data):
    """Test decreasing inventory quantity."""
    service = AdjustmentService(db)
    product = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]
    
    user = service_master_data["user"]
    
    lot = Lot(
        lot_number="LOT-ADJ-2",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=100,
        received_date=date.today(),
        status="active",
        unit="EA"
    )
    db.add(lot)
    db.commit()
    
    adj_data = AdjustmentCreate(
        lot_id=lot.id,
        adjustment_type="loss",
        adjusted_quantity=-10,
        reason="Lost items",
        adjusted_by=user.id
    )
    
    result = service.create_adjustment(adj_data)
    
    assert result.adjusted_quantity == -10
    
    db.refresh(lot)
    assert lot.current_quantity == 90

def test_create_adjustment_deplete(db: Session, service_master_data):
    """Test depleting inventory (quantity becomes 0)."""
    service = AdjustmentService(db)
    product = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]
    
    user = service_master_data["user"]
    
    lot = Lot(
        lot_number="LOT-ADJ-3",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=10,
        received_date=date.today(),
        status="active",
        unit="EA"
    )
    db.add(lot)
    db.commit()
    
    adj_data = AdjustmentCreate(
        lot_id=lot.id,
        adjustment_type="other",
        adjusted_quantity=-10,
        reason="Used all",
        adjusted_by=user.id
    )
    
    service.create_adjustment(adj_data)
    
    db.refresh(lot)
    assert lot.current_quantity == 0
    assert lot.status == "depleted"

def test_create_adjustment_negative_balance_error(db: Session, service_master_data):
    """Test error when adjustment results in negative balance."""
    service = AdjustmentService(db)
    product = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]
    
    user = service_master_data["user"]
    
    lot = Lot(
        lot_number="LOT-ADJ-4",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=10,
        received_date=date.today(),
        status="active",
        unit="EA"
    )
    db.add(lot)
    db.commit()
    
    adj_data = AdjustmentCreate(
        lot_id=lot.id,
        adjustment_type="loss",
        adjusted_quantity=-20,
        reason="Too much loss",
        adjusted_by=user.id
    )
    
    with pytest.raises(ValueError) as exc:
        service.create_adjustment(adj_data)
    assert "negative quantity" in str(exc.value)

def test_create_adjustment_lot_not_found(db: Session):
    """Test error when lot not found."""
    service = AdjustmentService(db)
    
    adj_data = AdjustmentCreate(
        lot_id=99999,
        adjustment_type="found",
        adjusted_quantity=10,
        reason="Found",
        adjusted_by=1
    )
    
    with pytest.raises(ValueError) as exc:
        service.create_adjustment(adj_data)
    assert "not found" in str(exc.value)

def test_get_adjustments_filtering(db: Session, service_master_data):
    """Test getting adjustments with filters."""
    service = AdjustmentService(db)
    product = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]
    
    user = service_master_data["user"]
    
    lot = Lot(
        lot_number="LOT-ADJ-FILT",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=100,
        received_date=date.today(),
        status="active",
        unit="EA"
    )
    db.add(lot)
    db.commit()
    
    # Create adjustments
    adj1 = AdjustmentCreate(lot_id=lot.id, adjustment_type="found", adjusted_quantity=10, reason="R1", adjusted_by=user.id)
    service.create_adjustment(adj1)
    
    adj2 = AdjustmentCreate(lot_id=lot.id, adjustment_type="loss", adjusted_quantity=-5, reason="R2", adjusted_by=user.id)
    service.create_adjustment(adj2)
    
    # Filter by type
    results = service.get_adjustments(adjustment_type="found")
    assert len(results) >= 1
    assert all(r.adjustment_type == "found" for r in results)
    
    # Filter by lot
    results = service.get_adjustments(lot_id=lot.id)
    assert len(results) == 2

def test_get_adjustment_by_id(db: Session, service_master_data):
    """Test getting adjustment by ID."""
    service = AdjustmentService(db)
    product = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]
    supplier = service_master_data["supplier"]
    
    user = service_master_data["user"]
    
    lot = Lot(
        lot_number="LOT-ADJ-GET",
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        current_quantity=100,
        received_date=date.today(),
        status="active",
        unit="EA"
    )
    db.add(lot)
    db.commit()
    
    adj_data = AdjustmentCreate(lot_id=lot.id, adjustment_type="found", adjusted_quantity=10, reason="R1", adjusted_by=user.id)
    created = service.create_adjustment(adj_data)
    
    fetched = service.get_adjustment_by_id(created.id)
    assert fetched is not None
    assert fetched.id == created.id
    
    assert service.get_adjustment_by_id(99999) is None
