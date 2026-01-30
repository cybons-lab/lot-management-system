from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.application.services.inventory.withdrawal_service import WithdrawalService
from app.infrastructure.persistence.models.inventory_models import StockHistory
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.withdrawal_models import Withdrawal
from app.presentation.schemas.inventory.withdrawal_schema import (
    WithdrawalCreate,
    WithdrawalType,
)


@pytest.fixture
def cleanup_withdrawals(db, normal_user):
    """Cleanup withdrawals created by normal_user."""
    yield
    # Delete all withdrawals by this user
    db.query(Withdrawal).filter(Withdrawal.withdrawn_by == normal_user.id).delete()
    db.commit()


def create_lot(db, master_data, quantity=100):
    """Helper to create a lot receipt for testing."""
    product = master_data["product1"]
    warehouse = master_data["warehouse"]
    supplier = master_data["supplier"]

    # Create LotMaster
    lot_master = LotMaster(
        product_group_id=product.id,
        lot_number="LOT-TEST-001",
        supplier_id=supplier.id,
    )
    db.add(lot_master)
    db.flush()

    # Create LotReceipt
    lot = LotReceipt(
        lot_master_id=lot_master.id,
        product_group_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        received_date=date.today(),
        received_quantity=Decimal(quantity),
        consumed_quantity=Decimal(0),
        unit="EA",
        status="active",
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return lot


def test_create_withdrawal_with_ship_date(db, master_data, normal_user, cleanup_withdrawals):
    """Test creating a withdrawal with ship_date provided."""
    service = WithdrawalService(db)
    lot = create_lot(db, master_data)

    data = WithdrawalCreate(
        lot_id=lot.id,
        quantity=Decimal(10),
        withdrawal_type=WithdrawalType.INTERNAL_USE,
        ship_date=date.today(),
        due_date=date.today() + timedelta(days=1),
        reason="Test withdrawal",
        withdrawn_by=normal_user.id,
    )

    response = service.create_withdrawal(data, withdrawn_by=normal_user.id)

    # Pydantic model uses .id (or alias depending on config, but field access on object is field name)
    assert response.id is not None
    assert response.quantity == Decimal("10.000")

    # Verify DB record
    record = db.query(Withdrawal).filter(Withdrawal.id == response.id).first()
    assert record.ship_date == date.today()
    assert record.due_date == date.today() + timedelta(days=1)

    # Verify stock history
    history = db.query(StockHistory).filter(StockHistory.reference_id == record.id).first()
    assert history is not None
    assert history.quantity_change == Decimal("-10")


def test_create_withdrawal_without_ship_date(db, master_data, normal_user, cleanup_withdrawals):
    """Test creating a withdrawal without ship_date (should be None)."""
    service = WithdrawalService(db)
    lot = create_lot(db, master_data)

    data = WithdrawalCreate(
        lot_id=lot.id,
        quantity=Decimal(20),
        withdrawal_type=WithdrawalType.DISPOSAL,
        ship_date=None,  # Optional
        due_date=date.today(),
        reason="Test disposal",
        withdrawn_by=normal_user.id,
    )

    # This should succeed now that ship_date is nullable
    response = service.create_withdrawal(data, withdrawn_by=normal_user.id)

    assert response.id is not None
    assert response.ship_date is None
    assert response.due_date == date.today()

    # Verify DB record
    record = db.query(Withdrawal).filter(Withdrawal.id == response.id).first()
    assert record.ship_date is None
    assert record.due_date == date.today()


def test_create_withdrawal_insufficient_stock(db, master_data, normal_user, cleanup_withdrawals):
    """Test insufficient stock error."""
    service = WithdrawalService(db)
    lot = create_lot(db, master_data, quantity=10)

    data = WithdrawalCreate(
        lot_id=lot.id,
        quantity=Decimal(20),  # More than available
        withdrawal_type=WithdrawalType.INTERNAL_USE,
        ship_date=date.today(),
        due_date=date.today(),
        withdrawn_by=normal_user.id,
    )

    # Import from the correct location
    from app.application.services.inventory.lot_reservation_service import (
        ReservationInsufficientStockError,
    )

    with pytest.raises(ReservationInsufficientStockError):
        service.create_withdrawal(data, withdrawn_by=normal_user.id)
