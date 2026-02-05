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

    # Generate 50-100 forecast records
    num_records = random.randint(50, 100)

    for _ in range(num_records):
        # 80% link to existing masters, 20% standalone (to test LEFT JOIN)
        if random.random() < 0.8 and customer_items and warehouses:
            customer_item = random.choice(customer_items)
            warehouse = random.choice(warehouses)
            maker = random.choice(makers) if makers else None

            material_code = customer_item.customer_part_no
            warehouse_code = warehouse.warehouse_code
            maker_code = maker.maker_code if maker else None
            maker_name = maker.maker_name if maker else None
        else:
            # Standalone record (no master linkage)
            customer_item = None
            warehouse = None
            maker = None

            material_code = f"UNMAPPED-{random.randint(1000, 9999)}"
            warehouse_code = f"WH-{random.randint(100, 999)}"
            maker_code = f"MK-{random.randint(100, 999)}"
            maker_name = f"未登録メーカー{random.randint(1, 10)}"

        # Generate quantities
        delivery_lot = Decimal(random.randint(50, 500))
        order_quantity = Decimal(random.randint(100, 1000))
        month_start = Decimal(random.randint(50, 300))
        joujun = Decimal(random.randint(100, 400))
        chuujun = Decimal(random.randint(100, 400))
        gejun = Decimal(random.randint(100, 400))

        forecast = MaterialOrderForecast(
            target_month=target_month,
            customer_item_id=customer_item.id if customer_item else None,
            warehouse_id=warehouse.id if warehouse else None,
            maker_id=maker.id if maker else None,
            material_code=material_code,
            unit=random.choice(["kg", "pcs", "m"]),
            warehouse_code=warehouse_code,
            jiku_code=random.choice(["A", "B", "C", "D"]),
            delivery_place=f"納入先{random.randint(1, 5)}",
            support_division=random.choice(["支給", "購入", None]),
            procurement_type=random.choice(["支", "購", None]),
            maker_code=maker_code,
            maker_name=maker_name,
            material_name=f"材料名{random.randint(1, 20)}",
            delivery_lot=delivery_lot,
            order_quantity=order_quantity,
            month_start_instruction=month_start,
            joujun_instruction=joujun,
            chuujun_instruction=chuujun,
            gejun_instruction=gejun,
            inventory_required=random.choice([True, False, None]),
        )
        db.add(forecast)

    db.commit()
