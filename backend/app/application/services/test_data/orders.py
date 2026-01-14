import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.forecast_models import ForecastCurrent
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)
from app.infrastructure.persistence.models.masters_models import Customer, DeliveryPlace, Product
from app.infrastructure.persistence.models.orders_models import Order, OrderLine

from .inventory import get_any_lot_id


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

        # Create Order
        order = Order(
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

            # 90% of orders match forecast exactly, 10% have variance
            # (Changed from previous: only "perfect" customer had exact match)
            has_variance = random.random() < 0.10

            if has_variance:
                # 10% have some anomaly
                anomaly = random.choices(
                    ["qty_high", "qty_low", "early", "late"],
                    weights=[30, 30, 20, 20],
                    k=1,
                )[0]

                if anomaly == "qty_high":
                    # Higher quantity: 110-130% of forecast
                    qty = base_qty * Decimal(str(random.uniform(1.10, 1.30)))
                elif anomaly == "qty_low":
                    # Lower quantity: 70-90% of forecast
                    qty = base_qty * Decimal(str(random.uniform(0.70, 0.90)))
                elif anomaly == "early":
                    # Early delivery: 1-2 days before forecast
                    delivery_date = fc.forecast_date - timedelta(days=random.randint(1, 2))
                elif anomaly == "late":
                    # Late delivery: 1-2 days after forecast
                    delivery_date = fc.forecast_date + timedelta(days=random.randint(1, 2))
            # else: qty stays exactly at base_qty (90% of orders)

            # Round quantity to integer (most units are countable)
            qty = Decimal(str(int(qty)))
            if qty <= 0:
                qty = Decimal("1")
            # Use product's internal unit
            unit = product.internal_unit or product.base_unit or "pcs"

            # order_type distribution
            order_type = random.choices(
                ["ORDER", "KANBAN", "SPOT", "FORECAST_LINKED"],
                weights=[60, 20, 10, 10],
                k=1,
            )[0]

            # status distribution
            if delivery_date < date.today():
                status = random.choices(["shipped", "completed"], weights=[80, 20], k=1)[0]
            else:
                status = random.choices(
                    ["pending", "allocated", "cancelled", "on_hold"],
                    weights=[50, 30, 5, 15],
                    k=1,
                )[0]

            # Create OrderLine
            ol = OrderLine(
                order_id=order.id,
                product_id=fc.product_id,
                delivery_date=delivery_date,
                order_quantity=qty,
                unit=unit,
                delivery_place_id=fc.delivery_place_id,
                order_type=order_type,
                status=status,
            )
            db.add(ol)
            db.flush()
            line_count += 1

            # If allocated, create LotReservation
            if status == "allocated":
                lot_id = get_any_lot_id(db, fc.product_id, qty)
                if lot_id:
                    res = LotReservation(
                        lot_id=lot_id,
                        source_type=ReservationSourceType.ORDER.value,
                        source_id=ol.id,
                        reserved_qty=qty,
                        status=ReservationStatus.ACTIVE.value,
                    )
                    db.add(res)
                else:
                    # Could not find enough stock, revert status to pending
                    ol.status = "pending"

    db.commit()
    print(f"[INFO] Generated {order_count} orders with {line_count} lines (forecast-based)")
