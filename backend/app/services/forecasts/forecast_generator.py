"""Forecast data generation module.

This module provides common forecast generation functions used by both
seed_simulate_service.py and generate_test_data.py to ensure consistency
in forecast data generation logic.

Key features:
- Daily forecasts with realistic gaps (60-80% coverage)
- Jyun (10-day period) forecasts with ±15-25% variance
- Monthly forecasts based on daily totals

Usage:
    from app.services.forecasts.forecast_generator import (
        create_daily_forecasts,
        create_jyun_forecasts_from_daily,
        create_monthly_forecasts_from_daily,
    )
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from random import Random

from dateutil.relativedelta import relativedelta  # type: ignore[import-untyped]

from app.models.forecast_models import ForecastCurrent
from app.models.masters_models import Product


def create_daily_forecasts(
    customer_id: int,
    delivery_place_id: int,
    product: Product,
    start_date: date,
    end_date: date,
    now: datetime,
    rng: Random,
) -> tuple[list[ForecastCurrent], dict[str, Decimal]]:
    """Create daily forecast entries for a product with realistic gaps.

    Generates forecasts for 60-80% of days (randomly selected) to simulate
    realistic order patterns where not every day has orders.

    Args:
        customer_id: Customer ID
        delivery_place_id: Delivery place ID
        product: Product instance
        start_date: Start date of forecast period (inclusive)
        end_date: End date of forecast period (inclusive)
        now: Current timestamp for snapshot_at, created_at, updated_at
        rng: Random instance for reproducible randomness

    Returns:
        Tuple of (forecast_entries, period_totals)
        period_totals: {
            'joujun': Decimal,   # 上旬 (1-10日) total
            'chuujun': Decimal,  # 中旬 (11-20日) total
            'gejun': Decimal,    # 下旬 (21-月末) total
            'monthly': Decimal,  # Monthly total
        }

    Example:
        >>> from random import Random
        >>> from datetime import date, datetime
        >>> rng = Random(42)
        >>> entries, totals = create_daily_forecasts(
        ...     customer_id=1,
        ...     delivery_place_id=1,
        ...     product=product_instance,
        ...     start_date=date(2025, 1, 1),
        ...     end_date=date(2025, 1, 31),
        ...     now=datetime.utcnow(),
        ...     rng=rng,
        ... )
        >>> # Returns ~18-25 entries (60-80% of 31 days)
    """
    entries = []
    period_totals = {"joujun": Decimal(0), "chuujun": Decimal(0), "gejun": Decimal(0)}
    current_date = start_date

    # Determine coverage ratio (60-80% of days will have forecasts)
    coverage_ratio = rng.uniform(0.6, 0.8)

    while current_date <= end_date:
        # Randomly decide if this day has a forecast (based on coverage ratio)
        if rng.random() < coverage_ratio:
            # Calculate forecast_period as YYYY-MM from forecast_date
            forecast_period = current_date.strftime("%Y-%m")

            # Random quantity for each day
            qty = Decimal(rng.randint(10, 100))

            # Add to appropriate period total
            day = current_date.day
            if day <= 10:
                period_totals["joujun"] += qty
            elif day <= 20:
                period_totals["chuujun"] += qty
            else:
                period_totals["gejun"] += qty

            entries.append(
                ForecastCurrent(
                    customer_id=customer_id,
                    delivery_place_id=delivery_place_id,
                    product_id=product.id,
                    forecast_date=current_date,
                    forecast_quantity=qty,
                    unit=product.base_unit or "PCS",
                    forecast_period=forecast_period,
                    snapshot_at=now,
                    created_at=now,
                    updated_at=now,
                )
            )

        current_date += timedelta(days=1)

    # Calculate monthly total
    period_totals["monthly"] = (
        period_totals["joujun"] + period_totals["chuujun"] + period_totals["gejun"]
    )

    return entries, period_totals


def create_jyun_forecasts_from_daily(
    customer_id: int,
    delivery_place_id: int,
    product: Product,
    target_month: date,
    period_totals: dict[str, Decimal],
    now: datetime,
    rng: Random,
) -> list[ForecastCurrent]:
    """Create jyun (10-day period) forecast entries with realistic variance.

    Creates 3 entries for the target month:
    - 上旬 (1st-10th): forecast_date = 1st of month
    - 中旬 (11th-20th): forecast_date = 11th of month
    - 下旬 (21st-end): forecast_date = 21st of month

    Each jyun quantity is based on actual daily period total with ±15-25% variance
    to simulate forecasting uncertainty.
    forecast_period is set to next month (target_month + 1 month).

    Args:
        customer_id: Customer ID
        delivery_place_id: Delivery place ID
        product: Product instance
        target_month: Target month as date (e.g., date(2025, 1, 1))
        period_totals: Period totals from create_daily_forecasts
        now: Current timestamp for snapshot_at, created_at, updated_at
        rng: Random instance for reproducible randomness

    Returns:
        List of 3 ForecastCurrent entries (joujun, chuujun, gejun)

    Example:
        >>> from random import Random
        >>> rng = Random(42)
        >>> period_totals = {'joujun': Decimal(500), 'chuujun': Decimal(600), ...}
        >>> entries = create_jyun_forecasts_from_daily(
        ...     customer_id=1,
        ...     delivery_place_id=1,
        ...     product=product_instance,
        ...     target_month=date(2025, 1, 1),
        ...     period_totals=period_totals,
        ...     now=datetime.utcnow(),
        ...     rng=rng,
        ... )
        >>> # Returns 3 entries with quantities ≈ 500±25%, 600±25%, ...
    """
    entries = []
    # Jyun forecast_period is next month
    next_month = target_month + relativedelta(months=1)
    forecast_period = next_month.strftime("%Y-%m")

    # Define jyun periods with their corresponding keys
    jyun_configs = [
        (1, "joujun"),  # 上旬 (1st-10th)
        (11, "chuujun"),  # 中旬 (11th-20th)
        (21, "gejun"),  # 下旬 (21st-end)
    ]

    for day, period_key in jyun_configs:
        forecast_date = target_month.replace(day=day)

        # Get actual daily total for this period
        base_quantity = period_totals.get(period_key, Decimal(0))

        # Add variance: ±15-25% (simulate forecasting uncertainty)
        variance_pct = Decimal(str(rng.uniform(-0.25, 0.25)))
        jyun_quantity = base_quantity * (Decimal(1) + variance_pct)

        # Ensure non-negative
        jyun_quantity = max(Decimal(0), jyun_quantity)

        entries.append(
            ForecastCurrent(
                customer_id=customer_id,
                delivery_place_id=delivery_place_id,
                product_id=product.id,
                forecast_date=forecast_date,
                forecast_quantity=jyun_quantity.quantize(Decimal("1")),  # Round to integer
                unit=product.base_unit or "PCS",
                forecast_period=forecast_period,
                snapshot_at=now,
                created_at=now,
                updated_at=now,
            )
        )

    return entries


def create_monthly_forecasts_from_daily(
    customer_id: int,
    delivery_place_id: int,
    product: Product,
    target_month: date,
    period_totals: dict[str, Decimal],
    now: datetime,
) -> list[ForecastCurrent]:
    """Create monthly forecast entry based on daily total.

    Creates 1 entry for the target month.
    forecast_date is set to the 1st of the month.
    Quantity = sum of all daily forecasts
    forecast_period is set to 2 months after target_month.

    Args:
        customer_id: Customer ID
        delivery_place_id: Delivery place ID
        product: Product instance
        target_month: Target month as date (e.g., date(2025, 1, 1))
        period_totals: Period totals from create_daily_forecasts
        now: Current timestamp for snapshot_at, created_at, updated_at

    Returns:
        List with 1 ForecastCurrent entry (monthly total)

    Example:
        >>> period_totals = {'monthly': Decimal(1500)}
        >>> entries = create_monthly_forecasts_from_daily(
        ...     customer_id=1,
        ...     delivery_place_id=1,
        ...     product=product_instance,
        ...     target_month=date(2025, 1, 1),
        ...     period_totals=period_totals,
        ...     now=datetime.utcnow(),
        ... )
        >>> # Returns 1 entry with quantity = 1500
    """
    entries = []
    # Monthly forecast_period is 2 months after target_month
    two_months_later = target_month + relativedelta(months=2)
    forecast_period = two_months_later.strftime("%Y-%m")

    forecast_date = target_month.replace(day=1)

    # Monthly quantity = sum of all daily forecasts
    monthly_quantity = period_totals.get("monthly", Decimal(0))

    entries.append(
        ForecastCurrent(
            customer_id=customer_id,
            delivery_place_id=delivery_place_id,
            product_id=product.id,
            forecast_date=forecast_date,
            forecast_quantity=monthly_quantity.quantize(Decimal("1")),  # Round to integer
            unit=product.base_unit or "PCS",
            forecast_period=forecast_period,
            snapshot_at=now,
            created_at=now,
            updated_at=now,
        )
    )

    return entries
