"""Material Order Forecast test data generator.

Generate sample MaterialOrderForecast data for testing CSV import functionality.
Links to existing masters (customer_items, warehouses, makers) where possible.
"""

import random
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.maker_models import Maker
from app.infrastructure.persistence.models.masters_models import CustomerItem, Warehouse
from app.infrastructure.persistence.models.material_order_forecast_models import (
    MaterialOrderForecast,
)


def generate_material_order_forecasts(
    db: Session,
    target_month: str | None = None,
) -> None:
    """Generate Material Order Forecast test data.

    Args:
        db: Database session
        target_month: Target month in YYYY-MM format (defaults to next month)
    """
    # Default to next month
    if target_month is None:
        today = date.today()
        next_month = today.replace(day=1)
        if next_month.month == 12:
            next_month = next_month.replace(year=next_month.year + 1, month=1)
        else:
            next_month = next_month.replace(month=next_month.month + 1)
        target_month = next_month.strftime("%Y-%m")

    # Get existing masters for linking
    customer_items = db.query(CustomerItem).limit(20).all()
    warehouses = db.query(Warehouse).limit(5).all()
    makers = db.query(Maker).limit(5).all()

    # If no masters exist, skip generation
    if not customer_items or not warehouses:
        return

    jiku_codes = ["A", "B", "C", "D"]

    # Track used unique keys: (target_month, material_code, jiku_code, maker_code)
    used_keys: set[tuple[str, str, str, str | None]] = set()

    # Generate records by iterating over unique combinations
    # to avoid UniqueViolation on ux_mof_unique constraint
    records_created = 0
    max_records = random.randint(30, 50)

    for customer_item in customer_items:
        if records_created >= max_records:
            break

        for jiku_code in jiku_codes:
            if records_created >= max_records:
                break

            # Pick a maker (80% linked, 20% standalone)
            if random.random() < 0.8 and makers:
                maker = random.choice(makers)
                maker_code = maker.maker_code
                maker_name = maker.maker_name
                maker_id = maker.id
            else:
                maker_code = f"MK-{random.randint(1000, 9999)}"
                maker_name = f"未登録メーカー{random.randint(1, 10)}"
                maker_id = None

            material_code = customer_item.customer_part_no
            unique_key = (target_month, material_code, jiku_code, maker_code)

            if unique_key in used_keys:
                continue
            used_keys.add(unique_key)

            warehouse = random.choice(warehouses)

            # Generate quantities
            delivery_lot = Decimal(random.randint(50, 500))
            order_quantity = Decimal(random.randint(100, 1000))
            month_start = Decimal(random.randint(50, 300))
            joujun = Decimal(random.randint(100, 400))
            chuujun = Decimal(random.randint(100, 400))
            gejun = Decimal(random.randint(100, 400))

            forecast = MaterialOrderForecast(
                target_month=target_month,
                customer_item_id=customer_item.id,
                warehouse_id=warehouse.id,
                maker_id=maker_id,
                material_code=material_code,
                unit=random.choice(["kg", "pcs", "m"]),
                warehouse_code=warehouse.warehouse_code,
                jiku_code=jiku_code,
                delivery_place=f"納入先{random.randint(1, 5)}",
                support_division=random.choice(["支給", "購入", None]),
                procurement_type=random.choice(["支", "購", None]),
                maker_code=maker_code,
                maker_name=maker_name,
                material_name=f"材料名{random.randint(1, 20)}",
                delivery_lot=delivery_lot,
                order_quantity=order_quantity,
                month_start_instruction=month_start,
                period_quantities={
                    "上旬": float(joujun),
                    "中旬": float(chuujun),
                    "下旬": float(gejun),
                },
            )
            db.add(forecast)
            records_created += 1

    db.commit()
