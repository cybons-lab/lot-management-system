import os
import sys
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.application.services.allocations.confirm import confirm_reservation
from app.infrastructure.external.sap_gateway import SapRegistrationResult
from app.infrastructure.persistence.models import Lot, LotReservation, Product, Warehouse
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
    )
    reservation = LotReservation(
        id=1,
        lot=lot,
        reserved_qty=Decimal("10"),
        status="active",
        source_type="manual",
        source_id=1,
    )
    db.add(warehouse)
    db.add(product)
    db.add(lot)
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation.id


def test_sap_failure():
    res_id = setup_data()

    mock_sap = MagicMock()
    mock_sap.register_allocation.return_value = SapRegistrationResult(
        success=True, document_no="SAP123", registered_at=date.today()
    )

    print("\n[Test] Attempt 1: Simulating DB Commit Failure...")
    original_commit = db.commit

    def fail_once_commit():
        print("    [DB] Commit executed -> Raising Simulation Error!")
        db.rollback()
        db.commit = original_commit
        raise Exception("Simulated DB Commit Error")

    db.commit = fail_once_commit

    try:
        confirm_reservation(db=db, reservation_id=res_id, sap_gateway=mock_sap)
    except Exception as e:
        print(f"    [App] Caught expected exception: {e}")

    db.expire_all()
    res = db.get(LotReservation, res_id)
    print(f"    [State] Reservation Status: {res.status} (Expected: active)")
    if res.status != "active":
        print("    [FAIL] DB should have rolled back to active!")

    print("\n[Test] Attempt 2: Retrying confirmation...")
    confirm_reservation(db=db, reservation_id=res_id, sap_gateway=mock_sap)

    print(f"\n[Result] Total SAP Calls: {mock_sap.register_allocation.call_count}")
    if mock_sap.register_allocation.call_count > 1:
        print("VULNERABILITY CONFIRMED: Double SAP Registration occurred!")
    else:
        print("SAFE: SAP was not called twice.")


if __name__ == "__main__":
    test_sap_failure()
