import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.forecast_models import ForecastCurrent
from app.models.inventory_models import AllocationSuggestion
from app.models.masters_models import Customer, DeliveryPlace, Product

from .inventory import get_any_lot_id


def generate_forecasts(
    db: Session,
    customers: list[Customer],
    products: list[Product],
    delivery_places: list[DeliveryPlace],
) -> tuple[list[Product], dict[int, int]]:
    """Generate forecasts and return products with forecasts + forecast totals.

    Returns:
        Tuple of (products_with_forecast, forecast_totals)
        where forecast_totals is a dict mapping product_id to total forecast quantity
    """
    # 3.1 Forecast products vs 3.2 No Forecast products
    # Split products: 70% with forecast, 30% without
    num_products = len(products)
    num_with_forecast = int(num_products * 0.7)
    products_with_forecast = products[:num_with_forecast]

    today = date.today()
    next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=1)

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

            # For each delivery place
            for dp in dps:
                # Daily Forecast (Next Month)
                # Randomly pick days (3, 5, 10 day intervals)
                interval = random.choice([3, 5, 10])
                current_date = next_month

                while current_date.month == next_month.month:
                    if random.random() > 0.3:  # 70% chance to have forecast on interval
                        qty = random.randint(20, 120)
                        product_total += qty

                        # Create ForecastCurrent
                        fc = ForecastCurrent(
                            customer_id=c.id,
                            delivery_place_id=dp.id,
                            product_id=p.id,
                            forecast_date=current_date,
                            forecast_quantity=Decimal(qty),
                            unit="pcs",
                            forecast_period=current_date.strftime("%Y-%m"),
                        )
                        db.add(fc)

                    current_date += timedelta(days=interval)

        # Store total forecast for this product
        forecast_totals[p.id] = product_total

    db.commit()
    return products_with_forecast, forecast_totals


def generate_reservations(db: Session):
    """Generate reservations (AllocationSuggestion) by copying from forecasts.

    This must be called AFTER lots are created, since reservations require lot_id.
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

    db.commit()
