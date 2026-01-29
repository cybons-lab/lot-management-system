import os
import sys
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.application.services.allocations.confirm import confirm_reservation
from app.application.services.inventory.lot_reservation_service import LotReservationService
from app.infrastructure.external.sap_gateway import SapRegistrationResult
from app.infrastructure.persistence.models import LotReceipt as Lot
from app.infrastructure.persistence.models import LotReservation, Product, Warehouse
from app.infrastructure.persistence.models.base_model import Base


engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

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
db.add(warehouse)
db.add(product)
db.add(lot)
db.add(reservation)
db.commit()
res_id = reservation.id

mock_sap = MagicMock()
mock_sap.register_allocation.return_value = SapRegistrationResult(
    success=True, document_no="SAP123"
)

print("[Test] Confirming reservation...")
confirm_reservation(db, res_id, sap_gateway=mock_sap)
db.commit()

print("[Test] Releasing reservation...")
service = LotReservationService(db)
service.release(res_id)
db.commit()

res = db.get(LotReservation, res_id)
if res is not None:
    print(f"[State] Status is now: {res.status}")
    if res.status == "released":
        print("WARNING: Confirmed reservation was RELEASED directly (V-03 Confirmed?)")
    else:
        print(f"SAFE: Status is {res.status}")
else:
    print("ERROR: Reservation not found after release operation")

print("[Test] Attempting to re-confirm RELEASED reservation...")
try:
    confirm_reservation(db, res_id, sap_gateway=mock_sap)
    print("VULNERABILITY: Re-confirmed Released Reservation!")
except Exception as e:
    print(f"SAFE: Re-confirm failed with: {e}")
