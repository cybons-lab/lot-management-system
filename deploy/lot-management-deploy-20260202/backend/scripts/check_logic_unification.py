import os
import sys
from datetime import date
from decimal import Decimal


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.application.services.inventory import stock_calculation
from app.application.services.inventory.lot_reservation_service import LotReservationService
from app.infrastructure.persistence.models import LotReceipt as Lot
from app.infrastructure.persistence.models import LotReservation, Product, Warehouse
from app.infrastructure.persistence.models.base_model import Base


engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()


def setup_data():
    warehouse = Warehouse(
        id=1, warehouse_code="WH1", warehouse_name="Test WH", warehouse_type="internal"
    )
    product = Product(id=1, maker_part_code="P1", product_name="Test Prod", base_unit="EA")
    lot = Lot(
        id=1,
        lot_number="L1",
        product=product,
        warehouse=warehouse,
        current_quantity=Decimal("100"),
        received_date=date.today(),
        unit="EA",
        status="active",
        locked_quantity=Decimal("10"),  # Locked Quantity
    )
    db.add(warehouse)
    db.add(product)
    db.add(lot)
    db.commit()
    return lot.id


def test_logic_unification():
    lot_id = setup_data()
    service = LotReservationService(db)

    # 1. Check Initial State (Locked only)
    # Available = 100 - 10 (locked) = 90
    available = service.get_available_quantity(lot_id)
    print(f"[Test 1] Initial Available (Locked=10): {available}")
    if available != Decimal("90"):
        print("FAIL: Expected 90")
        return

    # 2. Add Active Reservation
    # Available = 100 - 10 (locked) - 0 (Active ignored for validation) = 90
    res_active = LotReservation(
        id=1,
        lot_id=lot_id,
        reserved_qty=Decimal("20"),
        status="active",
        source_type="manual",
        source_id=1,
    )
    db.add(res_active)
    db.commit()

    available = service.get_available_quantity(lot_id)
    print(f"[Test 2] After Active Reservation (Qty=20): {available}")
    if available != Decimal("90"):
        print(f"FAIL: Expected 90 (Active Ignored), Got {available}")
        return

    # 3. Add Confirmed Reservation
    # Available = 100 - 10 (locked) - 30 (confirmed) = 60
    res_confirmed = LotReservation(
        id=2,
        lot_id=lot_id,
        reserved_qty=Decimal("30"),
        status="confirmed",
        source_type="manual",
        source_id=2,
    )
    db.add(res_confirmed)
    db.commit()

    available = service.get_available_quantity(lot_id)
    print(f"[Test 3] After Confirmed Reservation (Qty=30): {available}")
    if available != Decimal("60"):
        print(f"FAIL: Expected 60, Got {available}")
        return

    # 4. Verify stock_calculation direct access (Confirmed Only)
    reserved_calc = stock_calculation.get_reserved_quantity(db, lot_id)
    print(f"[Test 4] stock_calculation.get_reserved_quantity: {reserved_calc}")
    if reserved_calc != Decimal("30"):  # Only Confirmed (30)
        print(f"FAIL: Expected 30 (Confirmed Only), Got {reserved_calc}")
        return

    print("SUCCESS: Logic Unification Verified!")


if __name__ == "__main__":
    test_logic_unification()
