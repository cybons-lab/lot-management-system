import os
import sys
import threading
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.application.services.allocations.confirm import confirm_reservation
from app.infrastructure.external.sap_gateway import SapRegistrationResult
from app.infrastructure.persistence.models import Lot, LotReservation, Product, Warehouse
from app.infrastructure.persistence.models.base_model import Base


engine = create_engine("sqlite:///race_test.db", connect_args={"check_same_thread": False})
if os.path.exists("race_test.db"):
    os.remove("race_test.db")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
db_main = SessionLocal()

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
    id=1, lot=lot, reserved_qty=Decimal("10"), status="active", source_type="manual", source_id=1
)
db_main.add(warehouse)
db_main.add(product)
db_main.add(lot)
db_main.add(reservation)
db_main.commit()
res_id = reservation.id
db_main.close()

mock_sap = MagicMock()
mock_sap.register_allocation.return_value = SapRegistrationResult(
    success=True, document_no="SAP123"
)


def run_confirm():
    db = SessionLocal()
    try:
        confirm_reservation(db, res_id, sap_gateway=mock_sap)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


print("[Test] Starting Concurrent Confirm Race...")
t1 = threading.Thread(target=run_confirm)
t2 = threading.Thread(target=run_confirm)

t1.start()
t2.start()
t1.join()
t2.join()

print(f"[Result] Total SAP Calls: {mock_sap.register_allocation.call_count}")
if mock_sap.register_allocation.call_count > 1:
    print("VULNERABILITY CONFIRMED: Double SAP Registration in race condition!")
else:
    print("SAFE: Single SAP Call.")
