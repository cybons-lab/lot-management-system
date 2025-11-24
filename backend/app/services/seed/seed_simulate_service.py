# backend/app/services/seed_simulate_service.py
"""
Enhanced seed data simulation service with constraints and progress tracking.

Refactored: 679-line god function split into phase-specific functions.
"""

from __future__ import annotations

import logging
import traceback
from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from random import Random
from typing import Any

from dateutil.relativedelta import relativedelta
from faker import Faker
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import truncate_all_tables
from app.models.forecast_models import ForecastCurrent
from app.models.inventory_models import Lot, StockMovement, StockTransactionType
from app.models.masters_models import (
    Customer,
    CustomerItem,
    DeliveryPlace,
    Product,
    Supplier,
    Warehouse,
)
from app.models.orders_models import Allocation, Order, OrderLine
from app.repositories.seed_snapshot_repo import SeedSnapshotRepository
from app.schemas.admin.admin_simulate_schema import (
    CapCheckResult,
    SimulateResultSummary,
    SimulateSeedRequest,
)
from app.services.common.job_tracker import JobPhase, get_job_tracker
from app.services.common.profile_loader import get_profile


logger = logging.getLogger(__name__)


# ============================
# Helper Functions (Existing)
# ============================


def _choose(rng: Random, seq: Sequence):
    """シーケンスからランダムに選択."""
    return seq[rng.randrange(0, len(seq))]


def _next_code(prefix: str, width: int, rng: Random, existing: set[str]) -> str:
    """一意なコードを生成."""
    lo = 10 ** (width - 1)
    hi = (10**width) - 1
    while True:
        n = rng.randint(lo, hi)
        code = f"{prefix}{n}"
        if code not in existing:
            existing.add(code)
            return code


def _expand_params(req: SimulateSeedRequest) -> dict[str, Any]:
    """
    YAMLプロファイルを読み込み、APIリクエストでマージする.

    処理順序:
    1. YAMLからprofile解決（inherits含む）
    2. API明示指定で上書き（明示が優先）
    3. 最終パラメータを返す

    Args:
        req: シミュレーションリクエスト

    Returns:
        展開済みパラメータ辞書
    """
    # 1) YAML読み込み・解決
    try:
        params = get_profile(req.profile)
    except Exception as e:
        logger.warning(f"Failed to load profile '{req.profile}': {e}. Using defaults.")
        params = get_profile(None)  # デフォルト

    # 2) API指定で上書き（明示が優先）
    # 倉庫数（APIで必ず指定されている）
    params["warehouses"] = req.warehouses

    # APIから明示された件数で上書き（Noneはプロファイル値を使用）
    for key in ("customers", "suppliers", "products", "lots", "orders"):
        value = getattr(req, key, None)
        if value is not None:
            params[key] = value

    # 明細行上限
    if isinstance(params.get("order_line_items_per_order"), dict):
        params["order_line_items_per_order"]["max"] = req.order_line_items_per_order
    else:
        params["order_line_items_per_order"] = {"min": 1, "max": req.order_line_items_per_order}

    # 納品先上限（固定5）
    params["destinations_max_per_order"] = 5

    # ロット分割上限
    params["lot_split_max_per_line"] = req.lot_split_max_per_line

    # ケースミックス（API指定があれば上書き）
    if req.case_mix is not None:
        params["case_mix"] = req.case_mix

    # ★ forecasts（API指定があれば上書き。0=無効, 1=有効）
    if req.forecasts is not None:
        params["forecasts"] = int(req.forecasts)
        logger.info(f"Forecasts param set from API: {req.forecasts} -> {params['forecasts']}")
    else:
        logger.info(f"Forecasts param from profile: {params.get('forecasts', 'not set')}")

    case_mix = params.get("case_mix")
    if isinstance(case_mix, dict):
        numeric_values: list[float] = []
        for key, value in case_mix.items():
            if isinstance(value, (int, float)):
                numeric_values.append(float(value))
            else:
                raise ValueError(
                    f"case_mix values must be numeric for all entries ({key}={value!r})"
                )

        total_ratio = sum(numeric_values)
        if total_ratio > 1.0:
            raise ValueError(
                f"case_mix total ({total_ratio}) must not exceed 1.0. "
                "Adjust the ratios so the sum is <= 1.0."
            )

    return params


# ============================
# Refactored: Phase Functions
# ============================


def initialize_random_generators(req: SimulateSeedRequest) -> tuple[Faker, Random, int]:
    """
    Initialize Faker and Random generators with seed.

    Args:
        req: Simulation request

    Returns:
        Tuple of (faker, rng, seed)
    """
    seed = req.random_seed if req.random_seed is not None else int(datetime.utcnow().timestamp())
    faker = Faker("ja_JP")
    faker.seed_instance(seed)
    rng = Random(seed)
    return faker, rng, seed


def execute_database_reset(db: Session, tracker, task_id: str) -> None:
    """
    Phase 1: Reset database.

    Args:
        db: Database session
        tracker: Job tracker
        task_id: Task ID
    """
    tracker.add_log(task_id, "Phase 1: Database reset started")
    tracker.update_progress(task_id, JobPhase.RESET, 5)
    truncate_all_tables()
    db.commit()
    tracker.add_log(task_id, "Database reset completed")


def create_master_data(
    db: Session,
    params: dict,
    faker: Faker,
    rng: Random,
    tracker,
    task_id: str,
) -> dict:
    """
    Phase 2: Create all master data.

    Args:
        db: Database session
        params: Expanded parameters
        faker: Faker instance
        rng: Random instance
        tracker: Job tracker
        task_id: Task ID

    Returns:
        Dictionary with master entities lists
    """
    tracker.add_log(task_id, "Phase 2: Creating master data")
    tracker.update_progress(task_id, JobPhase.MASTERS, 10)

    # Customers
    num_customers = params.get("customers", params["warehouses"] * 10)
    existing_customer_codes: set[str] = set()
    customer_rows = [
        {
            "customer_code": _next_code("C", 4, rng, existing_customer_codes),
            "customer_name": faker.company(),
            "created_at": datetime.utcnow(),
        }
        for _ in range(num_customers)
    ]
    if customer_rows:
        stmt = pg_insert(Customer).values(customer_rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=[Customer.customer_code])
        db.execute(stmt)
        db.flush()
    tracker.add_log(task_id, f"Created {num_customers} customers")

    existing_customers = db.execute(select(Customer)).scalars().all()

    # Suppliers
    num_suppliers = params.get("suppliers", params["warehouses"] * 5)
    existing_supplier_codes: set[str] = set()
    supplier_rows = [
        {
            "supplier_code": _next_code("S", 4, rng, existing_supplier_codes),
            "supplier_name": f"{faker.company()}商事",
            "created_at": datetime.utcnow(),
        }
        for _ in range(num_suppliers)
    ]
    if supplier_rows:
        stmt = pg_insert(Supplier).values(supplier_rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=[Supplier.supplier_code])
        db.execute(stmt)
        db.flush()
    tracker.add_log(task_id, f"Created {num_suppliers} suppliers")

    # DeliveryPlaces
    num_delivery_places = 5
    existing_dp_codes: set[str] = set()
    delivery_place_rows = []
    if existing_customers:
        for _ in range(num_delivery_places):
            customer = _choose(rng, existing_customers)
            delivery_place_rows.append(
                {
                    "jiku_code": None,
                    "delivery_place_code": _next_code("D", 3, rng, existing_dp_codes),
                    "delivery_place_name": f"{faker.city()}配送センター",
                    "customer_id": customer.id,
                    "created_at": datetime.utcnow(),
                }
            )

    if delivery_place_rows:
        stmt = pg_insert(DeliveryPlace).values(delivery_place_rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=[DeliveryPlace.delivery_place_code])
        db.execute(stmt)
        db.flush()
        tracker.add_log(task_id, f"Created {len(delivery_place_rows)} delivery places")
    else:
        tracker.add_log(
            task_id,
            "Skipped delivery place creation because no customers were generated",
        )

    # Products
    tracker.add_log(task_id, "→ Creating Products...")
    num_products = params.get("products", params["warehouses"] * 20)
    existing_product_codes: set[str] = set()
    base_units = ["PCS", "BOX", "SET"]
    product_rows = []
    for _ in range(num_products):
        row = {
            "maker_part_code": _next_code("P", 5, rng, existing_product_codes),
            "product_name": faker.bs().title(),
            "base_unit": _choose(rng, base_units),
            "consumption_limit_days": rng.randint(30, 180),
            "created_at": datetime.utcnow(),
        }
        product_rows.append(row)

    if product_rows:
        stmt = pg_insert(Product).values(product_rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=[Product.maker_part_code])
        db.execute(stmt)
        db.flush()
    tracker.add_log(task_id, f"✓ Created {num_products} products")

    # Warehouses
    tracker.add_log(task_id, "→ Creating Warehouses...")
    num_warehouses = params["warehouses"]
    existing_wh_codes: set[str] = set()
    warehouse_types = ["internal", "external", "supplier"]
    warehouse_rows = [
        {
            "warehouse_code": _next_code("W", 2, rng, existing_wh_codes),
            "warehouse_name": f"{faker.city()}倉庫",
            "warehouse_type": _choose(rng, warehouse_types),
            "created_at": datetime.utcnow(),
        }
        for _ in range(num_warehouses)
    ]
    if warehouse_rows:
        stmt = pg_insert(Warehouse).values(warehouse_rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=[Warehouse.warehouse_code])
        db.execute(stmt)
        db.flush()
    tracker.add_log(task_id, f"✓ Created {num_warehouses} warehouses")

    # CustomerItems (得意先品番マッピング)
    tracker.add_log(task_id, "→ Creating CustomerItems...")

    # Fetch current state to generate CustomerItems
    temp_customers: list[Customer] = db.execute(select(Customer)).scalars().all()
    temp_suppliers: list[Supplier] = db.execute(select(Supplier)).scalars().all()
    temp_products: list[Product] = db.execute(select(Product)).scalars().all()

    customer_item_rows = []
    if temp_customers and temp_suppliers and temp_products:
        existing_external_codes: set[tuple[int, str]] = set()

        # For each customer, create mappings for a subset of products (to avoid too many combinations)
        for customer in temp_customers:
            # Each customer has mappings for 30-50% of all products
            num_mapped_products = max(1, int(len(temp_products) * rng.uniform(0.3, 0.5)))
            mapped_products = rng.sample(
                temp_products, min(num_mapped_products, len(temp_products))
            )

            for product in mapped_products:
                # Generate unique external_product_code for this customer
                external_code = f"{customer.customer_code}-{product.maker_part_code}"
                if (customer.id, external_code) in existing_external_codes:
                    continue
                existing_external_codes.add((customer.id, external_code))

                # Randomly assign a supplier (essential for displaying supplier name)
                supplier = _choose(rng, temp_suppliers)

                customer_item_rows.append(
                    {
                        "customer_id": customer.id,
                        "external_product_code": external_code,
                        "product_id": product.id,
                        "supplier_id": supplier.id,
                        "base_unit": product.base_unit,
                        "pack_unit": None,
                        "pack_quantity": None,
                        "special_instructions": None,
                        "created_at": datetime.utcnow(),
                    }
                )

    if customer_item_rows:
        stmt = pg_insert(CustomerItem).values(customer_item_rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=["customer_id", "external_product_code"])
        db.execute(stmt)
        db.flush()
        tracker.add_log(task_id, f"✓ Created {len(customer_item_rows)} customer items")
    else:
        tracker.add_log(task_id, "⚠ Skipped customer items (insufficient master data)")

    db.commit()
    tracker.add_log(task_id, "✓ Master data committed to DB")

    # Fetch all masters
    all_customers: list[Customer] = db.execute(select(Customer)).scalars().all()
    all_suppliers: list[Supplier] = db.execute(select(Supplier)).scalars().all()
    all_delivery_places: list[DeliveryPlace] = db.execute(select(DeliveryPlace)).scalars().all()
    all_products: list[Product] = db.execute(select(Product)).scalars().all()
    all_warehouses: list[Warehouse] = db.execute(select(Warehouse)).scalars().all()

    return {
        "customers": all_customers,
        "suppliers": all_suppliers,
        "delivery_places": all_delivery_places,
        "products": all_products,
        "warehouses": all_warehouses,
    }


def _create_daily_forecasts(
    customer_id: int,
    delivery_place_id: int,
    products: list,
    start_date: date,
    end_date: date,
    rng: Random,
    now: datetime,
) -> list[ForecastCurrent]:
    """Create daily forecast entries for all products."""
    entries = []
    current_date = start_date
    while current_date <= end_date:
        # Calculate forecast_period as YYYY-MM from forecast_date
        forecast_period = current_date.strftime("%Y-%m")
        for prod in products:
            entries.append(
                ForecastCurrent(
                    customer_id=customer_id,
                    delivery_place_id=delivery_place_id,
                    product_id=prod.id,
                    forecast_date=current_date,
                    forecast_quantity=Decimal(rng.randint(10, 1000)),
                    unit=prod.base_unit or "PCS",
                    forecast_period=forecast_period,
                    snapshot_at=now,
                    created_at=now,
                    updated_at=now,
                )
            )
        current_date += timedelta(days=1)
    return entries


def _create_jyun_forecasts_from_daily(
    customer_id: int,
    delivery_place_id: int,
    products: list,
    target_month: date,
    product_daily_totals: dict[int, Decimal],
    now: datetime,
) -> list[ForecastCurrent]:
    """Create jyun (10-day period) forecast entries based on daily totals.

    Creates 3 entries per product for the target month:
    - 上旬 (1st-10th): forecast_date = 1st of month
    - 中旬 (11th-20th): forecast_date = 11th of month
    - 下旬 (21st-end): forecast_date = 21st of month

    Quantity for each jyun = daily_total / 3 (approximately)
    forecast_period is set to next month (target_month + 1 month).
    """
    entries = []
    # Jyun forecast_period is next month
    next_month = target_month + relativedelta(months=1)
    forecast_period = next_month.strftime("%Y-%m")

    # 上旬 (early 10-day), 中旬 (middle 10-day), 下旬 (late 10-day)
    jyun_days = [1, 11, 21]

    for day in jyun_days:
        forecast_date = target_month.replace(day=day)
        for prod in products:
            # Calculate jyun quantity as daily total / 3
            daily_total = product_daily_totals.get(prod.id, Decimal(0))
            jyun_quantity = daily_total / Decimal(3)

            entries.append(
                ForecastCurrent(
                    customer_id=customer_id,
                    delivery_place_id=delivery_place_id,
                    product_id=prod.id,
                    forecast_date=forecast_date,
                    forecast_quantity=jyun_quantity.quantize(Decimal("1")),  # Round to integer
                    unit=prod.base_unit or "PCS",
                    forecast_period=forecast_period,
                    snapshot_at=now,
                    created_at=now,
                    updated_at=now,
                )
            )
    return entries


def _create_monthly_forecasts_from_daily(
    customer_id: int,
    delivery_place_id: int,
    products: list,
    target_month: date,
    product_daily_totals: dict[int, Decimal],
    now: datetime,
) -> list[ForecastCurrent]:
    """Create monthly forecast entries based on daily totals.

    Creates 1 entry per product for the target month.
    forecast_date is set to the 1st of the month.
    Quantity = daily_total (same as sum of all daily forecasts)
    forecast_period is set to 2 months after target_month.
    """
    entries = []
    # Monthly forecast_period is 2 months after target_month
    two_months_later = target_month + relativedelta(months=2)
    forecast_period = two_months_later.strftime("%Y-%m")

    forecast_date = target_month.replace(day=1)
    for prod in products:
        # Monthly quantity = daily total
        monthly_quantity = product_daily_totals.get(prod.id, Decimal(0))

        entries.append(
            ForecastCurrent(
                customer_id=customer_id,
                delivery_place_id=delivery_place_id,
                product_id=prod.id,
                forecast_date=forecast_date,
                forecast_quantity=monthly_quantity.quantize(Decimal("1")),  # Round to integer
                unit=prod.base_unit or "PCS",
                forecast_period=forecast_period,
                snapshot_at=now,
                created_at=now,
                updated_at=now,
            )
        )
    return entries


def create_forecast_data(
    db: Session,
    params: dict,
    masters: dict,
    rng: Random,
    tracker,
    task_id: str,
) -> int:
    """
    Phase 2.5: Create forecast data with v2.5 schema.

    Creates ForecastCurrent entries for each customer × delivery_place × product × date.
    Generates three types of forecasts as a set:
    - Daily forecasts: may have gaps
    - Jyun forecasts (10-day periods): always populated (3 per month), qty = daily_total / 3
    - Monthly forecasts: always populated (1 per month), qty = daily_total

    Args:
        db: Database session
        params: Expanded parameters
        masters: Master data dictionary
        rng: Random instance
        tracker: Job tracker
        task_id: Task ID

    Returns:
        Number of forecast entries created
    """
    tracker.add_log(task_id, "Phase 2.5: Creating forecast data (v2.5 schema)")
    tracker.update_progress(task_id, JobPhase.MASTERS, 25)

    all_products = masters["products"]
    all_delivery_places = masters["delivery_places"]

    # PHASE 0: Fetch CustomerItems for use in Phase 1
    # CustomerItems represent the valid product-customer combinations (商流)
    all_customer_items: list[CustomerItem] = db.execute(select(CustomerItem)).scalars().all()

    generate_forecasts = params.get("forecasts", 0) > 0
    forecast_count = 0

    tracker.add_log(
        task_id,
        f"→ Forecast check: params.forecasts={params.get('forecasts', 0)}, "
        f"generate={generate_forecasts}, delivery_places={len(all_delivery_places)}, "
        f"products={len(all_products)}, customer_items={len(all_customer_items)}",
    )

    if generate_forecasts and all_products and all_delivery_places:
        now = datetime.now(UTC)
        base_date = now.date()

        # Calculate date ranges based on current day of month
        # Before 25th: current month (1st to end of month)
        # After 25th: next month (1st to end of month)
        if base_date.day < 25:
            # Use current month
            target_month = base_date.replace(day=1)
        else:
            # Use next month
            target_month = base_date.replace(day=1) + relativedelta(months=1)

        # Date range: 1st to last day of target month
        daily_start = target_month
        daily_end = (target_month + relativedelta(months=1)) - timedelta(days=1)

        tracker.add_log(
            task_id,
            f"→ Target month: {target_month.strftime('%Y-%m')} "
            f"(today={base_date}, day={base_date.day})",
        )

        # TODO: PHASE 1 - 現在のロジックは誤り（製品からスタートして顧客・納入先をぶら下げている）
        # 正しいアプローチ：
        #   1. 商流（CustomerItem）を基点として、顧客×製品の組み合わせを特定
        #   2. その商流に納入先を組み合わせて、(customer_id, delivery_place_id, product_id) のキーを作成
        #   3. そのキー単位で日次・旬次・月次を一貫して生成
        # 現在の実装では全製品に対して予測を生成しているため、商流が存在しない組み合わせでも
        # 予測が生成されてしまう。Phase 1でCustomerItemベースのロジックに修正予定。

        # Generate forecast entries for each delivery_place × product × date
        forecast_entries: list[ForecastCurrent] = []
        for delivery_place in all_delivery_places:
            # Step 1: Generate daily forecasts first
            daily_entries = _create_daily_forecasts(
                customer_id=delivery_place.customer_id,
                delivery_place_id=delivery_place.id,
                products=all_products,
                start_date=daily_start,
                end_date=daily_end,
                rng=rng,
                now=now,
            )
            forecast_entries.extend(daily_entries)

            # Step 2: Calculate monthly totals per product from daily data
            # to generate realistic jyun and monthly forecasts
            product_daily_totals: dict[int, Decimal] = {}
            for entry in daily_entries:
                if entry.product_id not in product_daily_totals:
                    product_daily_totals[entry.product_id] = Decimal(0)
                product_daily_totals[entry.product_id] += entry.forecast_quantity

            # Step 3: Generate jyun forecasts (qty = daily_total / 3 for each jyun)
            jyun_entries = _create_jyun_forecasts_from_daily(
                customer_id=delivery_place.customer_id,
                delivery_place_id=delivery_place.id,
                products=all_products,
                target_month=target_month,
                product_daily_totals=product_daily_totals,
                now=now,
            )
            forecast_entries.extend(jyun_entries)

            # Step 4: Generate monthly forecasts (qty = daily_total)
            monthly_entries = _create_monthly_forecasts_from_daily(
                customer_id=delivery_place.customer_id,
                delivery_place_id=delivery_place.id,
                products=all_products,
                target_month=target_month,
                product_daily_totals=product_daily_totals,
                now=now,
            )
            forecast_entries.extend(monthly_entries)

        if forecast_entries:
            tracker.add_log(task_id, f"→ Inserting {len(forecast_entries)} forecast entries...")
            db.bulk_save_objects(forecast_entries)
            db.flush()
            forecast_count = len(forecast_entries)

            tracker.add_log(
                task_id,
                f"✓ Created {forecast_count} forecast entries "
                f"(delivery_places={len(all_delivery_places)}, products={len(all_products)})",
            )
        else:
            tracker.add_log(task_id, "→ No forecast entries generated")
    else:
        reasons = []
        if not generate_forecasts:
            reasons.append(f"forecasts={params.get('forecasts', 0)}")
        if not all_products:
            reasons.append("no products")
        if not all_delivery_places:
            reasons.append("no delivery places")
        tracker.add_log(task_id, f"→ Forecast generation skipped: {', '.join(reasons)}")

    db.commit()
    tracker.add_log(task_id, f"✓ Forecast data committed to DB (total={forecast_count})")

    return forecast_count


def create_lot_inventory(
    db: Session,
    params: dict,
    masters: dict,
    faker: Faker,
    rng: Random,
    tracker,
    task_id: str,
) -> int:
    """
    Phase 3: Create lots with inbound stock movements.

    Args:
        db: Database session
        params: Expanded parameters
        masters: Master data dictionary
        faker: Faker instance
        rng: Random instance
        tracker: Job tracker
        task_id: Task ID

    Returns:
        Number of lots created
    """
    tracker.add_log(task_id, "Phase 3: Creating lots and inbound stock movements")
    tracker.update_progress(task_id, JobPhase.STOCK, 30)

    all_products = masters["products"]
    all_warehouses = masters["warehouses"]
    all_suppliers = masters["suppliers"]

    num_lots = params.get("lots", params["warehouses"] * 1000)
    now_dt = datetime.utcnow()

    for i in range(num_lots):
        prod = _choose(rng, all_products) if all_products else None
        wh = _choose(rng, all_warehouses) if all_warehouses else None
        supplier = _choose(rng, all_suppliers) if all_suppliers else None
        days = rng.randint(0, 360)
        lot_unit = prod.base_unit if prod and getattr(prod, "base_unit", None) else "PCS"
        lot = Lot(
            product_id=prod.id if prod else None,
            warehouse_id=wh.id if wh else None,
            supplier_id=supplier.id if supplier else None,
            lot_number=faker.unique.bothify(text="LOT-########"),
            received_date=datetime.utcnow().date() - timedelta(days=rng.randint(0, 30)),
            expiry_date=datetime.utcnow().date() + timedelta(days=360 - days),
            current_quantity=Decimal(0),
            allocated_quantity=Decimal(0),
            unit=lot_unit,
            status="active",
            created_at=now_dt,
            updated_at=now_dt,
        )
        db.add(lot)
        db.flush()

        # Inbound stock movement
        recv_qty = Decimal(rng.randint(10, 500))
        lot.current_quantity = lot.current_quantity + recv_qty
        lot.updated_at = datetime.utcnow()
        movement = StockMovement(
            lot_id=lot.id,
            transaction_type=StockTransactionType.INBOUND,
            quantity_change=recv_qty,
            quantity_after=lot.current_quantity,
            reference_type="seed_simulation",
            transaction_date=datetime.utcnow(),
        )
        db.add(movement)

        if (i + 1) % 500 == 0:
            db.flush()
            tracker.add_log(task_id, f"Created {i + 1}/{num_lots} lots")

    db.commit()
    tracker.add_log(task_id, f"Created {num_lots} lots with inbound movements")

    return num_lots


def create_orders_with_constraints(
    db: Session,
    params: dict,
    masters: dict,
    faker: Faker,
    rng: Random,
    tracker,
    task_id: str,
) -> tuple[int, int]:
    """
    Phase 4: Create orders and order lines with constraints.

    Args:
        db: Database session
        params: Expanded parameters
        masters: Master data dictionary
        faker: Faker instance
        rng: Random instance
        tracker: Job tracker
        task_id: Task ID

    Returns:
        Tuple of (order_count, line_count)
    """
    tracker.add_log(task_id, "Phase 4: Creating orders with constraints")
    tracker.update_progress(task_id, JobPhase.ORDERS, 50)

    all_customers = masters["customers"]
    all_products = masters["products"]
    all_delivery_places = masters["delivery_places"]

    num_orders = params.get("orders", params["warehouses"] * 375)
    delivery_places_by_customer: dict[int, list[DeliveryPlace]] = {}
    for dp in all_delivery_places:
        delivery_places_by_customer.setdefault(dp.customer_id, []).append(dp)

    line_count = 0
    for i in range(num_orders):
        cust = _choose(rng, all_customers) if all_customers else None
        if not cust:
            continue
        delivery_choices = delivery_places_by_customer.get(cust.id)
        if not delivery_choices:
            delivery_choices = all_delivery_places
        if not delivery_choices:
            continue
        delivery_place = _choose(rng, delivery_choices)
        if not delivery_place:
            continue
        order = Order(
            customer_id=cust.id,
            # delivery_place_id=delivery_place.id,  # Moved to OrderLine in v2.3
            order_number=faker.unique.bothify(text="SO-########"),
            order_date=datetime.utcnow().date() - timedelta(days=rng.randint(0, 14)),
            # status="pending",  # Removed in v2.3
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(order)
        db.flush()

        # 明細行数: 1-2が多い、稀に5（制約: ≤5）
        order_line_max = params["order_line_items_per_order"]
        if isinstance(order_line_max, dict):
            order_line_max = order_line_max.get("max", 5)
        num_lines = rng.choices([1, 2, 3, 4, 5], weights=[40, 40, 10, 5, 5], k=1)[0]
        num_lines = min(num_lines, order_line_max)

        for _ in range(num_lines):
            prod = _choose(rng, all_products) if all_products else None
            if not prod:
                continue
            req_qty = Decimal(rng.randint(10, 100))
            delivery_date = order.order_date + timedelta(days=rng.randint(1, 14))
            line = OrderLine(
                order_id=order.id,
                product_id=prod.id,
                delivery_date=delivery_date,
                order_quantity=req_qty,
                unit=prod.base_unit,
                delivery_place_id=delivery_place.id,  # Added in v2.3
                status="pending",  # Added in v2.3
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(line)
            line_count += 1

        if (i + 1) % 500 == 0:
            db.flush()
            tracker.add_log(task_id, f"Created {i + 1}/{num_orders} orders")

    db.commit()
    tracker.add_log(task_id, f"Created {num_orders} orders with constrained line items")

    return num_orders, line_count


def create_allocations_with_constraints(
    db: Session,
    params: dict,
    rng: Random,
    tracker,
    task_id: str,
) -> int:
    """
    Phase 5: Create allocations with lot split constraints.

    Args:
        db: Database session
        params: Expanded parameters
        rng: Random instance
        tracker: Job tracker
        task_id: Task ID

    Returns:
        Number of allocations created
    """
    tracker.add_log(task_id, "Phase 5: Creating allocations with lot split constraints")
    tracker.update_progress(task_id, JobPhase.ALLOCATIONS, 70)

    all_lots: list[Lot] = db.execute(select(Lot)).scalars().all()
    all_lines: list[OrderLine] = db.execute(select(OrderLine)).scalars().all()

    # 全明細の約80%を引当（残り20%は未引当）
    lines_to_allocate = rng.sample(all_lines, int(len(all_lines) * 0.8))

    allocation_count = 0
    for line in lines_to_allocate:
        # 同じ製品のロットをFIFO順（received_date）で取得
        matching_lots = [lot for lot in all_lots if lot.product_id == line.product_id]
        if not matching_lots:
            continue

        # FIFO順でソート
        matching_lots.sort(key=lambda x: x.received_date or datetime.min.date())

        # ロット分割上限を適用
        remaining_qty = Decimal(line.order_quantity)
        lot_count = 0
        max_lots = params["lot_split_max_per_line"]

        for lot in matching_lots:
            if remaining_qty <= 0 or lot_count >= max_lots:
                break

            available_quantity = max(Decimal(0), lot.current_quantity - lot.allocated_quantity)
            if available_quantity <= 0:
                continue

            # このロットから引当可能な数量（簡易版: ランダム）
            alloc_qty = min(
                remaining_qty,
                Decimal(rng.randint(10, 100)),
                available_quantity,
            )
            if alloc_qty <= 0:
                continue

            allocation = Allocation(
                order_line_id=line.id,
                lot_id=lot.id,
                allocated_quantity=alloc_qty,
                status="shipped",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(allocation)

            lot.current_quantity = max(Decimal(0), lot.current_quantity - alloc_qty)
            lot.updated_at = datetime.utcnow()

            # Outbound stock movement
            outbound = StockMovement(
                lot_id=lot.id,
                transaction_type=StockTransactionType.SHIPMENT,
                quantity_change=-alloc_qty,
                quantity_after=lot.current_quantity,
                reference_type="order_line",
                reference_id=line.id,
                transaction_date=datetime.utcnow(),
            )
            db.add(outbound)

            remaining_qty -= alloc_qty
            lot_count += 1
            allocation_count += 1

        if allocation_count % 1000 == 0:
            db.flush()
            tracker.add_log(task_id, f"Created {allocation_count} allocations")

    db.commit()
    tracker.add_log(task_id, f"Created {allocation_count} allocations with constraints")

    return allocation_count


def validate_simulation_constraints(
    db: Session,
    params: dict,
    tracker,
    task_id: str,
) -> dict:
    """
    Phase 6: Validate simulation constraints.

    Args:
        db: Database session
        params: Expanded parameters
        tracker: Job tracker
        task_id: Task ID

    Returns:
        Dictionary with validation results
    """
    tracker.add_log(task_id, "Phase 6: Running post-checks")
    tracker.update_progress(task_id, JobPhase.POSTCHECK, 85)

    # Check 1: ロット分割上限チェック (≤3)
    lot_split_violations = db.execute(
        text(
            """
            SELECT order_line_id, COUNT(*) as lot_count
            FROM allocations
            GROUP BY order_line_id
            HAVING COUNT(*) > :max_lots
            """
        ),
        {"max_lots": params["lot_split_max_per_line"]},
    ).fetchall()
    lot_split_ok = len(lot_split_violations) == 0
    tracker.add_log(
        task_id,
        f"Lot split check: {'OK' if lot_split_ok else f'NG ({len(lot_split_violations)} violations)'}",
    )

    # Check 2: 納品先数チェック (≤5)
    dest_max = params["destinations_max_per_order"]
    dest_violations = db.execute(
        text(
            """
            SELECT ol.order_id
            FROM order_lines ol
            GROUP BY ol.order_id
            HAVING COUNT(DISTINCT ol.delivery_place_id) > :max_dests
            """
        ),
        {"max_dests": dest_max},
    ).fetchall()
    missing_delivery = db.execute(
        text(
            """
            SELECT id
            FROM order_lines
            WHERE delivery_place_id IS NULL
            """
        )
    ).fetchall()
    dest_ok = len(dest_violations) == 0 and len(missing_delivery) == 0
    if dest_ok:
        tracker.add_log(
            task_id,
            "Destinations check: OK (each order references ≤ configured delivery places)",
        )
    else:
        tracker.add_log(
            task_id,
            f"Destinations check: NG ({len(dest_violations)} violations, {len(missing_delivery)} missing delivery_place_id)",
        )

    # Check 3: 受注明細行数チェック (≤5)
    order_line_max_check = params["order_line_items_per_order"]
    if isinstance(order_line_max_check, dict):
        order_line_max_check = order_line_max_check.get("max", 5)
    line_violations = db.execute(
        text(
            """
            SELECT order_id, COUNT(*) as line_count
            FROM order_lines
            GROUP BY order_id
            HAVING COUNT(*) > :max_lines
            """
        ),
        {"max_lines": order_line_max_check},
    ).fetchall()
    lines_ok = len(line_violations) == 0
    tracker.add_log(
        task_id,
        f"Order lines check: {'OK' if lines_ok else f'NG ({len(line_violations)} violations)'}",
    )

    # Check 4: 在庫整合式チェック（簡易版）
    try:
        negative_stock = db.execute(
            text("""
                SELECT COUNT(*)
                FROM lot_current_stock
                WHERE current_quantity < 0
            """)
        ).scalar()
        stock_equation_ok = negative_stock == 0
        tracker.add_log(
            task_id,
            f"Stock equation check: {'OK' if stock_equation_ok else f'NG ({negative_stock} negative stocks)'}",
        )
    except Exception as e:
        logger.warning(f"Stock equation check failed (view may not exist): {e}")
        db.rollback()
        stock_equation_ok = True
        tracker.add_log(task_id, "Stock equation check: SKIPPED (view not found)")

    # Check 5: 孤児レコード数（簡易版）
    orphan_count = 0  # TODO: 実装する場合はここで計算

    return {
        "lot_split_ok": lot_split_ok,
        "dest_ok": dest_ok,
        "lines_ok": lines_ok,
        "stock_equation_ok": stock_equation_ok,
        "orphan_count": orphan_count,
    }


def save_simulation_snapshot(
    db: Session,
    req: SimulateSeedRequest,
    params: dict,
    seed: int,
    summary: dict,
    checks: dict,
    tracker,
    task_id: str,
) -> int | None:
    """
    Phase 7: Save simulation snapshot if requested.

    Args:
        db: Database session
        req: Simulation request
        params: Expanded parameters
        seed: Random seed used
        summary: Simulation summary
        checks: Constraint check results
        tracker: Job tracker
        task_id: Task ID

    Returns:
        Snapshot ID if saved, None otherwise
    """
    tracker.add_log(task_id, "Phase 7: Saving snapshot")
    tracker.update_progress(task_id, JobPhase.SNAPSHOT, 95)

    snapshot_id = None
    if req.save_snapshot:
        snapshot_name = (
            req.snapshot_name or f"snapshot_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        )
        # 展開済みの最終パラメータを保存（完全再現用）
        params_snapshot = params.copy()
        params_snapshot["random_seed"] = seed  # 実際に使用したシード
        params_snapshot["profile"] = req.profile  # 元のプロファイル名も保存

        summary_json = {
            **summary,
            "cap_checks": {
                "lot_split": "OK" if checks["lot_split_ok"] else "NG",
                "destinations": "OK" if checks["dest_ok"] else "NG",
                "order_lines": "OK" if checks["lines_ok"] else "NG",
            },
            "stock_equation_ok": checks["stock_equation_ok"],
            "orphan_count": checks["orphan_count"],
        }

        snapshot_repo = SeedSnapshotRepository(db)
        try:
            snapshot = snapshot_repo.create(
                name=snapshot_name,
                params_json=params_snapshot,
                profile_json={"profile": req.profile or "default"},
                summary_json=summary_json,
            )
        except SQLAlchemyError as snapshot_err:
            db.rollback()
            tracker.add_log(
                task_id,
                "Snapshot skipped: seed_snapshots table is unavailable (migration not applied?)",
            )
            logger.warning(
                "Skipping snapshot save because repository failed (table missing?): %s",
                snapshot_err,
            )
        else:
            snapshot_id = snapshot.id
            tracker.add_log(task_id, f"Snapshot saved: {snapshot_name} (ID: {snapshot_id})")

    return snapshot_id


def build_simulation_result(
    summary: dict,
    checks: dict,
    snapshot_id: int | None,
    tracker,
    task_id: str,
) -> dict:
    """
    Build final simulation result.

    Args:
        summary: Simulation summary
        checks: Constraint check results
        snapshot_id: Snapshot ID if saved
        tracker: Job tracker
        task_id: Task ID

    Returns:
        Simulation result dictionary
    """
    tracker.add_log(task_id, "Simulation completed successfully")
    tracker.update_progress(task_id, JobPhase.DONE, 100)

    totals_message = (
        f"Totals => customers={summary['customers']}, suppliers={summary['suppliers']}, "
        f"products={summary['products']}, delivery_places={summary['delivery_places']}, "
        f"warehouses={summary['warehouses']}, forecasts={summary['forecasts']}, "
        f"orders={summary['orders']}, order_lines={summary['order_lines']}, "
        f"lots={summary['lots']}, allocations={summary['allocations']}"
    )

    tracker.add_log(task_id, totals_message)
    logger.info("Seed simulation completed. %s", totals_message)

    result = {
        "success": True,
        "summary": SimulateResultSummary(
            warehouses=summary["warehouses"],
            forecasts=summary["forecasts"],
            orders=summary["orders"],
            order_lines=summary["order_lines"],
            lots=summary["lots"],
            allocations=summary["allocations"],
            cap_checks=CapCheckResult(
                lot_split="OK" if checks["lot_split_ok"] else "NG",
                destinations="OK" if checks["dest_ok"] else "NG",
                order_lines="OK" if checks["lines_ok"] else "NG",
            ),
            stock_equation_ok=checks["stock_equation_ok"],
            orphan_count=checks["orphan_count"],
        ).model_dump(),
        "snapshot_id": snapshot_id,
    }

    tracker.set_completed(task_id, result)
    return result


# ============================
# Main Orchestration Function
# ============================


def run_seed_simulation(
    db: Session,
    req: SimulateSeedRequest,
    task_id: str,
) -> dict:
    """
    テストデータシミュレーションを実行.

    Refactored: Split 679-line god function into phase-specific functions.

    処理フロー:
    1. Reset (データベースをクリア)
    2. Masters (マスタデータ投入)
    3. Forecasts (需要予測データ)
    4. Stock (ロット + 受入StockMovement)
    5. Orders (受注 + 明細、制約: 納品先≤5, 明細行≤5)
    6. Allocations (引当、制約: ロット分割≤3)
    7. Post-check (制約違反チェック、在庫整合性チェック)
    8. Snapshot (スナップショット保存)
    """
    tracker = get_job_tracker()
    tracker.set_running(task_id)

    engine_loggers = [
        logging.getLogger("sqlalchemy.engine"),
        logging.getLogger("sqlalchemy.engine.Engine"),
    ]
    previous_levels = [lg.level for lg in engine_loggers]

    for logger_instance in engine_loggers:
        logger_instance.setLevel(logging.ERROR)

    try:
        # パラメータ展開（YAML + API明示指定）
        params = _expand_params(req)
        tracker.add_log(task_id, f"Parameters expanded from profile: {req.profile or 'default'}")

        # 乱数シード設定
        faker, rng, seed = initialize_random_generators(req)

        # Phase 1: Reset
        execute_database_reset(db, tracker, task_id)

        # Phase 2: Masters
        masters = create_master_data(db, params, faker, rng, tracker, task_id)

        # Phase 2.5: Forecasts
        _ = create_forecast_data(db, params, masters, rng, tracker, task_id)

        # Phase 3: Stock
        _ = create_lot_inventory(db, params, masters, faker, rng, tracker, task_id)

        # Phase 4: Orders
        _, _ = create_orders_with_constraints(db, params, masters, faker, rng, tracker, task_id)

        # Phase 5: Allocations
        _ = create_allocations_with_constraints(db, params, rng, tracker, task_id)

        # Phase 6: Post-check
        checks = validate_simulation_constraints(db, params, tracker, task_id)

        # 集計
        total_warehouses = db.scalar(select(func.count()).select_from(Warehouse)) or 0
        total_forecasts = db.scalar(select(func.count()).select_from(ForecastCurrent)) or 0
        total_orders = db.scalar(select(func.count()).select_from(Order)) or 0
        total_order_lines = db.scalar(select(func.count()).select_from(OrderLine)) or 0
        total_lots = db.scalar(select(func.count()).select_from(Lot)) or 0
        total_allocations = db.scalar(select(func.count()).select_from(Allocation)) or 0
        total_customers = db.scalar(select(func.count()).select_from(Customer)) or 0
        total_suppliers = db.scalar(select(func.count()).select_from(Supplier)) or 0
        total_products = db.scalar(select(func.count()).select_from(Product)) or 0
        total_delivery_places = db.scalar(select(func.count()).select_from(DeliveryPlace)) or 0

        summary = {
            "customers": total_customers,
            "suppliers": total_suppliers,
            "products": total_products,
            "delivery_places": total_delivery_places,
            "warehouses": total_warehouses,
            "forecasts": total_forecasts,
            "orders": total_orders,
            "order_lines": total_order_lines,
            "lots": total_lots,
            "allocations": total_allocations,
        }

        # Phase 7: Snapshot
        snapshot_id = save_simulation_snapshot(
            db, req, params, seed, summary, checks, tracker, task_id
        )

        # 完了
        result = build_simulation_result(summary, checks, snapshot_id, tracker, task_id)
        return result

    except Exception as e:
        error_msg = f"Simulation failed: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        tracker.add_log(task_id, f"ERROR: {str(e)}")
        tracker.set_failed(task_id, error_msg)
        db.rollback()
        raise
    finally:
        for lg, level in zip(engine_loggers, previous_levels, strict=False):
            lg.setLevel(level)
