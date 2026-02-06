"""Inventory adjustment test data generator."""

import random
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.inventory_models import Adjustment
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt


def generate_adjustments(db: Session) -> None:
    """Generate Adjustment (在庫調整) test data.

    Adjustments represent inventory corrections:
    - Positive: Found inventory (棚卸差異プラス)
    - Negative: Damage, expiry, loss (破損・期限切れ廃棄)
    """
    lot_receipts = db.query(LotReceipt).limit(20).all()
    users = db.query(User).all()

    if not lot_receipts or not users:
        return

    num_adjustments = random.randint(10, 30)

    for _ in range(num_adjustments):
        lot_receipt = random.choice(lot_receipts)
        user = random.choice(users)

        # 60% negative (loss), 30% positive (found), 10% physical_count
        adjustment_type = random.choices(
            ["damage", "found", "physical_count"], weights=[60, 30, 10], k=1
        )[0]

        if adjustment_type == "damage":
            max_qty = min(50, int(float(lot_receipt.received_quantity) * 0.5))
            quantity = Decimal(-random.randint(1, max(1, max_qty)))
            reason = "破損による廃棄"
        elif adjustment_type == "found":
            quantity = Decimal(random.randint(1, 30))
            reason = "棚卸しで発見"
        else:
            quantity = Decimal(0)
            reason = "棚卸確認"

        adjusted_at = datetime.now(UTC) - timedelta(days=random.randint(0, 90))

        adjustment = Adjustment(
            lot_id=lot_receipt.id,
            adjustment_type=adjustment_type,
            adjusted_quantity=quantity,
            reason=reason,
            adjusted_by=user.id,
            adjusted_at=adjusted_at,
        )
        db.add(adjustment)

    # Edge case: Large adjustment
    if lot_receipts and users:
        large_adjustment = Adjustment(
            lot_id=lot_receipts[0].id,
            adjustment_type="damage",
            adjusted_quantity=Decimal(-500),
            reason="大量破損による廃棄 (Edge case: large quantity)",
            adjusted_by=users[0].id,
            adjusted_at=datetime.now(UTC),
        )
        db.add(large_adjustment)

    db.commit()
