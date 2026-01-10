import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inventory_models import Lot
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
    lots = db.query(Lot).filter(Lot.status == "active").all()
    if not lots:
        return

    selected_lots = random.sample(lots, int(len(lots) * 0.2))
    today = date.today()

    withdrawal_count = 0

    for lot in selected_lots:
        # Create 1-2 withdrawals per lot
        num_records = random.randint(1, 2)

        for _ in range(num_records):
            if lot.current_quantity <= 0:
                break

            # Withdrawal type distribution
            w_type = random.choices(list(WithdrawalType), weights=[20, 30, 20, 10, 15, 5], k=1)[0]

            # Determine quantity (10-30% of current or max 50)
            max_w_qty = float(lot.current_quantity) * 0.3
            qty = Decimal(str(round(random.uniform(1, max(1.1, max_w_qty)), 2)))

            if qty > lot.current_quantity:
                qty = lot.current_quantity

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
            )
            db.add(withdrawal)

            # Update lot quantity (simulating manual withdrawal)
            lot.current_quantity -= qty
            withdrawal_count += 1

    db.commit()
    print(f"[INFO] Generated {withdrawal_count} withdrawal history records")
