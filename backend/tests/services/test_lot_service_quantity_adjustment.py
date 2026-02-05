"""Tests for LotService quantity adjustment functionality (Phase 11)."""

from datetime import date
from decimal import Decimal

import pytest

from app.application.services.inventory.lot_service import LotService
from app.domain.lot import LotNotFoundError
from app.infrastructure.persistence.models.inventory_models import Adjustment, AdjustmentType


class TestLotServiceQuantityAdjustment:
    """Test lot quantity adjustment with mandatory reason."""

    def test_adjust_quantity_increase_success(self, db, master_data):
        """Test successful quantity increase with reason."""
        service = LotService(db)
        data = master_data
        user = data["user"]
        prod = data["product1"]
        wh = data["warehouse"]
        sup = data["supplier"]

        from app.infrastructure.persistence.models import LotReceipt
        from app.infrastructure.persistence.models.lot_master_model import LotMaster

        lm = LotMaster(supplier_item_id=prod.id, supplier_id=sup.id, lot_number="TEST-ADJUST-1")
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

        new_qty = Decimal("1200")
        reason = "入庫伝票の入力ミス修正"

        adjustment_id = service.update_lot_receipt_quantity_with_reason(
            lot_receipt_id=lot.id, new_quantity=new_qty, reason=reason, user_id=user.id
        )

        # Verify lot record updated
        db.refresh(lot)
        assert lot.received_quantity == new_qty

        # Verify adjustment record created
        adjustment = db.query(Adjustment).filter(Adjustment.id == adjustment_id).first()
        assert adjustment is not None
        assert adjustment.adjusted_quantity == Decimal("200")
        assert adjustment.reason == reason
        assert adjustment.adjusted_by == user.id
        assert adjustment.adjustment_type == AdjustmentType.OTHER

    def test_adjust_quantity_decrease_success(self, db, master_data):
        """Test successful quantity decrease with reason."""
        service = LotService(db)
        data = master_data
        user = data["user"]
        prod = data["product1"]
        wh = data["warehouse"]
        sup = data["supplier"]

        from app.infrastructure.persistence.models import LotReceipt
        from app.infrastructure.persistence.models.lot_master_model import LotMaster

        lm = LotMaster(supplier_item_id=prod.id, supplier_id=sup.id, lot_number="TEST-ADJUST-2")
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

        new_qty = Decimal("800")
        reason = "破損につき調整"

        adjustment_id = service.update_lot_receipt_quantity_with_reason(
            lot_receipt_id=lot.id, new_quantity=new_qty, reason=reason, user_id=user.id
        )

        db.refresh(lot)
        assert lot.received_quantity == new_qty

        adjustment = db.query(Adjustment).filter(Adjustment.id == adjustment_id).first()
        assert adjustment.adjusted_quantity == Decimal("-200")

    def test_adjust_quantity_lot_not_found(self, db, master_data):
        """Test error when lot doesn't exist."""
        service = LotService(db)
        user = master_data["user"]

        with pytest.raises(LotNotFoundError):
            service.update_lot_receipt_quantity_with_reason(
                lot_receipt_id=99999, new_quantity=Decimal("100"), reason="test", user_id=user.id
            )

    def test_adjust_quantity_empty_reason(self, db, master_data):
        """Test error when reason is empty."""
        service = LotService(db)
        data = master_data
        user = data["user"]
        prod = data["product1"]
        wh = data["warehouse"]
        sup = data["supplier"]

        from app.infrastructure.persistence.models import LotReceipt
        from app.infrastructure.persistence.models.lot_master_model import LotMaster

        lm = LotMaster(supplier_item_id=prod.id, supplier_id=sup.id, lot_number="TEST-ADJUST-EMPTY")
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

        with pytest.raises(ValueError, match="調整理由は必須です"):
            service.update_lot_receipt_quantity_with_reason(
                lot_receipt_id=lot.id, new_quantity=Decimal("100"), reason="", user_id=user.id
            )

    def test_adjust_quantity_negative_value(self, db, master_data):
        """Test error when new quantity is negative."""
        service = LotService(db)
        data = master_data
        user = data["user"]
        prod = data["product1"]
        wh = data["warehouse"]
        sup = data["supplier"]

        from app.infrastructure.persistence.models import LotReceipt
        from app.infrastructure.persistence.models.lot_master_model import LotMaster

        lm = LotMaster(supplier_item_id=prod.id, supplier_id=sup.id, lot_number="TEST-ADJUST-NEG")
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

        with pytest.raises(ValueError, match="入庫数は0以上の値を指定してください"):
            service.update_lot_receipt_quantity_with_reason(
                lot_receipt_id=lot.id,
                new_quantity=Decimal("-100"),
                reason="Negative quantity test",
                user_id=user.id,
            )
