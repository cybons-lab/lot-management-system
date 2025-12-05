import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.inventory_models import Lot
from app.models.masters_models import Product, Supplier, Warehouse

from .utils import fake


def generate_lots(
    db: Session,
    products: list[Product],
    warehouses: list[Warehouse],
    suppliers: list[Supplier],
    forecast_totals: dict[int, int],  # product_id -> total forecast quantity
):
    """Generate lots based on forecast data (planned procurement).

    REALISTIC ALLOCATION TESTING:
    - Inventory should be ~70-90% of forecast (to create allocation constraints)
    - 60% of products: 1 lot
    - 30% of products: 2 lots
    - 10% of products: 3 lots
    - Maximum 3 lots per product to avoid overwhelming allocation UI.

    Args:
        db: データベースセッション.
        products: ロットを生成する製品一覧.
        warehouses: 在庫を割り当てる倉庫一覧.
        suppliers: 仕入先一覧.
        forecast_totals: 製品ごとの予測数量のマッピング.
    """
    today = date.today()

    for p in products:
        # Get forecast total for this product (default to 0 if no forecast)
        forecast_total = forecast_totals.get(p.id, 0)

        if forecast_total <= 0:
            # No forecast: create 1 small lot
            lots_to_create = [(random.randint(50, 100),)]
        else:
            # Determine lot count distribution
            # 60% -> 1 lot, 30% -> 2 lots, 10% -> 3 lots
            roll = random.random()
            if roll < 0.60:
                lot_count = 1
            elif roll < 0.90:
                lot_count = 2
            else:
                lot_count = 3

            # Total inventory = 70-90% of forecast (to create allocation constraints)
            inventory_ratio = random.uniform(0.70, 0.90)
            total_inventory = int(forecast_total * inventory_ratio)

            # Distribute inventory across lots
            if lot_count == 1:
                lots_to_create = [(total_inventory,)]
            elif lot_count == 2:
                # Split: 60-80% in first lot, rest in second
                first_ratio = random.uniform(0.60, 0.80)
                first_qty = int(total_inventory * first_ratio)
                second_qty = total_inventory - first_qty
                lots_to_create = [(first_qty,), (second_qty,)]
            else:  # 3 lots
                # Split into 3 roughly equal parts with variance
                base = total_inventory // 3
                lot1 = int(base * random.uniform(0.8, 1.2))
                lot2 = int(base * random.uniform(0.8, 1.2))
                lot3 = total_inventory - lot1 - lot2
                lots_to_create = [(lot1,), (lot2,), (lot3,)]

        # CRITICAL: Ensure we never create more than 3 lots per product
        lots_to_create = lots_to_create[:3]

        # DEBUG: Log lot creation
        print(
            f"[DEBUG] Product {p.maker_part_code} (id={p.id}): "
            f"forecast_total={forecast_total}, lot_count={len(lots_to_create)}"
        )

        # Create the lots
        for (qty,) in lots_to_create:
            expiry = today + timedelta(days=random.randint(30, 120))

            lot = Lot(
                lot_number=fake.unique.bothify(text="LOT-########"),
                product_id=p.id,
                warehouse_id=random.choice(warehouses).id,
                supplier_id=random.choice(suppliers).id if suppliers else None,
                received_date=today - timedelta(days=random.randint(1, 30)),
                expiry_date=expiry,
                current_quantity=Decimal(qty),
                allocated_quantity=Decimal(0),
                unit="pcs",
                status="active",
            )
            db.add(lot)

    db.commit()

    # DEBUG: Verify lot counts per product
    lot_counts = (
        db.query(Lot.product_id, func.count(Lot.id).label("count"))
        .group_by(Lot.product_id)
        .having(func.count(Lot.id) > 3)
        .all()
    )

    if lot_counts:
        print("\n[WARNING] Products with >3 lots after generation:")
        for product_id, count in lot_counts:
            product = db.query(Product).filter(Product.id == product_id).first()
            print(f"  - Product {product.maker_part_code} (id={product_id}): {count} lots")
    else:
        print("\n[SUCCESS] All products have ≤3 lots")


def get_any_lot_id(db: Session, product_id: int) -> int | None:
    lot = db.query(Lot).filter(Lot.product_id == product_id).first()
    return lot.id if lot else None
