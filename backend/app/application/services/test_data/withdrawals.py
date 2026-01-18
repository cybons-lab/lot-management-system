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

    # Determine history length from options
    history_months = 6
    if options and hasattr(options, "history_months"):
        history_months = options.history_months

    # Default random strategy
    # Select 90% of lots to have history
    selected_lots = random.sample(lots, int(len(lots) * 0.9))
    today = date.today()

    withdrawal_count = 0

    for lot in selected_lots:
        # Determine number of withdrawals based on history length and randomness
        # E.g., 3-10 per year per lot for small items, maybe more for active ones
        # Use history_months to scale

        # Base count: 0.5 to 2.0 per month
        avg_per_month = random.uniform(0.5, 2.0)
        num_records = int(avg_per_month * history_months)
        if num_records < 1:
            num_records = 1

        # Max cap to avoid too many DB records in huge tests unless stressed
        if num_records > 50 and (not options or getattr(options, "scale", "small") != "large"):
            num_records = 50

        # Generate timestamps distributed over history_months
        # Create a list of relative days ago
        max_days = history_months * 30
        days_ago_list = [random.randint(1, max_days) for _ in range(num_records)]
        days_ago_list.sort(reverse=True)  # Oldest first

        for days_ago in days_ago_list:
            if lot.current_quantity <= 0:
                break

            # Withdrawal type distribution
            # Definition Order: ORDER_MANUAL, INTERNAL_USE, DISPOSAL, RETURN, SAMPLE, OTHER
            # Target Dist: ORDER_MANUAL: 50%, INTERNAL: 20%, SAMPLE: 15%, Others: rest
            w_type = random.choices(list(WithdrawalType), weights=[50, 20, 5, 5, 15, 5], k=1)[0]

            # Determine quantity (2-10% of current limit)
            # Small withdrawals to allow multiple history records
            max_w_qty = float(lot.current_quantity) * 0.1
            if max_w_qty < 1.0:
                max_w_qty = float(lot.current_quantity)  # Take all if small (depletes it)

            # Lower bound 1 or 0.1
            min_qty = 1.0
            if max_w_qty < 1.0:
                min_qty = max_w_qty

            qty = Decimal(str(round(random.uniform(min_qty, max_w_qty), 2)))

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

            ship_date = today - timedelta(days=days_ago)

            # 5% Cancellation chance (reduced from 10%)
            is_cancelled = random.random() < 0.05
            cancelled_at = None
            cancelled_by = None
            cancel_reason = None

            if is_cancelled:
                cancelled_at = datetime.utcnow()
                cancelled_by = 1  # Admin
                cancel_reason = "Test data cancellation"

            withdrawal = Withdrawal(
                lot_id=lot.id,
                quantity=qty,
                withdrawal_type=w_type,
                customer_id=customer_id,
                delivery_place_id=delivery_place_id,
                ship_date=ship_date,
                due_date=ship_date,
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

            # Create Withdrawal Line
            line = WithdrawalLine(
                withdrawal_id=withdrawal.id,
                lot_receipt_id=lot.id,
                quantity=qty,
            )
            db.add(line)

            # Update lot quantity (simulating manual withdrawal)
            if not is_cancelled:  # Only reduce if NOT cancelled
                lot.consumed_quantity += qty
                # Note: lot.current_quantity is a property (received - consumed - allocated)
                # So updating consumed_quantity updates current_quantity.

            withdrawal_count += 1

    db.commit()
    print(
        f"[INFO] Generated {withdrawal_count} withdrawal history records over {history_months} months"
    )


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
