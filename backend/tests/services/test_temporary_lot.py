"""Tests for temporary lot registration feature.

仮入庫対応:
- lot_number が空/None の場合、TMP-YYYYMMDD-XXXX 形式の暫定番号が自動生成される
- temporary_lot_key に UUID が付与される
"""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.services.inventory.lot_service import LotService
from app.infrastructure.persistence.models import Lot, Product, Warehouse
from app.presentation.schemas.inventory.inventory_schema import LotCreate


class TestTemporaryLotRegistration:
    """Tests for temporary lot registration (仮入庫対応)."""

    @pytest.fixture
    def product(self, db: Session) -> Product:
        """Create a test product."""
        product = Product(
            id=99001,
            maker_part_code="TEST-PROD-001",
            product_name="Test Product for Temp Lot",
            base_unit="PCS",
            internal_unit="PCS",
            external_unit="PCS",
        )
        db.add(product)
        db.commit()
        return product

    @pytest.fixture
    def warehouse(self, db: Session) -> Warehouse:
        """Create a test warehouse."""
        warehouse = Warehouse(
            id=99001,
            warehouse_code="TEST-WH-001",
            warehouse_name="Test Warehouse for Temp Lot",
            warehouse_type="internal",
        )
        db.add(warehouse)
        db.commit()
        return warehouse

    def test_create_lot_with_empty_lot_number_generates_temporary(
        self, db: Session, product: Product, warehouse: Warehouse
    ):
        """Test that empty lot_number generates TMP-format lot number and UUID key."""
        service = LotService(db)

        # Create lot without lot_number (empty string triggers temporary lot)
        lot_create = LotCreate(
            lot_number="",  # Empty triggers temporary lot
            product_id=product.id,
            warehouse_id=warehouse.id,
            received_date=date.today(),
            unit="PCS",
            current_quantity=Decimal("100"),
        )

        response = service.create_lot(lot_create)

        # Verify TMP-format lot number
        assert response.lot_number.startswith("TMP-"), (
            f"Expected TMP- prefix, got {response.lot_number}"
        )

        # Verify format: TMP-YYYYMMDD-XXXXXXXX
        parts = response.lot_number.split("-")
        assert len(parts) == 3, f"Expected 3 parts in TMP lot number, got {parts}"
        assert parts[0] == "TMP"
        assert len(parts[1]) == 8, f"Expected 8-digit date, got {parts[1]}"  # YYYYMMDD
        assert len(parts[2]) == 8, (
            f"Expected 8-char UUID prefix, got {parts[2]}"
        )  # UUID first 8 chars

        # Verify temporary_lot_key is set (UUID format)
        assert response.temporary_lot_key is not None
        assert "-" in response.temporary_lot_key, "Expected UUID format with dashes"

        # Verify lot is in database
        db_lot = db.query(Lot).filter(Lot.id == response.id).first()
        assert db_lot is not None
        assert db_lot.temporary_lot_key is not None

    def test_create_lot_with_normal_lot_number_no_temporary_key(
        self, db: Session, product: Product, warehouse: Warehouse
    ):
        """Test that normal lot_number does not generate temporary_lot_key."""
        service = LotService(db)

        # Create lot with explicit lot_number
        lot_create = LotCreate(
            lot_number="NORMAL-LOT-001",
            product_id=product.id,
            warehouse_id=warehouse.id,
            received_date=date.today(),
            unit="PCS",
            current_quantity=Decimal("100"),
        )

        response = service.create_lot(lot_create)

        # Verify lot number is as specified
        assert response.lot_number == "NORMAL-LOT-001"

        # Verify no temporary_lot_key
        assert response.temporary_lot_key is None

    def test_temporary_lot_key_is_unique(self, db: Session, product: Product, warehouse: Warehouse):
        """Test that each temporary lot gets a unique UUID key."""
        service = LotService(db)

        # Create multiple temporary lots
        keys = []
        lot_numbers = []

        for i in range(3):
            lot_create = LotCreate(
                lot_number="",  # Empty triggers temporary lot
                product_id=product.id,
                warehouse_id=warehouse.id,
                received_date=date.today(),
                unit="PCS",
                current_quantity=Decimal(f"{(i + 1) * 10}"),
            )

            response = service.create_lot(lot_create)
            keys.append(response.temporary_lot_key)
            lot_numbers.append(response.lot_number)

        # Verify all keys are unique
        assert len(set(keys)) == 3, "All temporary_lot_keys should be unique"

        # Verify all lot numbers are unique
        assert len(set(lot_numbers)) == 3, "All lot_numbers should be unique"


class TestTemporaryLotUpdate:
    """Tests for updating temporary lots to official lot numbers."""

    @pytest.fixture
    def temp_lot(self, db: Session) -> Lot:
        """Create a temporary lot for testing."""
        # First ensure we have product and warehouse
        product = db.query(Product).filter(Product.id == 99002).first()
        if not product:
            product = Product(
                id=99002,
                maker_part_code="TEST-PROD-002",
                product_name="Test Product 2",
                base_unit="PCS",
                internal_unit="PCS",
                external_unit="PCS",
            )
            db.add(product)

        warehouse = db.query(Warehouse).filter(Warehouse.id == 99002).first()
        if not warehouse:
            warehouse = Warehouse(
                id=99002,
                warehouse_code="TEST-WH-002",
                warehouse_name="Test Warehouse 2",
                warehouse_type="internal",
            )
            db.add(warehouse)

        db.commit()

        # Create temporary lot via service
        service = LotService(db)
        lot_create = LotCreate(
            lot_number="",
            product_id=product.id,
            warehouse_id=warehouse.id,
            received_date=date.today(),
            unit="PCS",
            current_quantity=Decimal("50"),
        )
        response = service.create_lot(lot_create)

        return db.query(Lot).filter(Lot.id == response.id).first()

    def test_update_temporary_lot_to_official(self, db: Session, temp_lot: Lot):
        """Test updating a temporary lot number to an official one."""
        from app.presentation.schemas.inventory.inventory_schema import LotUpdate

        service = LotService(db)

        # Verify it's a temporary lot
        assert temp_lot.lot_number.startswith("TMP-")
        original_temp_key = str(temp_lot.temporary_lot_key)

        # Update to official lot number
        update = LotUpdate(lot_number="OFFICIAL-LOT-001")
        response = service.update_lot(temp_lot.id, update)

        # Verify lot number is updated
        assert response.lot_number == "OFFICIAL-LOT-001"

        # Verify temporary_lot_key is preserved (for traceability)
        assert response.temporary_lot_key == original_temp_key
