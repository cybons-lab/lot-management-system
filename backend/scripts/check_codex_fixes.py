import os
import sys
import unittest
from datetime import date, datetime
from decimal import Decimal


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.application.services.inventory.lot_reservation_service import (
    LotReservationService,
    ReservationInsufficientStockError,
    ReservationLotNotFoundError,
)
from app.application.services.inventory.withdrawal_service import WithdrawalService
from app.infrastructure.persistence.models import Lot, LotReservation, Product, Warehouse
from app.infrastructure.persistence.models.base_model import Base
from app.presentation.schemas.inventory.withdrawal_schema import WithdrawalCreate, WithdrawalType


engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)


class TestCodexFixes(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        self.db = SessionLocal()
        # Setup common data
        self.warehouse = Warehouse(
            id=1, warehouse_code="WH1", warehouse_name="Test WH", warehouse_type="internal"
        )
        self.product = Product(id=1, maker_part_code="P1", product_name="Test Prod", base_unit="EA")
        self.db.add(self.warehouse)
        self.db.add(self.product)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_confirm_idempotency(self):
        """Verify confirm() is idempotent for 'confirmed' status string."""
        lot = Lot(
            id=1,
            lot_number="L1",
            product=self.product,
            warehouse=self.warehouse,
            current_quantity=Decimal("100"),
            received_date=date.today(),
            unit="EA",
            status="active",
        )
        # Manually create a confirmed reservation
        old_time = datetime(2020, 1, 1)
        reservation = LotReservation(
            id=1,
            lot=lot,
            reserved_qty=Decimal("10"),
            status="confirmed",  # String value in DB
            source_type="manual",
            source_id=1,
            created_at=old_time,
            updated_at=old_time,
            confirmed_at=old_time,
        )
        self.db.add(lot)
        self.db.add(reservation)
        self.db.commit()

        service = LotReservationService(self.db)

        # Call confirm again
        confirmed_res = service.confirm(1)
        self.db.commit()

        # Check if updated_at changed
        self.assertEqual(confirmed_res.status, "confirmed")
        self.assertEqual(
            confirmed_res.updated_at, old_time, "Should not update if already confirmed"
        )
        print("\n[Pass] Idempotency Check: updated_at remained unchanged.")

    def test_withdrawal_exceptions(self):
        """Verify WithdrawalService raises specific exceptions."""
        service = WithdrawalService(self.db)

        # 1. Lot Not Found
        with self.assertRaises(ReservationLotNotFoundError):
            service.create_withdrawal(
                WithdrawalCreate(
                    lot_id=999,
                    quantity=Decimal("10"),
                    withdrawal_type=WithdrawalType.INTERNAL_USE,
                    ship_date=date.today(),
                ),
                withdrawn_by=1,
            )
        print("[Pass] Withdrawal: ReservationLotNotFoundError raised.")

        # 2. Insufficient Stock
        lot = Lot(
            id=2,
            lot_number="L2",
            product=self.product,
            warehouse=self.warehouse,
            current_quantity=Decimal("10"),
            received_date=date.today(),
            unit="EA",
            status="active",
        )
        self.db.add(lot)
        self.db.commit()

        with self.assertRaises(ReservationInsufficientStockError):
            service.create_withdrawal(
                WithdrawalCreate(
                    lot_id=2,
                    quantity=Decimal("20"),
                    withdrawal_type=WithdrawalType.INTERNAL_USE,
                    ship_date=date.today(),
                ),
                withdrawn_by=1,
            )
        print("[Pass] Withdrawal: ReservationInsufficientStockError raised.")


if __name__ == "__main__":
    unittest.main()
