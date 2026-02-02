import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inventory_models import (
    LotReceipt,
    StockMovement,
    StockTransactionType,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.masters_models import Supplier, Warehouse
from app.infrastructure.persistence.models.product_warehouse_model import ProductWarehouse
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

from .utils import fake


def generate_lots(
    db: Session,
    products: list[SupplierItem],
    warehouses: list[Warehouse],
    suppliers: list[Supplier],
    forecast_totals: dict[int, int],  # supplier_item_id -> total forecast quantity
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

    # Track assigned lots to ensure we don't duplicate logic if called multiple times or for consistency
    generated_count = 0

    # Edge case assignments (first few products get specific scenarios)
    edge_case_assignments = {
        0: "mixed_expiry",  # 1 Active, 1 Expired, 1 Depleted
        1: "single_expiring",  # 1 Expiring Soon
        2: "multi_fefo",  # 3 Active with staggered expiry
        3: "depleted_only",  # 1 Depleted only (Simulates stockout)
        4: "no_lots",  # No lots at all (Tests lot_count=0 display)
        5: "archived_lots",  # 2 Archived lots (Tests archive filter)
    }

    for idx, p in enumerate(products):
        lots_to_create = []  # List of (scenario, status_override)

        # Determine scenario
        if idx in edge_case_assignments:
            scenario = edge_case_assignments[idx]
            if scenario == "mixed_expiry":
                lots_to_create = [
                    ("normal", "active"),
                    ("expired", "expired"),
                    ("depleted", "depleted"),
                ]
            elif scenario == "single_expiring":
                lots_to_create = [("expiring", "active")]
            elif scenario == "multi_fefo":
                lots_to_create = [("normal", "active")] * 3
            elif scenario == "depleted_only":
                lots_to_create = [("depleted", "depleted")]
            elif scenario == "no_lots":
                # Register product_warehouse but don't create lots - tests lot_count=0 case
                warehouse = random.choice(warehouses)
                existing = (
                    db.query(ProductWarehouse)
                    .filter(
                        ProductWarehouse.supplier_item_id == p.id,
                        ProductWarehouse.warehouse_id == warehouse.id,
                    )
                    .first()
                )
                if not existing:
                    db.add(ProductWarehouse(supplier_item_id=p.id, warehouse_id=warehouse.id))
                continue
            elif scenario == "archived_lots":
                lots_to_create = [("archived", "archived"), ("archived", "archived")]
        else:
            # Standard distribution for others
            # 80% Normal (2-5 lots), 10% Shortage, 5% Expiring, 5% Expired
            # User Feedback: "Too many products with 1 lot. Want 2-3 lots."
            roll = random.random()
            if roll < 0.80:
                # Normal: 2-5 lots to ensure multiple lots per product/warehouse
                count = random.choices([2, 3, 4, 5], weights=[30, 40, 20, 10], k=1)[0]
                lots_to_create = [("normal", "active")] * count
            elif roll < 0.90:
                # Shortage: still might want multiple small lots to test fragmentation
                lots_to_create = [("shortage", "active")] * 2
            elif roll < 0.95:
                lots_to_create = [("expiring", "active")] * 2
            else:
                lots_to_create = [("expired", "expired")] * 2

        # Determine quantities and dates based on scenario
        for scenario_type, status in lots_to_create:
            # Base quantity
            if scenario_type == "normal":
                qty = Decimal(random.randint(100, 500))
                expiry_days = random.randint(60, 365)
            elif scenario_type == "shortage":
                qty = Decimal(random.randint(5, 30))
                expiry_days = random.randint(30, 180)
            elif scenario_type == "expiring":
                qty = Decimal(random.randint(50, 200))
                expiry_days = random.randint(1, 14)  # Within 2 weeks
            elif scenario_type == "expired":
                qty = Decimal(random.randint(20, 100))
                expiry_days = random.randint(-60, -1)  # Past
            elif scenario_type == "depleted":
                qty = Decimal("0")
                expiry_days = random.randint(30, 180)
            elif scenario_type == "archived":
                qty = Decimal("0")  # Archived lots must be depleted
                expiry_days = random.randint(-90, -30)  # Past expiry
            else:
                qty = Decimal("100")
                expiry_days = 90

            # FEFO Staggering for multi-lot mixed normal
            if idx == 2 and scenario_type == "normal":  # multi_fefo case
                # Add extra variance to ensure distinct dates
                expiry_days += random.randint(-20, 20)

            expiry_date = today + timedelta(days=expiry_days)
            received_date = today - timedelta(days=random.randint(1, 60))

            warehouse = random.choice(warehouses)
            lot_number = fake.unique.bothify(text="LOT-########")
            supplier_id = random.choice(suppliers).id if suppliers else None

            # Create LotMaster
            master = LotMaster(
                lot_number=lot_number,
                supplier_item_id=p.id,
                supplier_id=supplier_id,
                first_receipt_date=received_date,
                latest_expiry_date=expiry_date,
            )
            db.add(master)
            db.flush()  # Get master.id

            lot = LotReceipt(
                lot_master_id=master.id,
                supplier_item_id=p.id,
                warehouse_id=warehouse.id,
                supplier_id=supplier_id,
                received_date=received_date,
                expiry_date=expiry_date,
                received_quantity=qty,
                consumed_quantity=Decimal("0"),  # Initialize to 0
                unit=p.internal_unit or "pcs",  # Use product unit
                status=status,
                locked_quantity=Decimal("0"),  # Initialize to 0
            )
            db.add(lot)
            db.flush()  # Get lot.id

            # Create intake history (StockMovement)
            movement = StockMovement(
                lot_id=lot.id,
                transaction_type=StockTransactionType.INBOUND,
                quantity_change=qty,
                quantity_after=qty,
                transaction_date=datetime.combine(received_date, datetime.min.time()),
                reference_type="initial_load",
            )
            db.add(movement)
            generated_count += 1

            # Also register product_warehouse if not exists
            existing = (
                db.query(ProductWarehouse)
                .filter(
                    ProductWarehouse.supplier_item_id == p.id,
                    ProductWarehouse.warehouse_id == warehouse.id,
                )
                .first()
            )
            if not existing:
                db.add(ProductWarehouse(supplier_item_id=p.id, warehouse_id=warehouse.id))

    db.commit()
    print(f"[INFO] Generated {generated_count} lots for {len(products)} products")

    # DEBUG: Verify lot counts per product
    lot_counts = (
        db.query(LotReceipt.supplier_item_id, func.count(LotReceipt.id).label("count"))
        .group_by(LotReceipt.supplier_item_id)
        .having(func.count(LotReceipt.id) > 3)
        .all()
    )

    if lot_counts:
        print("\n[WARNING] Products with >3 lots after generation:")
        for supplier_item_id, count in lot_counts:
            product = db.query(SupplierItem).filter(SupplierItem.id == supplier_item_id).first()
            product_code = product.maker_part_no if product else "UNKNOWN"
            print(f"  - Product {product_code} (id={supplier_item_id}): {count} lots")
    else:
        print("\n[SUCCESS] All products have ≤3 lots")


def get_any_lot_id(
    db: Session, supplier_item_id: int, required_qty: Decimal | None = None
) -> int | None:
    query = db.query(LotReceipt).filter(
        LotReceipt.supplier_item_id == supplier_item_id, LotReceipt.status == "active"
    )

    if required_qty is not None:
        query = query.filter(
            (LotReceipt.received_quantity - LotReceipt.consumed_quantity) >= required_qty
        )

    lot = query.order_by(
        (LotReceipt.received_quantity - LotReceipt.consumed_quantity).desc(), LotReceipt.id.asc()
    ).first()

    if not lot and required_qty is not None:
        lot = (
            db.query(LotReceipt)
            .filter(LotReceipt.supplier_item_id == supplier_item_id, LotReceipt.status == "active")
            .order_by(
                (LotReceipt.received_quantity - LotReceipt.consumed_quantity).desc(),
                LotReceipt.id.asc(),
            )
            .first()
        )

    return lot.id if lot else None
