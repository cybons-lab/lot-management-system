import random
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.forecast_models import (
    ForecastCurrent,
    ForecastHistory,
)
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    DeliveryPlace,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

from .inventory import get_any_lot_id


def generate_forecasts(
    db: Session,
    customers: list[Customer],
    products: list[SupplierItem],
    delivery_places: list[DeliveryPlace],
) -> tuple[list[SupplierItem], dict[int, int]]:
    """Generate forecasts (daily, dekad, monthly) and return products with
    forecasts + totals.

    Forecast Types:
    - Daily (日別): forecast_date is set, no dekad/monthly indicator
    - Dekad (旬別): forecast_date is set to 1st/11th/21st, dekad indicator
    - Monthly (月別): forecast_date is None, only forecast_period is set

    Returns:
        Tuple of (products_with_forecast, forecast_totals)
        where forecast_totals is a dict mapping supplier_item_id to total forecast quantity
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
                                supplier_item_id=p.id,
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
                            supplier_item_id=p.id,
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
                        supplier_item_id=p.id,
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
        if not fc.forecast_quantity or fc.forecast_quantity <= 0:
            continue

        forecast_period = fc.forecast_period
        if not forecast_period and fc.forecast_date:
            forecast_period = fc.forecast_date.strftime("%Y-%m")

        # Find a suitable lot for this product
        lot_id = get_any_lot_id(db, fc.supplier_item_id, fc.forecast_quantity)
        if not lot_id:
            continue

        # Randomize reservation: 50% chance to have a reservation (simulates active vs unallocated forecasts)
        if random.random() < 0.5:
            # Create reservation (100% copy of forecast for simplicity in this generated set)
            res = AllocationSuggestion(
                forecast_id=fc.id,
                customer_id=fc.customer_id,
                delivery_place_id=fc.delivery_place_id,
                supplier_item_id=fc.supplier_item_id,
                lot_id=lot_id,
                quantity=fc.forecast_quantity,
                allocation_type="soft",
                source="forecast_copy",
                forecast_period=forecast_period,
            )
            db.add(res)

            # Also create LotReservation Record (for v2 available quantity logic)
            res_v2 = LotReservation(
                lot_id=lot_id,
                source_type=ReservationSourceType.FORECAST.value,
                source_id=fc.id,  # Link to forecast ID
                reserved_qty=fc.forecast_quantity,
                status=ReservationStatus.ACTIVE.value,
            )
            db.add(res_v2)

    db.commit()


def generate_forecast_history(db: Session) -> None:
    """Generate ForecastHistory (予測履歴) test data.

    Creates revision history for forecasts to test audit trail functionality.
    """
    # Get recent forecasts (last 30 days)
    forecasts = db.query(ForecastCurrent).limit(50).all()

    if not forecasts:
        return

    # Generate history for 30% of forecasts (multiple revisions)
    num_with_history = int(len(forecasts) * 0.3)
    selected_forecasts = random.sample(forecasts, min(num_with_history, len(forecasts)))

    for fc in selected_forecasts:
        # Create 2-5 historical revisions
        num_revisions = random.randint(2, 5)

        base_date = datetime.now(UTC) - timedelta(days=30)
        current_quantity = fc.forecast_quantity

        for rev_num in range(num_revisions):
            # Historical quantity (varies from current)
            if rev_num == 0:
                # First revision: 50-150% of current
                old_quantity = Decimal(int(float(current_quantity) * random.uniform(0.5, 1.5)))
            else:
                # Subsequent revisions: ±20% variance
                old_quantity = Decimal(int(float(current_quantity) * random.uniform(0.8, 1.2)))

            # Snapshot timestamp: spread across 30 days
            snapshot_at = base_date + timedelta(days=rev_num * (30 // num_revisions))

            history = ForecastHistory(
                customer_id=fc.customer_id,
                delivery_place_id=fc.delivery_place_id,
                supplier_item_id=fc.supplier_item_id,
                forecast_date=fc.forecast_date,
                forecast_quantity=old_quantity,
                unit=fc.unit,
                forecast_period=fc.forecast_period,
                snapshot_at=snapshot_at,
                archived_at=snapshot_at + timedelta(days=1),
                created_at=snapshot_at,
                updated_at=snapshot_at,
            )
            db.add(history)

    # Edge case: Forecast with 10+ revisions (rapid changes)
    if forecasts:
        volatile_forecast = forecasts[0]
        base_date = datetime.now(UTC) - timedelta(days=7)

        for i in range(12):
            old_quantity = Decimal(random.randint(50, 500))
            snapshot_at = base_date + timedelta(hours=i * 12)

            history = ForecastHistory(
                customer_id=volatile_forecast.customer_id,
                delivery_place_id=volatile_forecast.delivery_place_id,
                supplier_item_id=volatile_forecast.supplier_item_id,
                forecast_date=volatile_forecast.forecast_date,
                forecast_quantity=old_quantity,
                unit=volatile_forecast.unit,
                forecast_period=volatile_forecast.forecast_period,
                snapshot_at=snapshot_at,
                archived_at=snapshot_at + timedelta(hours=12),
                created_at=snapshot_at,
                updated_at=snapshot_at,
            )
            db.add(history)

    db.commit()
