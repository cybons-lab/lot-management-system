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

today = date.today()

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
    received_date=today,
    unit="EA",
    status="active",
    expiry_date=today,  # Boundary Condition
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

print(f"[Test] Confirming reservation for Lot expiring TODAY ({today})...")
try:
    confirm_reservation(db, res_id, sap_gateway=mock_sap)
    print("VULNERABILITY CONFIRMED: Expired (or Boundary) Lot was successfully confirmed!")
except Exception as e:
    print(f"SAFE: Confirmation blocked: {e}")
