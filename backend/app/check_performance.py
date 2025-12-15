import os
import sys
import time
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.application.services.allocations.confirm import confirm_reservations_batch
from app.infrastructure.external import sap_gateway
from app.infrastructure.external.sap_gateway import SapRegistrationResult
from app.infrastructure.persistence.models import (
    Lot,
    LotReservation,
    Product,
    Warehouse,
)
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
    current_quantity=Decimal("100000"),
    received_date=date.today(),
    unit="EA",
    status="active",
)
db.add(warehouse)
db.add(product)
db.add(lot)
db.commit()

mock_sap = MagicMock()
mock_sap.register_allocation.return_value = SapRegistrationResult(
    success=True, document_no="SAP123"
)

res_ids = []
BATCH_SIZE = 1000
print(f"[Test] Creating {BATCH_SIZE} active reservations...")
for i in range(BATCH_SIZE):
    res = LotReservation(
        id=i + 100,
        lot=lot,
        reserved_qty=Decimal("1"),
        status="active",
        source_type="manual",
        source_id=i,
    )
    db.add(res)
    res_ids.append(res.id)
db.commit()

print(f"[Test] Batch confirming {BATCH_SIZE} reservations...")
start_time = time.time()

# Mocking internal confirm_reservation to assume it uses the mock SAP


sap_gateway._default_gateway = mock_sap

confirmed, failed = confirm_reservations_batch(db, res_ids)

end_time = time.time()
duration = end_time - start_time

print(f"[Result] Processed {len(confirmed)} confirmed, {len(failed)} failed.")
print(f"[Result] Total Time: {duration:.4f} seconds")
print(f"[Result] TPS: {BATCH_SIZE / duration:.2f} reservations/sec")

if len(failed) > 0:
    print("WARNING: Some items failed!")
else:
    print("SUCCESS: All items confirmed.")
