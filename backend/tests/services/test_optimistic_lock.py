"""Optimistic lock (version-based concurrency control) tests.

Tests for version-based optimistic locking to detect concurrent modifications.
Validates that updates/deletes fail with 409 when version mismatches.
"""

from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.application.services.masters.warehouse_service import WarehouseService
from app.infrastructure.persistence.models.masters_models import Warehouse
from app.presentation.schemas.masters.masters_schema import WarehouseUpdate


class TestOptimisticLockUpdate:
    """Test optimistic lock on update operations."""

    def test_update_succeeds_with_correct_version(self, db_session: Session):
        """Update succeeds when version matches current version."""
        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="OPT001",
            warehouse_name="Optimistic Lock Test 1",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)

        # Update with correct version
        service = WarehouseService(db_session)
        initial_version = warehouse.version
        update_data = WarehouseUpdate(
            version=initial_version,
            warehouse_name="Updated Name",
        )
        updated = service.update_by_code("OPT001", update_data)

        assert updated.warehouse_name == "Updated Name"
        assert updated.version == initial_version + 1

        # Cleanup
        db_session.delete(updated)
        db_session.commit()

    def test_update_fails_with_stale_version(self, db_session: Session):
        """Update fails with 409 when version is stale."""
        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="OPT002",
            warehouse_name="Optimistic Lock Test 2",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)
        original_version = warehouse.version

        # Simulate concurrent update by incrementing version
        warehouse.version += 1
        db_session.commit()

        # Attempt update with stale version
        service = WarehouseService(db_session)
        update_data = WarehouseUpdate(
            version=original_version,  # Stale version
            warehouse_name="This Should Fail",
        )

        with pytest.raises(HTTPException) as exc_info:
            service.update_by_code("OPT002", update_data)

        assert exc_info.value.status_code == 409
        assert "error" in exc_info.value.detail
        assert exc_info.value.detail["error"] == "OPTIMISTIC_LOCK_CONFLICT"
        assert exc_info.value.detail["expected_version"] == original_version
        assert exc_info.value.detail["current_version"] == original_version + 1

        # Cleanup
        db_session.delete(warehouse)
        db_session.commit()

    def test_update_fails_when_version_too_new(self, db_session: Session):
        """Update fails with 409 when provided version is newer than current."""
        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="OPT003",
            warehouse_name="Optimistic Lock Test 3",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)

        # Attempt update with future version
        service = WarehouseService(db_session)
        update_data = WarehouseUpdate(
            version=warehouse.version + 10,  # Future version
            warehouse_name="This Should Fail",
        )

        with pytest.raises(HTTPException) as exc_info:
            service.update_by_code("OPT003", update_data)

        assert exc_info.value.status_code == 409

        # Cleanup
        db_session.delete(warehouse)
        db_session.commit()


class TestOptimisticLockSoftDelete:
    """Test optimistic lock on soft delete operations."""

    def test_soft_delete_succeeds_with_correct_version(self, db_session: Session):
        """Soft delete succeeds when version matches."""
        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="OPT004",
            warehouse_name="Optimistic Lock Test 4",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)

        # Soft delete with correct version
        service = WarehouseService(db_session)
        service.delete_by_code("OPT004", end_date=None, expected_version=warehouse.version)

        # Verify soft deleted
        db_session.refresh(warehouse)
        assert warehouse.valid_to is not None
        assert warehouse.version == 2

        # Cleanup
        db_session.delete(warehouse)
        db_session.commit()

    def test_soft_delete_fails_with_stale_version(self, db_session: Session):
        """Soft delete fails with 409 when version is stale."""
        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="OPT005",
            warehouse_name="Optimistic Lock Test 5",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)
        original_version = warehouse.version

        # Simulate concurrent update
        warehouse.warehouse_name = "Modified by another user"
        warehouse.version += 1
        db_session.commit()

        # Attempt soft delete with stale version
        service = WarehouseService(db_session)
        with pytest.raises(HTTPException) as exc_info:
            service.delete_by_code("OPT005", end_date=None, expected_version=original_version)

        assert exc_info.value.status_code == 409
        assert exc_info.value.detail["error"] == "OPTIMISTIC_LOCK_CONFLICT"

        # Cleanup
        db_session.delete(warehouse)
        db_session.commit()


class TestOptimisticLockHardDelete:
    """Test optimistic lock on hard delete operations."""

    def test_hard_delete_succeeds_with_correct_version(self, db_session: Session):
        """Hard delete succeeds when version matches."""
        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="OPT006",
            warehouse_name="Optimistic Lock Test 6",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)

        # Hard delete with correct version
        service = WarehouseService(db_session)
        service.hard_delete_by_code("OPT006", expected_version=warehouse.version)

        # Verify deleted
        assert (
            db_session.query(Warehouse).filter(Warehouse.warehouse_code == "OPT006").first() is None
        )

    def test_hard_delete_fails_with_stale_version(self, db_session: Session):
        """Hard delete fails with 409 when version is stale."""
        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="OPT007",
            warehouse_name="Optimistic Lock Test 7",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)
        original_version = warehouse.version

        # Simulate concurrent update
        warehouse.version += 1
        db_session.commit()

        # Attempt hard delete with stale version
        service = WarehouseService(db_session)
        with pytest.raises(HTTPException) as exc_info:
            service.hard_delete_by_code("OPT007", expected_version=original_version)

        assert exc_info.value.status_code == 409
        assert exc_info.value.detail["error"] == "OPTIMISTIC_LOCK_CONFLICT"

        # Cleanup
        db_session.delete(warehouse)
        db_session.commit()


class TestOptimisticLockVersionIncrement:
    """Test version increment behavior."""

    def test_version_increments_on_each_update(self, db_session: Session):
        """Version increments by 1 on each successful update."""
        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="OPT008",
            warehouse_name="Version Increment Test",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)

        initial_version = warehouse.version
        service = WarehouseService(db_session)

        # First update
        update1 = WarehouseUpdate(version=initial_version, warehouse_name="Update 1")
        result1 = service.update_by_code("OPT008", update1)
        assert result1.version == initial_version + 1

        # Second update
        update2 = WarehouseUpdate(version=result1.version, warehouse_name="Update 2")
        result2 = service.update_by_code("OPT008", update2)
        assert result2.version == initial_version + 2

        # Third update
        update3 = WarehouseUpdate(version=result2.version, warehouse_name="Update 3")
        result3 = service.update_by_code("OPT008", update3)
        assert result3.version == initial_version + 3

        # Cleanup
        db_session.delete(result3)
        db_session.commit()

    def test_version_increments_on_soft_delete(self, db_session: Session):
        """Version increments on soft delete."""
        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="OPT009",
            warehouse_name="Soft Delete Version Test",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)

        initial_version = warehouse.version

        # Soft delete
        service = WarehouseService(db_session)
        service.delete_by_code(
            "OPT009", end_date=date(2026, 12, 31), expected_version=initial_version
        )

        # Verify version incremented
        db_session.refresh(warehouse)
        assert warehouse.version == initial_version + 1
        assert warehouse.valid_to == date(2026, 12, 31)

        # Cleanup
        db_session.delete(warehouse)
        db_session.commit()
