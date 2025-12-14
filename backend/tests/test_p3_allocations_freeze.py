"""Tests for P3 Phase 0: allocations write freeze.

Ensures that allocations table writes are disabled and
LotReservation is the only source of truth.
"""

import pytest

from app.infrastructure.persistence.models import Allocation
from app.infrastructure.persistence.repositories.allocation_repository import AllocationRepository


class TestAllocationRepositoryFrozen:
    """Verify AllocationRepository writes are frozen."""

    def test_create_raises_runtime_error(self, db_session):
        """AllocationRepository.create() should raise RuntimeError."""
        repo = AllocationRepository(db_session)

        with pytest.raises(RuntimeError) as exc_info:
            repo.create(order_line_id=1, lot_id=1, allocated_qty=10.0)

        assert "allocations writes are disabled" in str(exc_info.value)
        assert "lot_reservations" in str(exc_info.value)

    def test_update_status_raises_runtime_error(self, db_session):
        """AllocationRepository.update_status() should raise RuntimeError."""
        repo = AllocationRepository(db_session)
        # Create a mock allocation (not touching DB)
        allocation = Allocation(id=1, order_line_id=1, lot_id=1, allocated_quantity=10.0)

        with pytest.raises(RuntimeError) as exc_info:
            repo.update_status(allocation, "cancelled")

        assert "allocations writes are disabled" in str(exc_info.value)

    def test_delete_raises_runtime_error(self, db_session):
        """AllocationRepository.delete() should raise RuntimeError."""
        repo = AllocationRepository(db_session)
        allocation = Allocation(id=1, order_line_id=1, lot_id=1, allocated_quantity=10.0)

        with pytest.raises(RuntimeError) as exc_info:
            repo.delete(allocation)

        assert "allocations writes are disabled" in str(exc_info.value)


class TestSapGateway:
    """Test SAP Gateway implementations."""

    def test_mock_sap_gateway_returns_success(self):
        """MockSapGateway should return successful registration."""
        from app.infrastructure.external.sap_gateway import MockSapGateway
        from app.infrastructure.persistence.models.lot_reservations_model import (
            LotReservation,
            ReservationSourceType,
            ReservationStatus,
        )
        from decimal import Decimal

        gateway = MockSapGateway()
        reservation = LotReservation(
            id=123,
            lot_id=1,
            source_type=ReservationSourceType.ORDER,
            source_id=100,
            reserved_qty=Decimal("10"),
            status=ReservationStatus.ACTIVE,
        )

        result = gateway.register_allocation(reservation)

        assert result.success is True
        assert result.document_no is not None
        assert "SAP-" in result.document_no
        assert "123" in result.document_no  # reservation ID
        assert result.registered_at is not None
        assert result.error_message is None

    def test_failing_sap_gateway_returns_failure(self):
        """FailingSapGateway should return failed registration."""
        from app.infrastructure.external.sap_gateway import FailingSapGateway
        from app.infrastructure.persistence.models.lot_reservations_model import (
            LotReservation,
            ReservationSourceType,
            ReservationStatus,
        )
        from decimal import Decimal

        gateway = FailingSapGateway()
        reservation = LotReservation(
            id=456,
            lot_id=1,
            source_type=ReservationSourceType.ORDER,
            source_id=100,
            reserved_qty=Decimal("10"),
            status=ReservationStatus.ACTIVE,
        )

        result = gateway.register_allocation(reservation)

        assert result.success is False
        assert result.document_no is None
        assert result.registered_at is None
        assert result.error_message is not None


class TestLotReservationSapMarkers:
    """Test LotReservation SAP marker fields."""

    def test_sap_markers_exist_on_model(self):
        """LotReservation should have SAP marker fields."""
        from app.infrastructure.persistence.models.lot_reservations_model import LotReservation

        # Check that the columns exist
        assert hasattr(LotReservation, "sap_document_no")
        assert hasattr(LotReservation, "sap_registered_at")
