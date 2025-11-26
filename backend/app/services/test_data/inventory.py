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

    CRITICAL: Maximum 3 lots per product to avoid overwhelming allocation UI.

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

        # Only 5% of products have "fragmented" lots (over-purchasing test case)
        # Use random selection instead of first N% to avoid clustering
        is_fragmented = random.random() < 0.05

        if is_fragmented:
            # Over-purchasing pattern: 3-5 lots (REDUCED from 10-20)
            lot_count = random.randint(3, 5)
            qty_range = (15, 40)
            lots_to_create = [(random.randint(*qty_range),) for _ in range(lot_count)]
        elif forecast_total > 0:
            # Forecast-based lot generation
            # 80% of products: 1 lot at forecast_total ± 5%
            # 20% of products: 2 lots (1 at forecast total, 1 random)
            use_two_lots = random.random() < 0.2

            if use_two_lots:
                # 2 lots: one planned, one random
                lot1_qty = int(forecast_total * random.uniform(0.95, 1.05))
                lot2_qty = random.randint(50, 150)
                lots_to_create = [(lot1_qty,), (lot2_qty,)]
            else:
                # 1 lot: planned quantity ± 5%
                lot_qty = int(forecast_total * random.uniform(0.95, 1.05))
                lots_to_create = [(lot_qty,)]
        else:
            # No forecast: create 1-2 medium lots
            lot_count = random.randint(1, 2)
            lots_to_create = [(random.randint(100, 300),) for _ in range(lot_count)]

        # CRITICAL: Ensure we never create more than 3 lots per product
        lots_to_create = lots_to_create[:3]

        # DEBUG: Log lot creation
        print(
            f"[DEBUG] Product {p.maker_part_code} (id={p.id}): "
            f"is_fragmented={is_fragmented}, forecast_total={forecast_total}, "
            f"creating {len(lots_to_create)} lots"
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
