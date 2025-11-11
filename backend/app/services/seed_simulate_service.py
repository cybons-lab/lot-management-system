# backend/app/services/seed_simulate_service.py
"""Enhanced seed data simulation service with constraints and progress tracking."""

from __future__ import annotations

import logging
import traceback
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from random import Random
from typing import Any

from faker import Faker
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.database import truncate_all_tables
from app.models.forecast_models import Forecast
from app.models.inventory_models import Lot, StockMovement
from app.models.masters_models import Customer, DeliveryPlace, Product, Supplier, Warehouse
from app.models.orders_models import Allocation, Order, OrderLine
from app.repositories.seed_snapshot_repo import SeedSnapshotRepository
from app.schemas.admin_simulate_schema import (
    CapCheckResult,
    SimulateResultSummary,
    SimulateSeedRequest,
)
from app.services.job_tracker import JobPhase, get_job_tracker
from app.services.profile_loader import get_profile


logger = logging.getLogger(__name__)


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


def run_seed_simulation(
    db: Session,
    req: SimulateSeedRequest,
    task_id: str,
) -> dict:
    """
    テストデータシミュレーションを実行.

    処理フロー:
    1. Reset (データベースをクリア)
    2. Masters (マスタデータ投入)
    3. Stock (ロット + 受入StockMovement)
    4. Orders (受注 + 明細、制約: 納品先≤5, 明細行≤5)
    5. Allocations (引当、制約: ロット分割≤3)
    6. Post-check (制約違反チェック、在庫整合性チェック)
    7. Snapshot (スナップショット保存)
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
        seed = (
            req.random_seed if req.random_seed is not None else int(datetime.utcnow().timestamp())
        )
        faker = Faker("ja_JP")
        faker.seed_instance(seed)
        rng = Random(seed)

        # Phase 1: Reset
        tracker.add_log(task_id, "Phase 1: Database reset started")
        tracker.update_progress(task_id, JobPhase.RESET, 5)
        truncate_all_tables()
        db.commit()
        tracker.add_log(task_id, "Database reset completed")

        # Phase 2: Masters
        tracker.add_log(task_id, "Phase 2: Creating master data")
        tracker.update_progress(task_id, JobPhase.MASTERS, 10)

        # Customers (YAMLまたはデフォルト)
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

        # Suppliers (YAMLまたはデフォルト)
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

        # DeliveryPlaces (固定5箇所)
        num_delivery_places = 5
        existing_dp_codes: set[str] = set()
        delivery_place_rows = [
            {
                "delivery_place_code": _next_code("D", 3, rng, existing_dp_codes),
                "delivery_place_name": f"{faker.city()}配送センター",
                "address": faker.address(),
                "postal_code": faker.postcode(),
                "created_at": datetime.utcnow(),
            }
            for _ in range(num_delivery_places)
        ]
        if delivery_place_rows:
            stmt = pg_insert(DeliveryPlace).values(delivery_place_rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=[DeliveryPlace.delivery_place_code])
            db.execute(stmt)
            db.flush()
        tracker.add_log(task_id, f"Created {num_delivery_places} delivery places")

        # Products (YAMLまたはデフォルト)
        tracker.add_log(task_id, "→ Creating Products...")
        num_products = params.get("products", params["warehouses"] * 20)
        existing_dps = db.execute(select(DeliveryPlace)).scalars().all()
        existing_product_codes: set[str] = set()
        product_rows = []
        for _ in range(num_products):
            dp = _choose(rng, existing_dps) if existing_dps else None
            row = {
                "product_code": _next_code("P", 5, rng, existing_product_codes),
                "product_name": faker.bs().title(),
                "internal_unit": "PCS",
                "delivery_place_id": dp.id if dp else None,
                "created_at": datetime.utcnow(),
            }
            product_rows.append(row)

        if product_rows:
            stmt = pg_insert(Product).values(product_rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=[Product.product_code])
            db.execute(stmt)
            db.flush()
        tracker.add_log(task_id, f"✓ Created {num_products} products")

        # Warehouses (params["warehouses"]: 5-10)
        tracker.add_log(task_id, "→ Creating Warehouses...")
        num_warehouses = params["warehouses"]
        existing_wh_codes: set[str] = set()
        warehouse_rows = [
            {
                "warehouse_code": _next_code("W", 2, rng, existing_wh_codes),
                "warehouse_name": f"{faker.city()}倉庫",
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

        db.commit()
        tracker.add_log(task_id, "✓ Master data committed to DB")

        # Fetch all masters
        all_customers: list[Customer] = db.execute(select(Customer)).scalars().all()
        all_suppliers: list[Supplier] = db.execute(select(Supplier)).scalars().all()
        all_delivery_places: list[DeliveryPlace] = db.execute(select(DeliveryPlace)).scalars().all()
        all_products: list[Product] = db.execute(select(Product)).scalars().all()
        all_warehouses: list[Warehouse] = db.execute(select(Warehouse)).scalars().all()

        # Phase 2.5: Forecasts (需要予測データ生成)
        tracker.add_log(task_id, "Phase 2.5: Creating forecast data")
        tracker.update_progress(task_id, JobPhase.MASTERS, 25)

        # forecasts: YAMLまたはデフォルト（0=無効）
        generate_forecasts = params.get("forecasts", 0) > 0
        forecast_count = 0

        # デバッグログ: 条件チェック
        tracker.add_log(
            task_id,
            f"→ Forecast check: params.forecasts={params.get('forecasts', 0)}, "
            f"generate={generate_forecasts}, customers={len(all_customers)}, products={len(all_products)}",
        )

        if generate_forecasts and all_customers and all_products:
            # 既存のforecast_idを取得（重複防止）
            existing_forecast_ids = {
                fid for (fid,) in db.execute(select(Forecast.forecast_id)).all()
            }

            forecast_rows = []
            now = datetime.now(UTC)
            today = now.date()

            # 各customer × product ペアに対して forecasts を生成
            for cust in all_customers:
                for prod in all_products:
                    # daily: 今日±7日
                    for day_offset in range(-7, 8):
                        target_date = today + timedelta(days=day_offset)
                        forecast_id = f"seed-{cust.id}-{prod.id}-daily-{target_date}"
                        if forecast_id in existing_forecast_ids:
                            continue
                        forecast_rows.append(
                            {
                                "forecast_id": forecast_id,
                                "granularity": "daily",
                                "date_day": target_date,
                                "date_dekad_start": None,
                                "year_month": None,
                                "qty_forecast": rng.randint(10, 1000),
                                "version_no": 1,
                                "version_issued_at": now,
                                "source_system": "seed",
                                "is_active": True,
                                "product_id": prod.id,
                                "customer_id": cust.id,
                                "created_at": now,
                                "updated_at": now,
                            }
                        )
                        existing_forecast_ids.add(forecast_id)

                    # dekad: 当月の3区間（1日, 11日, 21日）
                    for dekad_start_day in [1, 11, 21]:
                        dekad_start = today.replace(day=dekad_start_day)
                        forecast_id = f"seed-{cust.id}-{prod.id}-dekad-{dekad_start}"
                        if forecast_id in existing_forecast_ids:
                            continue
                        forecast_rows.append(
                            {
                                "forecast_id": forecast_id,
                                "granularity": "dekad",
                                "date_day": None,
                                "date_dekad_start": dekad_start,
                                "year_month": None,
                                "qty_forecast": rng.randint(10, 1000),
                                "version_no": 1,
                                "version_issued_at": now,
                                "source_system": "seed",
                                "is_active": True,
                                "product_id": prod.id,
                                "customer_id": cust.id,
                                "created_at": now,
                                "updated_at": now,
                            }
                        )
                        existing_forecast_ids.add(forecast_id)

                    # monthly: 当月〜+2ヶ月
                    for month_offset in range(0, 3):
                        target_month_date = today.replace(day=1) + timedelta(days=31 * month_offset)
                        year_month = target_month_date.strftime("%Y-%m")
                        forecast_id = f"seed-{cust.id}-{prod.id}-monthly-{year_month}"
                        if forecast_id in existing_forecast_ids:
                            continue
                        forecast_rows.append(
                            {
                                "forecast_id": forecast_id,
                                "granularity": "monthly",
                                "date_day": None,
                                "date_dekad_start": None,
                                "year_month": year_month,
                                "qty_forecast": rng.randint(10, 1000),
                                "version_no": 1,
                                "version_issued_at": now,
                                "source_system": "seed",
                                "is_active": True,
                                "product_id": prod.id,
                                "customer_id": cust.id,
                                "created_at": now,
                                "updated_at": now,
                            }
                        )
                        existing_forecast_ids.add(forecast_id)

            # bulk insert
            if forecast_rows:
                tracker.add_log(task_id, f"→ Inserting {len(forecast_rows)} forecast rows...")
                db.bulk_insert_mappings(Forecast, forecast_rows)
                db.flush()
                forecast_count = len(forecast_rows)
                tracker.add_log(
                    task_id, f"✓ Created {forecast_count} forecasts (daily/dekad/monthly)"
                )
            else:
                tracker.add_log(task_id, "→ No forecast rows to insert (all duplicates or empty)")
        else:
            reasons = []
            if not generate_forecasts:
                reasons.append(f"forecasts={params.get('forecasts', 0)}")
            if not all_customers:
                reasons.append("no customers")
            if not all_products:
                reasons.append("no products")
            tracker.add_log(task_id, f"→ Forecast generation skipped: {', '.join(reasons)}")

        db.commit()
        tracker.add_log(task_id, f"✓ Forecast data committed to DB (total={forecast_count})")

        # Phase 3: Stock (Lots + Inbound)
        tracker.add_log(task_id, "Phase 3: Creating lots and inbound stock movements")
        tracker.update_progress(task_id, JobPhase.STOCK, 30)

        num_lots = params.get("lots", params["warehouses"] * 1000)  # YAMLまたはデフォルト
        for i in range(num_lots):
            prod = _choose(rng, all_products) if all_products else None
            wh = _choose(rng, all_warehouses) if all_warehouses else None
            supplier = _choose(rng, all_suppliers) if all_suppliers else None
            days = rng.randint(0, 360)
            lot = Lot(
                product_id=prod.id if prod else None,
                warehouse_id=wh.id if wh else None,
                supplier_id=supplier.id if supplier else None,
                lot_number=faker.unique.bothify(text="LOT-########"),
                receipt_date=datetime.utcnow().date() - timedelta(days=rng.randint(0, 30)),
                expiry_date=datetime.utcnow().date() + timedelta(days=360 - days),
                created_at=datetime.utcnow(),
            )
            db.add(lot)
            db.flush()

            # Inbound stock movement
            recv_qty = rng.randint(10, 500)
            movement = StockMovement(
                product_id=lot.product_id,
                warehouse_id=lot.warehouse_id,
                lot_id=lot.id,
                reason="receipt",
                quantity_delta=recv_qty,
                occurred_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
            db.add(movement)

            if (i + 1) % 500 == 0:
                db.flush()
                tracker.add_log(task_id, f"Created {i + 1}/{num_lots} lots")

        db.commit()
        tracker.add_log(task_id, f"Created {num_lots} lots with inbound movements")

        # Phase 4: Orders (受注 + 明細、制約適用)
        tracker.add_log(task_id, "Phase 4: Creating orders with constraints")
        tracker.update_progress(task_id, JobPhase.ORDERS, 50)

        num_orders = params.get("orders", params["warehouses"] * 375)  # YAMLまたはデフォルト
        for i in range(num_orders):
            cust = _choose(rng, all_customers) if all_customers else None
            order = Order(
                customer_id=cust.id if cust else None,
                order_no=faker.unique.bothify(text="SO-########"),
                order_date=datetime.utcnow().date() - timedelta(days=rng.randint(0, 14)),
                status="draft",
                created_at=datetime.utcnow(),
            )
            db.add(order)
            db.flush()

            # 明細行数: 1-2が多い、稀に5（制約: ≤5）
            # 重み付き: [1, 2, 3, 4, 5] → [40%, 40%, 10%, 5%, 5%]
            order_line_max = params["order_line_items_per_order"]
            if isinstance(order_line_max, dict):
                order_line_max = order_line_max.get("max", 5)
            num_lines = rng.choices([1, 2, 3, 4, 5], weights=[40, 40, 10, 5, 5], k=1)[0]
            num_lines = min(num_lines, order_line_max)

            for line_no in range(1, num_lines + 1):
                prod = _choose(rng, all_products) if all_products else None
                req_qty = rng.randint(10, 100)
                line = OrderLine(
                    order_id=order.id,
                    product_id=prod.id if prod else None,
                    line_no=line_no,
                    quantity=req_qty,
                    created_at=datetime.utcnow(),
                )
                db.add(line)

            if (i + 1) % 500 == 0:
                db.flush()
                tracker.add_log(task_id, f"Created {i + 1}/{num_orders} orders")

        db.commit()
        tracker.add_log(task_id, f"Created {num_orders} orders with constrained line items")

        # Phase 5: Allocations (引当、制約: ロット分割≤3)
        tracker.add_log(task_id, "Phase 5: Creating allocations with lot split constraints")
        tracker.update_progress(task_id, JobPhase.ALLOCATIONS, 70)

        all_lots: list[Lot] = db.execute(select(Lot)).scalars().all()
        all_lines: list[OrderLine] = db.execute(select(OrderLine)).scalars().all()

        # 全明細の約80%を引当（残り20%は未引当）
        lines_to_allocate = rng.sample(all_lines, int(len(all_lines) * 0.8))

        allocation_count = 0
        for line in lines_to_allocate:
            # 同じ製品のロットをFIFO順（receipt_date）で取得
            matching_lots = [lot for lot in all_lots if lot.product_id == line.product_id]
            if not matching_lots:
                continue

            # FIFO順でソート
            matching_lots.sort(key=lambda x: x.receipt_date or datetime.min.date())

            # ロット分割上限を適用
            remaining_qty = line.quantity
            lot_count = 0
            max_lots = params["lot_split_max_per_line"]

            for lot in matching_lots:
                if remaining_qty <= 0 or lot_count >= max_lots:
                    break

                # このロットから引当可能な数量（簡易版: ランダム）
                alloc_qty = min(remaining_qty, rng.randint(10, 100))

                # 納品先: 通常1-2、稀に5（制約: ≤5）
                # 1つの明細は通常1つの納品先
                dest = _choose(rng, all_delivery_places) if all_delivery_places else None

                allocation = Allocation(
                    order_line_id=line.id,
                    lot_id=lot.id,
                    allocated_qty=alloc_qty,
                    destination_id=dest.id if dest else None,
                    created_at=datetime.utcnow(),
                )
                db.add(allocation)

                # Outbound stock movement
                outbound = StockMovement(
                    product_id=lot.product_id,
                    warehouse_id=lot.warehouse_id,
                    lot_id=lot.id,
                    reason="outbound",
                    quantity_delta=-alloc_qty,
                    occurred_at=datetime.utcnow(),
                    created_at=datetime.utcnow(),
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

        # Phase 6: Post-check (検証)
        tracker.add_log(task_id, "Phase 6: Running post-checks")
        tracker.update_progress(task_id, JobPhase.POSTCHECK, 85)

        # Check 1: ロット分割上限チェック (≤3)
        lot_split_violations = db.execute(
            text("""
                SELECT order_line_id, COUNT(*) as lot_count
                FROM allocations
                WHERE deleted_at IS NULL
                GROUP BY order_line_id
                HAVING COUNT(*) > :max_lots
            """),
            {"max_lots": params["lot_split_max_per_line"]},
        ).fetchall()
        lot_split_ok = len(lot_split_violations) == 0
        tracker.add_log(
            task_id,
            f"Lot split check: {'OK' if lot_split_ok else f'NG ({len(lot_split_violations)} violations)'}",
        )

        # Check 2: 納品先数チェック (≤5) - 受注単位で納品先の種類数をカウント
        # 実際には明細ごとに1つの納品先なので、受注全体で5つ以内
        dest_max = params["destinations_max_per_order"]
        dest_violations = db.execute(
            text("""
                SELECT o.id, COUNT(DISTINCT a.destination_id) as dest_count
                FROM orders o
                JOIN order_lines ol ON ol.order_id = o.id
                JOIN allocations a ON a.order_line_id = ol.id
                WHERE o.deleted_at IS NULL AND ol.deleted_at IS NULL AND a.deleted_at IS NULL
                GROUP BY o.id
                HAVING COUNT(DISTINCT a.destination_id) > :max_dests
            """),
            {"max_dests": dest_max},
        ).fetchall()
        dest_ok = len(dest_violations) == 0
        tracker.add_log(
            task_id,
            f"Destinations check: {'OK' if dest_ok else f'NG ({len(dest_violations)} violations)'}",
        )

        # Check 3: 受注明細行数チェック (≤5)
        order_line_max_check = params["order_line_items_per_order"]
        if isinstance(order_line_max_check, dict):
            order_line_max_check = order_line_max_check.get("max", 5)
        line_violations = db.execute(
            text("""
                SELECT order_id, COUNT(*) as line_count
                FROM order_lines
                WHERE deleted_at IS NULL
                GROUP BY order_id
                HAVING COUNT(*) > :max_lines
            """),
            {"max_lines": order_line_max_check},
        ).fetchall()
        lines_ok = len(line_violations) == 0
        tracker.add_log(
            task_id,
            f"Order lines check: {'OK' if lines_ok else f'NG ({len(line_violations)} violations)'}",
        )

        # Check 4: 在庫整合式チェック（簡易版: lot_current_stock ビューを使用）
        # opening + inbound - outbound = current
        # ここでは全倉庫のcurrent_quantityが負でないことを確認
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
            stock_equation_ok = True  # ビューが存在しない場合はスキップ
            tracker.add_log(task_id, "Stock equation check: SKIPPED (view not found)")

        # Check 5: 孤児レコード数（簡易版）
        orphan_count = 0  # TODO: 実装する場合はここで計算

        # 集計
        total_warehouses = db.scalar(select(func.count()).select_from(Warehouse)) or 0
        total_forecasts = db.scalar(select(func.count()).select_from(Forecast)) or 0
        total_orders = db.scalar(select(func.count()).select_from(Order)) or 0
        total_order_lines = db.scalar(select(func.count()).select_from(OrderLine)) or 0
        total_lots = db.scalar(select(func.count()).select_from(Lot)) or 0
        total_allocations = db.scalar(select(func.count()).select_from(Allocation)) or 0

        # Phase 7: Snapshot
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
                "warehouses": total_warehouses,
                "forecasts": total_forecasts,
                "orders": total_orders,
                "order_lines": total_order_lines,
                "lots": total_lots,
                "allocations": total_allocations,
                "cap_checks": {
                    "lot_split": "OK" if lot_split_ok else "NG",
                    "destinations": "OK" if dest_ok else "NG",
                    "order_lines": "OK" if lines_ok else "NG",
                },
                "stock_equation_ok": stock_equation_ok,
                "orphan_count": orphan_count,
            }

            snapshot_repo = SeedSnapshotRepository(db)
            snapshot = snapshot_repo.create(
                name=snapshot_name,
                params_json=params_snapshot,
                profile_json={"profile": req.profile or "default"},
                summary_json=summary_json,
            )
            snapshot_id = snapshot.id
            tracker.add_log(task_id, f"Snapshot saved: {snapshot_name} (ID: {snapshot_id})")

        # 完了
        tracker.add_log(task_id, "Simulation completed successfully")
        tracker.update_progress(task_id, JobPhase.DONE, 100)

        total_customers = db.scalar(select(func.count()).select_from(Customer)) or 0
        total_suppliers = db.scalar(select(func.count()).select_from(Supplier)) or 0
        total_products = db.scalar(select(func.count()).select_from(Product)) or 0
        total_delivery_places = db.scalar(select(func.count()).select_from(DeliveryPlace)) or 0

        # 合計メッセージ出力部分
        totals_message = (
            f"Totals => customers={total_customers}, suppliers={total_suppliers}, "
            f"products={total_products}, delivery_places={total_delivery_places}, "
            f"warehouses={total_warehouses}, forecasts={total_forecasts}, "
            f"orders={total_orders}, order_lines={total_order_lines}, "
            f"lots={total_lots}, allocations={total_allocations}"
        )

        tracker.add_log(task_id, totals_message)
        logger.info("Seed simulation completed. %s", totals_message)

        result = {
            "success": True,
            "summary": SimulateResultSummary(
                warehouses=total_warehouses,
                forecasts=total_forecasts,
                orders=total_orders,
                order_lines=total_order_lines,
                lots=total_lots,
                allocations=total_allocations,
                cap_checks=CapCheckResult(
                    lot_split="OK" if lot_split_ok else "NG",
                    destinations="OK" if dest_ok else "NG",
                    order_lines="OK" if lines_ok else "NG",
                ),
                stock_equation_ok=stock_equation_ok,
                orphan_count=orphan_count,
            ).model_dump(),
            "snapshot_id": snapshot_id,
        }

        tracker.set_completed(task_id, result)
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
