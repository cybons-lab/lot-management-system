import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.forecast_models import ForecastCurrent
from app.models.masters_models import Customer, DeliveryPlace, Product
from app.models.orders_models import Order, OrderLine

from .utils import fake


def generate_orders(
    db: Session,
    customers: list[Customer],
    products: list[Product],
    products_with_forecast: list[Product],
    delivery_places: list[DeliveryPlace],
):
    """Generate orders based on forecast data.

    Strategy:
    - Query daily forecasts from forecast_current table
    - For each forecast entry, create an order line with:
      - delivery_date = forecast_date
      - quantity ≈ forecast_quantity (with variance)
    - 80% normal scenario, 20% anomaly scenarios
    """
    # 1 Customer is "Perfect Scenario" - no anomalies
    perfect_customer = customers[0]

    # Get all daily forecasts (where forecast_date is set)
    forecasts = (
        db.query(ForecastCurrent)
        .filter(
            ForecastCurrent.forecast_date.isnot(None),
            ForecastCurrent.forecast_quantity > 0,
        )
        .all()
    )

    print(f"[INFO] Found {len(forecasts)} daily forecasts to generate orders from")

    # Group forecasts: create one order per (customer, date) with multiple lines
    # Key: (customer_id, order_date) -> list of forecasts
    order_groups: dict[tuple[int, date], list[ForecastCurrent]] = {}

    for fc in forecasts:
        key = (fc.customer_id, fc.forecast_date)
        if key not in order_groups:
            order_groups[key] = []
        order_groups[key].append(fc)

    print(f"[INFO] Grouped into {len(order_groups)} orders")

    order_count = 0
    line_count = 0

    for (customer_id, _order_date), fc_list in order_groups.items():
        # Find customer
        customer = next((c for c in customers if c.id == customer_id), None)
        if not customer:
            continue

        is_perfect = customer.id == perfect_customer.id

        # Create Order
        order = Order(
            order_number=fake.unique.bothify(text="ORD-########"),
            customer_id=customer_id,
            order_date=date.today(),
        )
        db.add(order)
        db.flush()
        order_count += 1

        # Create OrderLines from forecasts
        for fc in fc_list:
            # Get product for unit info
            product = next((p for p in products if p.id == fc.product_id), None)
            if not product:
                continue

            # Base quantity from forecast
            base_qty = fc.forecast_quantity

            # Determine delivery date and quantity based on scenario
            delivery_date = fc.forecast_date
            qty = base_qty

            if is_perfect:
                # Perfect scenario: exact match to forecast (±5%)
                qty = base_qty * Decimal(str(random.uniform(0.95, 1.05)))
            else:
                # Apply anomalies for non-perfect customers
                anomaly = random.choices(
                    ["normal", "early", "late", "qty_high", "qty_low"],
                    weights=[60, 10, 10, 10, 10],
                    k=1,
                )[0]

                if anomaly == "normal":
                    # Normal: forecast ±10%
                    qty = base_qty * Decimal(str(random.uniform(0.9, 1.1)))
                elif anomaly == "early":
                    # Early delivery: 1-3 days before forecast
                    delivery_date = fc.forecast_date - timedelta(days=random.randint(1, 3))
                    qty = base_qty * Decimal(str(random.uniform(0.9, 1.1)))
                elif anomaly == "late":
                    # Late delivery: 1-3 days after forecast
                    delivery_date = fc.forecast_date + timedelta(days=random.randint(1, 3))
                    qty = base_qty * Decimal(str(random.uniform(0.9, 1.1)))
                elif anomaly == "qty_high":
                    # Higher quantity: 120-150% of forecast
                    qty = base_qty * Decimal(str(random.uniform(1.2, 1.5)))
                elif anomaly == "qty_low":
                    # Lower quantity: 50-80% of forecast
                    qty = base_qty * Decimal(str(random.uniform(0.5, 0.8)))

            # Round quantity to integer (most units are countable)
            qty = Decimal(str(int(qty)))
            if qty <= 0:
                qty = Decimal("1")

            # Use product's internal unit
            unit = product.internal_unit or product.base_unit or "pcs"

            # Create OrderLine
            ol = OrderLine(
                order_id=order.id,
                product_id=fc.product_id,
                delivery_date=delivery_date,
                order_quantity=qty,
                unit=unit,
                delivery_place_id=fc.delivery_place_id,
                status="pending",
            )
            db.add(ol)
            line_count += 1

    db.commit()
    print(f"[INFO] Generated {order_count} orders with {line_count} lines (forecast-based)")
