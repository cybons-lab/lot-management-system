"""Inventory adjustment test data generator."""

import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inventory_models import Adjustment
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import Warehouse


def generate_adjustments(db: Session) -> None:
    """Generate Adjustment (在庫調整) test data.

    Adjustments represent inventory corrections:
    - Positive: Found inventory (棚卸差異プラス)
    - Negative: Damage, expiry, loss (破損・期限切れ廃棄)
    """
    # Get existing lots for adjustment
    lot_receipts = db.query(LotReceipt).limit(20).all()
    warehouses = db.query(Warehouse).all()

    if not lot_receipts or not warehouses:
        return

    # Generate 10-30 adjustments
    num_adjustments = random.randint(10, 30)

    for _ in range(num_adjustments):
        lot_receipt = random.choice(lot_receipts)
        warehouse = random.choice(warehouses)

        # 60% negative (loss), 30% positive (found), 10% zero (confirmation)
        adjustment_type = random.choices(
            ["negative", "positive", "zero"], weights=[60, 30, 10], k=1
        )[0]

        if adjustment_type == "negative":
            # Loss: 1-50 units or 10-50% of current quantity
            max_qty = min(50, int(float(lot_receipt.received_quantity) * 0.5))
            quantity = Decimal(-random.randint(1, max(1, max_qty)))
            reason = random.choice(["damage", "expiry", "loss"])
        elif adjustment_type == "positive":
            # Found: 1-30 units
            quantity = Decimal(random.randint(1, 30))
            reason = "inventory_count"
        else:
            # Zero adjustment (confirmation record)
            quantity = Decimal(0)
            reason = "inventory_count"

        # Adjustment date: within last 90 days
        adjustment_date = date.today() - timedelta(days=random.randint(0, 90))

        # Notes for some adjustments
        notes = None
        if random.random() < 0.4:
            notes = f"{reason}による調整 ({adjustment_date})"

        adjustment = Adjustment(
            lot_receipt_id=lot_receipt.id,
            warehouse_id=warehouse.id,
            adjusted_quantity=quantity,
            reason=reason,
            notes=notes,
            adjustment_date=adjustment_date,
        )
        db.add(adjustment)

    # Edge cases
    # Large adjustment
    if lot_receipts:
        large_adjustment = Adjustment(
            lot_receipt_id=lot_receipts[0].id,
            warehouse_id=warehouses[0].id,
            adjusted_quantity=Decimal(-500),
            reason="damage",
            notes="大量破損による廃棄 (Edge case: large quantity)",
            adjustment_date=date.today(),
        )
        db.add(large_adjustment)

    db.commit()
