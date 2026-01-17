import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inventory_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import Customer, DeliveryPlace
from app.infrastructure.persistence.models.withdrawal_models import Withdrawal, WithdrawalType

from .utils import fake


def generate_withdrawals(
    db: Session, customers: list[Customer], delivery_places: list[DeliveryPlace]
):
    """Generate withdrawal history for some lots.

    Strategies:
    - Pick 20% of active lots
    - For each picked lot, create 1-2 withdrawal records
    - Vary the withdrawal_type and quantities
    """
    lots = db.query(LotReceipt).all()  # Get ALL lots (even depleted/expired/etc should have history)
    if not lots:
        return

    # Select 90% of lots to have history
    selected_lots = random.sample(lots, int(len(lots) * 0.9))
    today = date.today()

    withdrawal_count = 0

    for lot in selected_lots:
        # Create 1-4 withdrawals per lot
        num_records = random.randint(1, 4)

        for _ in range(num_records):
            # If depleted/0 qty, we can still have history (it explains why it is 0)
            # If active, we should check we don't withdraw more than available IF we update current_quantity
            # However, for test data history generation (past events), we can assume they happened.
            # But the current_quantity should reflect them.
            # If current_quantity is already set by inventory strategy, we should be careful.
            # Inventory strategy sets the *current* state.
            # So withdrawal history generation should either:
            # 1. Be "past" history that already resulted in the current state (complex to calc backwards)
            # 2. Be "extra" history for depleted lots, or just records that don't affect current qty (if assumed already processed)
            # 3. Or we subtract from current_qty.

            # The previous implementation subtracted from lots.current_quantity (lines 78).
            # This implies the inventory.py created the "start" quantity, and this reduces it.
            # For "Depleted" lots created with 0 qty in inventory.py, we can't subtract.
            # So for Depleted lots, we probably shouldn't create withdrawals that *reduce* quantity further (impossible).
            # We can create withdrawals that *explain* the depletion if we started with >0.
            # But here we assume the lot object has the Final state from inventory.py?
            # Yes, db.commit() was called in inventory.py.

            # Strategy: Only withdraw from lots that have quantity > 0.
            # For depleted lots, we skip generating *reducing* withdrawals,
            # OR we imply they were generated *after* depletion? No.

            if lot.current_quantity <= 0:
                # If lot is depleted/0, maybe add a "history" record that brought it to 0?
                # But we don't know the starting qty.
                # Let's skip depletion logic complexity and just withdraw from active lots with > 0 qty.
                break

            # Withdrawal type distribution
            w_type = random.choices(list(WithdrawalType), weights=[20, 30, 20, 10, 15, 5], k=1)[0]

            # Determine quantity (10-30% of current or max 50)
            max_w_qty = float(lot.current_quantity) * 0.5
            if max_w_qty < 1.0:
                max_w_qty = float(lot.current_quantity)  # Take all if small

            qty = Decimal(str(round(random.uniform(1, max(1.1, max_w_qty)), 2)))

            if qty > lot.current_quantity:
                qty = lot.current_quantity

            if qty <= 0:
                continue

            # For some types, assign customer/delivery place
            customer_id = None
            delivery_place_id = None
            if w_type in [WithdrawalType.ORDER_MANUAL, WithdrawalType.SAMPLE]:
                customer = random.choice(customers)
                customer_id = customer.id
                dps = [dp for dp in delivery_places if dp.customer_id == customer.id]
                if dps:
                    delivery_place_id = random.choice(dps).id

            ship_date = today - timedelta(days=random.randint(1, 60))

            # 10% Cancellation chance
            is_cancelled = random.random() < 0.1
            cancelled_at = None
            cancelled_by = None
            cancel_reason = None

            if is_cancelled:
                cancelled_at = datetime.utcnow()
                cancelled_by = 1  # Admin
                cancel_reason = "Test data cancellation"
                # If cancelled, it technically returns to stock.
                # So we shouldn't subtract from current_quantity IF it is cancelled.
                # Or rather, we subtract, then add back?
                # Simplest: If cancelled, do NOT subtract from current_quantity logic below.

            withdrawal = Withdrawal(
                lot_id=lot.id,
                quantity=qty,
                withdrawal_type=w_type,
                customer_id=customer_id,
                delivery_place_id=delivery_place_id,
                ship_date=ship_date,
                reason=fake.sentence(nb_words=6),
                reference_number=fake.bothify(text="REF-#####"),
                withdrawn_at=datetime.combine(ship_date, datetime.min.time())
                + timedelta(hours=random.randint(9, 17)),
                cancelled_at=cancelled_at,
                cancelled_by=cancelled_by,
                cancel_reason=cancel_reason,
            )
            db.add(withdrawal)

            # Update lot quantity (simulating manual withdrawal)
            if not is_cancelled:  # Only reduce if NOT cancelled
                lot.current_quantity -= qty

            withdrawal_count += 1

    db.commit()
    print(f"[INFO] Generated {withdrawal_count} withdrawal history records")
