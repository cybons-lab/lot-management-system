import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.masters_models import Customer, CustomerItem, DeliveryPlace, Product
from app.models.orders_models import Order, OrderLine

from .utils import fake


def generate_orders(
    db: Session,
    customers: list[Customer],
    products: list[Product],
    products_with_forecast: list[Product],
    delivery_places: list[DeliveryPlace],
):
    # 1 Customer is "Perfect Scenario"
    perfect_customer = customers[0]

    dp_map = {c.id: [dp for dp in delivery_places if dp.customer_id == c.id] for c in customers}

    # Build customer-product mapping from CustomerItem
    customer_products_map = {}
    customer_items = db.query(CustomerItem).all()
    for ci in customer_items:
        if ci.customer_id not in customer_products_map:
            customer_products_map[ci.customer_id] = []
        customer_products_map[ci.customer_id].append(ci.product_id)

    # Generate 50-80 orders total (spread across all products, not per product)
    total_orders = random.randint(50, 80)

    for _ in range(total_orders):
        # Pick customer
        c = random.choice(customers)

        # Only pick products that this customer deals with
        available_product_ids = customer_products_map.get(c.id, [])
        if not available_product_ids:
            continue

        # Pick random product from available ones
        p_id = random.choice(available_product_ids)
        p = next((prod for prod in products if prod.id == p_id), None)
        if not p:
            continue

        dps = dp_map.get(c.id, [])
        if not dps:
            continue
        dp = random.choice(dps)

        # CRITICAL: delivery_place must always be set (never NULL)
        # This ensures "納入先未設定" does not occur
        if not dp or not dp.id:
            continue

        is_perfect = c.id == perfect_customer.id

        # Base date and quantity
        has_forecast = p in products_with_forecast

        order_date = date.today() + timedelta(days=random.randint(1, 60))
        qty = Decimal(random.randint(20, 120))

        if has_forecast and is_perfect:
            pass

        if not is_perfect:
            # Apply anomalies
            anomaly = random.choices(
                [
                    "normal",
                    "early",
                    "late",
                    "qty_mismatch",
                    "wrong_dp",
                    "steal",
                    "no_stock",
                    "no_fc",
                ],
                weights=[50, 10, 10, 10, 5, 5, 5, 5],
                k=1,
            )[0]

            if anomaly == "early":
                order_date -= timedelta(days=random.randint(1, 3))
            elif anomaly == "late":
                order_date += timedelta(days=random.randint(1, 3))
            elif anomaly == "qty_mismatch":
                qty = qty * Decimal(random.uniform(0.8, 1.5))

        # Create Order
        o = Order(
            order_number=fake.unique.bothify(text="ORD-########"),
            customer_id=c.id,
            order_date=date.today(),
        )
        db.add(o)
        db.flush()

        # Create OrderLine with delivery_place_id (NEVER NULL)
        ol = OrderLine(
            order_id=o.id,
            product_id=p.id,
            delivery_date=order_date,
            order_quantity=qty,
            unit="pcs",
            delivery_place_id=dp.id,  # CRITICAL: Always set
            status="pending",
        )
        db.add(ol)

    db.commit()
