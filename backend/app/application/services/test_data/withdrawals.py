import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import cast

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inventory_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import Customer, DeliveryPlace
from app.infrastructure.persistence.models.withdrawal_line_model import WithdrawalLine
from app.infrastructure.persistence.models.withdrawal_models import Withdrawal, WithdrawalType

from .scenarios.demand_patterns import DEMAND_PATTERN_SCENARIOS
from .utils import fake


def generate_withdrawals(
    db: Session,
    customers: list[Customer],
    delivery_places: list[DeliveryPlace],
    options: object = None,
):
    """Generate withdrawal history for some lots.

    Strategies:
    - Pick 20% of active lots
    - For each picked lot, create 1-2 withdrawal records
    - Vary the withdrawal_type and quantities
    """
    # Get ALL lots except inventory scenarios (which are for UI testing)
    lots = (
        db.query(LotReceipt)
        .filter(
            ~LotReceipt.origin_reference.like("inventory-scenario-%")
            | (LotReceipt.origin_reference.is_(None))
        )
        .all()
    )
    if not lots:
        return

    # Determine if we should use demand patterns
    include_patterns = False
    if options and hasattr(options, "include_demand_patterns") and options.include_demand_patterns:
        include_patterns = True

    if include_patterns:
        _generate_withdrawals_from_patterns(db, lots, customers, delivery_places)
        return

    # Default random strategy
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
                due_date=ship_date,  # Uses ship_date as due_date for test data
                reason=fake.sentence(nb_words=6),
                reference_number=fake.bothify(text="REF-#####"),
                withdrawn_at=datetime.combine(ship_date, datetime.min.time())
                + timedelta(hours=random.randint(9, 17)),
                cancelled_at=cancelled_at,
                cancelled_by=cancelled_by,
                cancel_reason=cancel_reason,
            )
            db.add(withdrawal)
            db.flush()  # Get ID

            # Create Withdrawal Line (Required for demand estimation)
            line = WithdrawalLine(
                withdrawal_id=withdrawal.id,
                lot_receipt_id=lot.id,
                quantity=qty,
            )
            db.add(line)

            # Update lot quantity (simulating manual withdrawal)
            if not is_cancelled:  # Only reduce if NOT cancelled
                lot.consumed_quantity += qty

            withdrawal_count += 1

    db.commit()
    print(f"[INFO] Generated {withdrawal_count} withdrawal history records")


def _generate_withdrawals_from_patterns(
    db: Session,
    lots: list[LotReceipt],
    customers: list[Customer],
    delivery_places: list[DeliveryPlace],
):
    """Generate withdrawals based on defined demand patterns."""
    # Group lots by product
    lots_by_product: dict[int, list[LotReceipt]] = {}
    for lot in lots:
        if lot.product_id not in lots_by_product:
            lots_by_product[lot.product_id] = []
        lots_by_product[lot.product_id].append(lot)

    today = date.today()
    patterns = list(DEMAND_PATTERN_SCENARIOS.keys())

    withdrawal_count = 0

    for _product_id, product_lots in lots_by_product.items():
        if not product_lots:
            continue

        # Assign a random pattern
        pattern_key = random.choice(patterns)
        scenario = DEMAND_PATTERN_SCENARIOS[pattern_key]

        # Determine parameters
        daily_demand = cast(int, scenario.get("daily_demand", scenario.get("base_demand", 10)))
        duration = cast(int, scenario.get("duration_days", 180))

        # Generate history for each day in duration
        for i in range(duration):
            # Working backwards from yesterday
            day_offset = duration - i
            current_date = today - timedelta(days=day_offset)

            # Skip future dates (shouldn't happen with this logic)
            if current_date >= today:
                continue

            # Calculate demand for this day based on scenario
            qty = Decimal(str(daily_demand))

            # Apply Noise/Variance
            variance = cast(float, scenario.get("variance", 0.1))
            noise = random.uniform(1.0 - variance, 1.0 + variance)
            qty = qty * Decimal(str(noise))

            # Apply Trend
            trend = cast(float, scenario.get("trend", 0))
            if trend != 0:
                # Simple linear trend: (1 + trend * months)
                months_passed = i / 30.0
                qty = qty * Decimal(str(1.0 + trend * months_passed))

            # Apply Seasonality
            peak_months = cast(list[int], scenario.get("peak_months", []))
            if peak_months and current_date.month in peak_months:
                factor = Decimal(str(scenario.get("peak_factor", 1.0)))
                qty = qty * factor

            # Apply Weekly Pattern
            day_factors = cast(dict[int, float], scenario.get("day_factors", {}))
            if day_factors:
                weekday = current_date.weekday()  # 0=Mon, 6=Sun
                factor = Decimal(str(day_factors.get(weekday, 1.0)))
                qty = qty * factor

            # Apply Spikes
            spike_days = cast(list[int], scenario.get("spike_days", []))
            # Map duration index to spike days approximately
            # (Simplification: just check if 'i' matches a spike day index)
            if i in spike_days:
                factor = Decimal(str(scenario.get("spike_factor", 1.0)))
                qty = qty * factor

            # Skip if low demand
            if qty < 1:
                continue

            # Round to 2 decimals
            qty = round(qty, 2)

            # Create Withdrawal
            target_lot = random.choice(product_lots)

            # Customer info
            customer_id = None
            delivery_place_id = None
            if customers:
                customer = random.choice(customers)
                customer_id = customer.id
                dps = [dp for dp in delivery_places if dp.customer_id == customer.id]
                if dps:
                    delivery_place_id = random.choice(dps).id

            withdrawal = Withdrawal(
                lot_id=None,
                quantity=None,
                withdrawal_type=WithdrawalType.ORDER_MANUAL,
                customer_id=customer_id,
                delivery_place_id=delivery_place_id,
                ship_date=current_date,
                due_date=current_date,
                reason=f"Scenario: {scenario['description']}",
                reference_number=f"SCEN-{pattern_key}-{i}",
                withdrawn_at=datetime.combine(current_date, datetime.min.time())
                + timedelta(hours=12),
            )
            db.add(withdrawal)
            db.flush()

            line = WithdrawalLine(
                withdrawal_id=withdrawal.id,
                lot_receipt_id=target_lot.id,
                quantity=qty,
            )
            db.add(line)

            target_lot.consumed_quantity += qty

            withdrawal_count += 1

    db.commit()
    print(f"[INFO] Generated {withdrawal_count} withdrawal history records from patterns")
