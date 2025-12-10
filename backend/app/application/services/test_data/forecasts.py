import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.forecast_models import ForecastCurrent
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.infrastructure.persistence.models.lot_reservations_model import LotReservation
from app.infrastructure.persistence.models.masters_models import Customer, DeliveryPlace, Product

from .inventory import get_any_lot_id


def generate_forecasts(
    db: Session,
    customers: list[Customer],
    products: list[Product],
    delivery_places: list[DeliveryPlace],
) -> tuple[list[Product], dict[int, int]]:
    """Generate forecasts (daily, dekad, monthly) and return products with
    forecasts + totals.

    Forecast Types:
    - Daily (日別): forecast_date is set, no dekad/monthly indicator
    - Dekad (旬別): forecast_date is set to 1st/11th/21st, dekad indicator
    - Monthly (月別): forecast_date is None, only forecast_period is set

    Returns:
        Tuple of (products_with_forecast, forecast_totals)
        where forecast_totals is a dict mapping product_id to total forecast quantity
    """
    # Split products: 70% with forecast, 30% without
    num_products = len(products)
    num_with_forecast = int(num_products * 0.7)
    products_with_forecast = products[:num_with_forecast]

    today = date.today()
    next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
    forecast_period = next_month.strftime("%Y-%m")

    # Helper to get delivery places for a customer
    dp_map = {c.id: [dp for dp in delivery_places if dp.customer_id == c.id] for c in customers}

    # Track forecast totals per product
    forecast_totals = {}

    for p in products_with_forecast:
        product_total = 0

        for c in customers:
            dps = dp_map.get(c.id, [])
            if not dps:
                continue

            for dp in dps:
                # Forecast type distribution: 50% daily, 30% dekad, 20% monthly
                forecast_type = random.choices(
                    ["daily", "dekad", "monthly"],
                    weights=[50, 30, 20],
                    k=1,
                )[0]

                if forecast_type == "daily":
                    # Daily Forecast: multiple days in the month
                    interval = random.choice([3, 5, 7])
                    current_date = next_month

                    while current_date.month == next_month.month:
                        if random.random() > 0.3:  # 70% chance
                            qty = random.randint(20, 80)
                            product_total += qty

                            fc = ForecastCurrent(
                                customer_id=c.id,
                                delivery_place_id=dp.id,
                                product_id=p.id,
                                forecast_date=current_date,
                                forecast_quantity=Decimal(qty),
                                unit="pcs",
                                forecast_period=forecast_period,
                            )
                            db.add(fc)

                        current_date += timedelta(days=interval)

                elif forecast_type == "dekad":
                    # Dekad Forecast: 3 entries per month (1st, 11th, 21st)
                    dekad_dates = [
                        next_month.replace(day=1),
                        next_month.replace(day=11),
                        next_month.replace(day=21),
                    ]
                    for dekad_date in dekad_dates:
                        qty = random.randint(50, 150)
                        product_total += qty

                        fc = ForecastCurrent(
                            customer_id=c.id,
                            delivery_place_id=dp.id,
                            product_id=p.id,
                            forecast_date=dekad_date,
                            forecast_quantity=Decimal(qty),
                            unit="pcs",
                            forecast_period=forecast_period,
                        )
                        db.add(fc)

                else:  # monthly
                    # Monthly Forecast: single entry for the month (use 1st day as date)
                    qty = random.randint(100, 300)
                    product_total += qty

                    fc = ForecastCurrent(
                        customer_id=c.id,
                        delivery_place_id=dp.id,
                        product_id=p.id,
                        forecast_date=next_month,  # Use 1st day of month (NOT NULL constraint)
                        forecast_quantity=Decimal(qty),
                        unit="pcs",
                        forecast_period=forecast_period,
                    )
                    db.add(fc)

        # Store total forecast for this product
        forecast_totals[p.id] = product_total

    db.commit()
    return products_with_forecast, forecast_totals


def generate_reservations(db: Session):
    """Generate reservations (AllocationSuggestion) by copying from forecasts.

    This must be called AFTER lots are created, since reservations
    require lot_id.
    """
    # Get all forecasts
    forecasts = db.query(ForecastCurrent).all()

    for fc in forecasts:
        # Find a suitable lot for this product
        lot_id = get_any_lot_id(db, fc.product_id)
        if not lot_id:
            continue

        # Create reservation (100% copy of forecast)
        res = AllocationSuggestion(
            customer_id=fc.customer_id,
            delivery_place_id=fc.delivery_place_id,
            product_id=fc.product_id,
            lot_id=lot_id,
            quantity=fc.forecast_quantity,
            allocation_type="soft",
            source="forecast_copy",
            forecast_period=fc.forecast_period,
        )
        db.add(res)

        # Also create LotReservation Record (for v2 available quantity logic)
        res_v2 = LotReservation(
            lot_id=lot_id,
            source_type="forecast",
            source_id=fc.id,  # Link to forecast ID
            reserved_qty=fc.forecast_quantity,
            status="active",
        )
        db.add(res_v2)

    db.commit()
