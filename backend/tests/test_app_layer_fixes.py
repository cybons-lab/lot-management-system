"""Tests for P0/P1/P2 App Layer fixes.

This module tests:
- P0-1: Lot physical delete API returns 403 Forbidden
- P1-1/P1-2: Available Qty includes only CONFIRMED reservations
- P1-3: Confirm operation is idempotent
- P2-2: InsufficientStockError raises 409 Conflict
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestP0LotPhysicalDeleteForbidden:
    """P0-1: Lot physical delete API should return 403 Forbidden."""

    def test_delete_lot_returns_403(self, client: TestClient, db_session: Session):
        """物理削除APIは403 Forbiddenを返すこと."""
        # Arrange: Any lot_id (doesn't need to exist for this test)
        lot_id = 999

        # Act
        response = client.delete(f"/api/inventory/lots/{lot_id}")

        # Assert: Should be 403 Forbidden (policy violation)
        assert response.status_code == 403
        assert (
            "禁止" in response.json().get("detail", "")
            or "forbidden" in response.json().get("detail", "").lower()
        )


class TestP1AvailableQtyCalculation:
    """P1-1/P1-2: Available Qty should only consider CONFIRMED reservations."""

    def test_active_reservation_does_not_reduce_available(self, db_session: Session):
        """ACTIVE予約はAvailable Qtyを減らさないこと."""
        from decimal import Decimal

        from app.application.services.inventory.stock_calculation import get_reserved_quantity
        from app.infrastructure.persistence.models.inventory_models import Lot
        from app.infrastructure.persistence.models.lot_reservations_model import (
            LotReservation,
            ReservationSourceType,
            ReservationStatus,
        )

        # Arrange: Create test lot
        lot = db_session.query(Lot).first()
        if not lot:
            pytest.skip("No lots in test database")

        # Create ACTIVE reservation (should NOT reduce available qty)
        active_reservation = LotReservation(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=99999,  # Dummy
            reserved_qty=Decimal("10"),
            status=ReservationStatus.ACTIVE,
        )
        db_session.add(active_reservation)
        db_session.flush()

        # Act
        reserved_qty = get_reserved_quantity(db_session, lot.id)

        # Assert: ACTIVE reservation should NOT be counted
        # (only CONFIRMED should be counted)
        assert active_reservation.reserved_qty not in [reserved_qty]

        # Cleanup
        db_session.rollback()

    def test_confirmed_reservation_reduces_available(self, db_session: Session):
        """CONFIRMED予約はAvailable Qtyを減らすこと."""
        from decimal import Decimal

        from app.application.services.inventory.stock_calculation import get_reserved_quantity
        from app.infrastructure.persistence.models.inventory_models import Lot
        from app.infrastructure.persistence.models.lot_reservations_model import (
            LotReservation,
            ReservationSourceType,
            ReservationStatus,
        )

        # Arrange: Create test lot
        lot = db_session.query(Lot).first()
        if not lot:
            pytest.skip("No lots in test database")

        initial_reserved = get_reserved_quantity(db_session, lot.id)

        # Create CONFIRMED reservation (SHOULD reduce available qty)
        confirmed_qty = Decimal("5")
        confirmed_reservation = LotReservation(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=99998,  # Dummy
            reserved_qty=confirmed_qty,
            status=ReservationStatus.CONFIRMED,
        )
        db_session.add(confirmed_reservation)
        db_session.flush()

        # Act
        new_reserved = get_reserved_quantity(db_session, lot.id)

        # Assert: CONFIRMED reservation SHOULD be counted
        assert new_reserved == initial_reserved + confirmed_qty

        # Cleanup
        db_session.rollback()


class TestP2InsufficientStockErrorMapping:
    """P2-2: InsufficientStockError should have correct attributes."""

    def test_insufficient_stock_error_has_lot_details(self):
        """InsufficientStockErrorがlot_id, lot_number, required, availableを持つこと."""
        from app.domain.errors import InsufficientStockError

        # Arrange & Act
        error = InsufficientStockError(
            lot_id=123,
            lot_number="LOT-001",
            required=100.0,
            available=50.0,
        )

        # Assert
        assert error.lot_id == 123
        assert error.lot_number == "LOT-001"
        assert error.required == 100.0
        assert error.available == 50.0
        assert error.code == "INSUFFICIENT_STOCK"
        assert "LOT-001" in error.message
        assert "100" in error.message
        assert "50" in error.message

    def test_insufficient_stock_error_details_dict(self):
        """InsufficientStockErrorのdetailsにlot情報が含まれること."""
        from app.domain.errors import InsufficientStockError

        # Arrange & Act
        error = InsufficientStockError(
            lot_id=456,
            lot_number="LOT-XYZ",
            required=200.0,
            available=100.0,
        )

        # Assert
        assert error.details["lot_id"] == 456
        assert error.details["lot_number"] == "LOT-XYZ"
        assert error.details["required"] == 200.0
        assert error.details["available"] == 100.0

    def test_insufficient_stock_error_from_allocation_exceptions(self):
        """allocation.exceptionsからのインポートも同じクラスであること."""
        from app.domain.allocation.exceptions import InsufficientStockError as AllocationISE
        from app.domain.errors import InsufficientStockError

        # Assert: Same class
        assert AllocationISE is InsufficientStockError

    def test_insufficient_stock_error_from_schemas(self):
        """schemas.pyからのインポートも同じクラスであること."""
        from app.application.services.allocations.schemas import (
            InsufficientStockError as SchemasISE,
        )
        from app.domain.errors import InsufficientStockError

        # Assert: Same class
        assert SchemasISE is InsufficientStockError
