# backend/app/services/seeds_service.py
from __future__ import annotations
from datetime import datetime, timedelta
from random import Random
from typing import List, Sequence

from faker import Faker
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.schemas.admin_seeds import SeedRequest, SeedResponse, SeedSummary, ActualCounts
from app.models.masters import Customer, Product, Warehouse, Supplier, DeliveryPlace
from app.models.inventory import Lot, StockMovement
from app.models.orders import Order, OrderLine, Allocation


def _choose(rng: Random, seq: Sequence):
    return seq[rng.randrange(0, len(seq))]


def _next_code(prefix: str, width: int, rng: Random, existing: set[str]) -> str:
    """
    既存集合と照合しながら、prefix+数値(ゼロ埋め可)の一意なコードを返す。
    例: prefix='C', width=4 -> 'C1043'
    """
    lo = 10 ** (width - 1)
    hi = (10 ** width) - 1
    while True:
        n = rng.randint(lo, hi)
        code = f"{prefix}{n}"
        if code not in existing:
            existing.add(code)
            return code


def create_seed_data(db: Session, req: SeedRequest) -> SeedResponse:
    seed = req.seed if req.seed is not None else 42
    faker = Faker("ja_JP")
    faker.seed_instance(seed)
    rng = Random(seed)

    created_customers: List[Customer] = []
    created_suppliers: List[Supplier] = []
    created_delivery_places: List[DeliveryPlace] = []
    created_products: List[Product] = []
    created_warehouses: List[Warehouse] = []
    created_lots: List[Lot] = []
    created_orders: List[Order] = []
    created_lines: List[OrderLine] = []
    created_allocs: List[Allocation] = []

    # ==========================================================
    # 1) masters（Customer / Product / Warehouse をUPSERTで投入）
    #    ※ 重複時はスキップ。コードは既存と衝突しないよう生成。
    # ==========================================================

    # --- Customer ---
    if req.customers > 0:
        existing_customer_codes = {c for (c,) in db.execute(select(Customer.customer_code)).all()} if not req.dry_run else set()
        customer_rows = [
            {
                "customer_code": _next_code("C", 4, rng, existing_customer_codes),
                "customer_name": faker.company(),
                "created_at": datetime.utcnow(),
            }
            for _ in range(req.customers)
        ]
        if not req.dry_run:
            stmt = pg_insert(Customer).values(customer_rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=[Customer.customer_code])
            db.execute(stmt)
            db.flush()
        created_customers = [Customer(**row) for row in customer_rows]

    # --- Supplier ---
    if req.suppliers > 0:
        existing_supplier_codes = {c for (c,) in db.execute(select(Supplier.supplier_code)).all()} if not req.dry_run else set()
        supplier_rows = [
            {
                "supplier_code": _next_code("S", 4, rng, existing_supplier_codes),
                "supplier_name": f"{faker.company()}商事",
                "created_at": datetime.utcnow(),
            }
            for _ in range(req.suppliers)
        ]
        if not req.dry_run:
            stmt = pg_insert(Supplier).values(supplier_rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=[Supplier.supplier_code])
            db.execute(stmt)
            db.flush()
        created_suppliers = [Supplier(**row) for row in supplier_rows]

    # --- DeliveryPlace ---
    if req.delivery_places > 0:
        existing_dp_codes = {c for (c,) in db.execute(select(DeliveryPlace.delivery_place_code)).all()} if not req.dry_run else set()
        delivery_place_rows = [
            {
                "delivery_place_code": _next_code("D", 3, rng, existing_dp_codes),
                "delivery_place_name": f"{faker.city()}配送センター",
                "address": faker.address(),
                "postal_code": faker.postcode(),
                "created_at": datetime.utcnow(),
            }
            for _ in range(req.delivery_places)
        ]
        if not req.dry_run:
            stmt = pg_insert(DeliveryPlace).values(delivery_place_rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=[DeliveryPlace.delivery_place_code])
            db.execute(stmt)
            db.flush()
        created_delivery_places = [DeliveryPlace(**row) for row in delivery_place_rows]

    # --- Product ---
    if req.products > 0:
        # 既存のdelivery_placesを取得（Product生成時に参照するため）
        existing_dps = []
        if not req.dry_run:
            existing_dps = db.execute(select(DeliveryPlace)).scalars().all()
        elif created_delivery_places:
            existing_dps = created_delivery_places

        existing_product_codes = {c for (c,) in db.execute(select(Product.product_code)).all()} if not req.dry_run else set()
        product_rows = []
        for _ in range(req.products):
            row = {
                "product_code": _next_code("P", 5, rng, existing_product_codes),
                "product_name": faker.bs().title(),
                "internal_unit": "PCS",
                "created_at": datetime.utcnow(),
            }
            # delivery_place_idをランダムに設定（存在する場合）
            if existing_dps:
                dp = _choose(rng, existing_dps)
                row["delivery_place_id"] = dp.id if not req.dry_run else None
            product_rows.append(row)

        if not req.dry_run:
            stmt = pg_insert(Product).values(product_rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=[Product.product_code])
            db.execute(stmt)
            db.flush()
        created_products = [Product(**row) for row in product_rows]

    # --- Warehouse ---
    if req.warehouses > 0:
        existing_wh_codes = {c for (c,) in db.execute(select(Warehouse.warehouse_code)).all()} if not req.dry_run else set()
        warehouse_rows = [
            {
                "warehouse_code": _next_code("W", 2, rng, existing_wh_codes),
                "warehouse_name": f"{faker.city()}倉庫",
                "created_at": datetime.utcnow(),
            }
            for _ in range(req.warehouses)
        ]
        if not req.dry_run:
            stmt = pg_insert(Warehouse).values(warehouse_rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=[Warehouse.warehouse_code])
            db.execute(stmt)
            db.flush()
        created_warehouses = [Warehouse(**row) for row in warehouse_rows]

    # DBに実データが必要な後続処理用に、利用可能な一覧を取得
    if not req.dry_run:
        all_customers: List[Customer] = db.execute(select(Customer)).scalars().all()
        all_suppliers: List[Supplier] = db.execute(select(Supplier)).scalars().all()
        all_delivery_places: List[DeliveryPlace] = db.execute(select(DeliveryPlace)).scalars().all()
        all_products: List[Product] = db.execute(select(Product)).scalars().all()
        all_warehouses: List[Warehouse] = db.execute(select(Warehouse)).scalars().all()
    else:
        # dry_run時は作成予定のデータを使って疑似的に進める（idはNone）
        all_customers = created_customers
        all_suppliers = created_suppliers
        all_delivery_places = created_delivery_places
        all_products = created_products
        all_warehouses = created_warehouses

    # ==========================================================
    # 2) lots（在庫） + 受入ストック移動（StockMovement）
    # ==========================================================
    for _ in range(req.lots):
        prod = _choose(rng, all_products) if all_products else None
        wh = _choose(rng, all_warehouses) if all_warehouses else None
        supplier = _choose(rng, all_suppliers) if all_suppliers else None
        days = rng.randint(0, 360)
        l = Lot(
            product_id=(prod.id if (prod and not req.dry_run) else None),
            warehouse_id=(wh.id if (wh and not req.dry_run) else None),
            supplier_id=(supplier.id if (supplier and not req.dry_run) else None),
            lot_number=faker.unique.bothify(text="LOT-########"),
            receipt_date=datetime.utcnow().date() - timedelta(days=rng.randint(0, 30)),
            expiry_date=datetime.utcnow().date() + timedelta(days=360 - days),
            created_at=datetime.utcnow(),
        )
        created_lots.append(l)
        if not req.dry_run:
            db.add(l)
            db.flush()  # l.id を得る
            # 受入数量（適当な正数）
            recv_qty = rng.randint(5, 200)
            m = StockMovement(
                product_id=l.product_id,
                warehouse_id=l.warehouse_id,
                lot_id=l.id,
                reason="receipt",
                quantity_delta=recv_qty,               # NUMERIC(15,4) だが整数でOK
                occurred_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
            db.add(m)

    if not req.dry_run:
        db.flush()

    # ==========================================================
    # 3) orders & lines（受注と明細）
    # ==========================================================
    for _ in range(req.orders):
        cust = _choose(rng, all_customers) if all_customers else None
        o = Order(
            customer_id=(cust.id if (cust and not req.dry_run) else None),
            order_no=faker.unique.bothify(text="SO-########"),
            order_date=datetime.utcnow().date() - timedelta(days=rng.randint(0, 14)),
            status="draft",
            created_at=datetime.utcnow(),
        )
        created_orders.append(o)
        if not req.dry_run:
            db.add(o)
            db.flush()

        # ライン数 1-3
        num_lines = rng.randint(1, 3)
        for line_idx in range(num_lines):
            prod = _choose(rng, all_products) if all_products else None
            req_qty = rng.randint(1, 50)
            line = OrderLine(
                order_id=(o.id if not req.dry_run else None),
                product_id=(prod.id if (prod and not req.dry_run) else None),
                line_no=line_idx + 1,
                quantity=req_qty,
                created_at=datetime.utcnow(),
            )
            created_lines.append(line)
            if not req.dry_run:
                db.add(line)
        if not req.dry_run:
            db.flush()

    # ==========================================================
    # 4) allocations（簡易版：受注明細の30%程度にロットを引当）
    # ==========================================================
    if not req.dry_run and created_lots:
        all_lots: List[Lot] = db.execute(select(Lot)).scalars().all()
        all_lines: List[OrderLine] = db.execute(select(OrderLine)).scalars().all()

        # 明細の30%程度にランダムに引当
        sample_size = max(1, int(len(all_lines) * 0.3))
        lines_to_allocate = rng.sample(all_lines, min(sample_size, len(all_lines)))

        for line in lines_to_allocate:
            # 同じ製品のロットを検索
            matching_lots = [lot for lot in all_lots if lot.product_id == line.product_id]
            if not matching_lots:
                continue

            # ランダムにロットを選択
            selected_lot = _choose(rng, matching_lots)

            # 引当数量（明細数量の50-100%）
            alloc_qty = rng.randint(int(line.quantity * 0.5), int(line.quantity))
            alloc_qty = max(1, min(alloc_qty, line.quantity))

            # destination_idをランダムに設定（delivery_placesが存在する場合）
            destination_id = None
            if all_delivery_places:
                destination_id = _choose(rng, all_delivery_places).id

            # Allocation作成
            allocation = Allocation(
                order_line_id=line.id,
                lot_id=selected_lot.id,
                allocated_qty=alloc_qty,
                destination_id=destination_id,
                created_at=datetime.utcnow(),
            )
            created_allocs.append(allocation)
            db.add(allocation)

            # StockMovement（出庫：負の数量）
            outbound_movement = StockMovement(
                product_id=selected_lot.product_id,
                warehouse_id=selected_lot.warehouse_id,
                lot_id=selected_lot.id,
                reason="outbound",
                quantity_delta=-alloc_qty,  # 負の数量
                occurred_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
            db.add(outbound_movement)

        db.flush()

    if not req.dry_run:
        db.commit()

    # 実際のDB件数を取得（dry_run=falseの場合のみ）
    actual_counts = None
    if not req.dry_run:
        from sqlalchemy import func

        actual_counts = ActualCounts(
            customers=db.scalar(select(func.count()).select_from(Customer)) or 0,
            suppliers=db.scalar(select(func.count()).select_from(Supplier)) or 0,
            delivery_places=db.scalar(select(func.count()).select_from(DeliveryPlace)) or 0,
            products=db.scalar(select(func.count()).select_from(Product)) or 0,
            warehouses=db.scalar(select(func.count()).select_from(Warehouse)) or 0,
            lots=db.scalar(select(func.count()).select_from(Lot)) or 0,
            stock_movements=db.scalar(select(func.count()).select_from(StockMovement)) or 0,
            orders=db.scalar(select(func.count()).select_from(Order)) or 0,
            order_lines=db.scalar(select(func.count()).select_from(OrderLine)) or 0,
            allocations=db.scalar(select(func.count()).select_from(Allocation)) or 0,
        )

    return SeedResponse(
        dry_run=req.dry_run,
        seed=seed,
        summary=SeedSummary(
            customers=len(created_customers),
            suppliers=len(created_suppliers),
            delivery_places=len(created_delivery_places),
            products=len(created_products),
            warehouses=len(created_warehouses),
            lots=len(created_lots),
            orders=len(created_orders),
            order_lines=len(created_lines),
            allocations=len(created_allocs),
        ),
        actual_counts=actual_counts,
    )
