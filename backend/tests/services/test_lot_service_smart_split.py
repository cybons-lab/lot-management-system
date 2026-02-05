"""Tests for LotService smart split functionality (Phase 10.3)."""

from datetime import date
from decimal import Decimal

import pytest

from app.application.services.inventory.lot_service import LotService
from app.domain.lot import LotNotFoundError
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion


class TestLotServiceSmartSplit:
    """Test smart split with allocation transfer."""

    def test_smart_split_2_lots_success(self, db, master_data):
        """Test successful 2-way split with allocation transfer."""
        service = LotService(db)
        data = master_data
        user = data["user"]
        prod = data["product1"]
        wh = data["warehouse"]
        sup = data["supplier"]

        # Create a sample lot receipt
        from app.infrastructure.persistence.models import LotReceipt
        from app.infrastructure.persistence.models.lot_master_model import LotMaster

        lm = LotMaster(
            supplier_item_id=prod.id, supplier_id=sup.id, lot_number="TEST-SMART-SPLIT-1"
        )
        db.add(lm)
        db.flush()

        lot = LotReceipt(
            lot_master_id=lm.id,
            warehouse_id=wh.id,
            supplier_id=sup.id,
            supplier_item_id=prod.id,
            received_date=date.today(),
            received_quantity=Decimal("1000"),
            unit="EA",
            origin_type="order",
        )
        db.add(lot)
        db.flush()

        allocation = AllocationSuggestion(
            lot_id=lot.id,
            delivery_place_id=data["delivery_place"].id,
            customer_id=data["customer"].id,
            supplier_item_id=prod.id,
            forecast_period="2026-02-10",
            quantity=Decimal("100"),
            allocation_type="soft",
            source="test",
        )
        db.add(allocation)
        db.flush()

        allocation_transfers = [
            {
                "lot_id": lot.id,
                "delivery_place_id": data["delivery_place"].id,
                "customer_id": data["customer"].id,
                "forecast_period": "2026-02-10",
                "quantity": Decimal("100"),
                "target_lot_index": 1,  # Move to the second lot
            }
        ]

        new_lot_ids, split_quantities, transferred_count = service.smart_split_lot_with_allocations(
            lot_receipt_id=lot.id,
            split_count=2,
            allocation_transfers=allocation_transfers,
            user_id=user.id,
        )

        assert len(new_lot_ids) == 2
        assert len(split_quantities) == 2
        # Original lot gets remaining (1000 - 100 = 900)
        assert split_quantities[0] == Decimal("900")
        assert split_quantities[1] == Decimal("100")
        assert transferred_count == 1

        # Verify allocation was transferred
        updated_alloc = (
            db.query(AllocationSuggestion).filter(AllocationSuggestion.id == allocation.id).first()
        )
        assert updated_alloc.lot_id == new_lot_ids[1]

    def test_smart_split_3_lots_success(self, db, master_data):
        """Test successful 3-way split with multiple allocation transfers."""
        service = LotService(db)
        data = master_data
        user = data["user"]
        prod = data["product1"]
        wh = data["warehouse"]
        sup = data["supplier"]

        from app.infrastructure.persistence.models import LotReceipt
        from app.infrastructure.persistence.models.lot_master_model import LotMaster

        lm = LotMaster(
            supplier_item_id=prod.id, supplier_id=sup.id, lot_number="TEST-SMART-SPLIT-2"
        )
        db.add(lm)
        db.flush()

        lot = LotReceipt(
            lot_master_id=lm.id,
            warehouse_id=wh.id,
            supplier_id=sup.id,
            supplier_item_id=prod.id,
            received_date=date.today(),
            received_quantity=Decimal("1000"),
            unit="EA",
            origin_type="order",
        )
        db.add(lot)
        db.flush()

        alloc1 = AllocationSuggestion(
            lot_id=lot.id,
            delivery_place_id=data["delivery_place"].id,
            customer_id=data["customer"].id,
            supplier_item_id=prod.id,
            forecast_period="2026-02-10",
            quantity=Decimal("100"),
            allocation_type="soft",
            source="test",
        )
        alloc2 = AllocationSuggestion(
            lot_id=lot.id,
            delivery_place_id=data["delivery_place"].id,
            customer_id=data["customer"].id,
            supplier_item_id=prod.id,
            forecast_period="2026-02-15",
            quantity=Decimal("150"),
            allocation_type="soft",
            source="test",
        )
        db.add_all([alloc1, alloc2])
        db.flush()

        allocation_transfers = [
            {
                "lot_id": lot.id,
                "delivery_place_id": data["delivery_place"].id,
                "customer_id": data["customer"].id,
                "forecast_period": "2026-02-10",
                "quantity": Decimal("100"),
                "target_lot_index": 1,
            },
            {
                "lot_id": lot.id,
                "delivery_place_id": data["delivery_place"].id,
                "customer_id": data["customer"].id,
                "forecast_period": "2026-02-15",
                "quantity": Decimal("150"),
                "target_lot_index": 2,
            },
        ]

        new_lot_ids, split_quantities, transferred_count = service.smart_split_lot_with_allocations(
            lot_receipt_id=lot.id,
            split_count=3,
            allocation_transfers=allocation_transfers,
            user_id=user.id,
        )

        assert len(new_lot_ids) == 3
        assert split_quantities[0] == Decimal("750")  # 1000 - 100 - 150
        assert split_quantities[1] == Decimal("100")
        assert split_quantities[2] == Decimal("150")
        assert transferred_count == 2

    def test_smart_split_lot_not_found(self, db, master_data):
        """Test error when lot doesn't exist."""
        service = LotService(db)
        user = master_data["user"]

        with pytest.raises(LotNotFoundError):
            service.smart_split_lot_with_allocations(
                lot_receipt_id=99999,
                split_count=2,
                allocation_transfers=[],
                user_id=user.id,
            )

    def test_smart_split_quantity_exceeds(self, db, master_data):
        """Test error when allocation total exceeds current quantity."""
        service = LotService(db)
        data = master_data
        user = data["user"]
        prod = data["product1"]
        wh = data["warehouse"]
        sup = data["supplier"]

        from app.infrastructure.persistence.models import LotReceipt
        from app.infrastructure.persistence.models.lot_master_model import LotMaster

        lm = LotMaster(
            supplier_item_id=prod.id, supplier_id=sup.id, lot_number="TEST-SMART-SPLIT-EXCEED"
        )
        db.add(lm)
        db.flush()

        lot = LotReceipt(
            lot_master_id=lm.id,
            warehouse_id=wh.id,
            supplier_id=sup.id,
            supplier_item_id=prod.id,
            received_date=date.today(),
            received_quantity=Decimal("100"),
            unit="EA",
            origin_type="order",
        )
        db.add(lot)
        db.flush()

        allocation_transfers = [
            {
                "lot_id": lot.id,
                "delivery_place_id": data["delivery_place"].id,
                "customer_id": data["customer"].id,
                "forecast_period": "2026-02-10",
                "quantity": Decimal("200"),  # Exceeds 100
                "target_lot_index": 1,
            },
        ]

        with pytest.raises(ValueError, match="を超えています"):
            service.smart_split_lot_with_allocations(
                lot_receipt_id=lot.id,
                split_count=2,
                allocation_transfers=allocation_transfers,
                user_id=user.id,
            )

    def test_smart_split_zero_quantity_error(self, db, master_data):
        """Test error when one of the splits has zero quantity."""
        service = LotService(db)
        data = master_data
        user = data["user"]
        prod = data["product1"]
        wh = data["warehouse"]
        sup = data["supplier"]

        from app.infrastructure.persistence.models import LotReceipt
        from app.infrastructure.persistence.models.lot_master_model import LotMaster

        lm = LotMaster(
            supplier_item_id=prod.id, supplier_id=sup.id, lot_number="TEST-SMART-SPLIT-ZERO"
        )
        db.add(lm)
        db.flush()

        lot = LotReceipt(
            lot_master_id=lm.id,
            warehouse_id=wh.id,
            supplier_id=sup.id,
            supplier_item_id=prod.id,
            received_date=date.today(),
            received_quantity=Decimal("100"),
            unit="EA",
            origin_type="order",
        )
        db.add(lot)
        db.flush()

        # Only original lot index (0) will have quantity if no allocations for index 1
        allocation_transfers = []

        with pytest.raises(ValueError, match="すべての分割ロットに数量を割り当ててください"):
            service.smart_split_lot_with_allocations(
                lot_receipt_id=lot.id,
                split_count=2,
                allocation_transfers=allocation_transfers,
                user_id=user.id,
            )
