# backend/app/services/seeds_service.py
"""
Seed data generation service with UPSERT strategy.

Refactored: 441-line god function split into entity-specific seed functions.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timedelta
from random import Random

from faker import Faker
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.inventory_models import Lot, StockMovement
from app.models.masters_models import Customer, DeliveryPlace, Product, Supplier, Warehouse
from app.models.orders_models import Allocation, Order, OrderLine
from app.schemas.admin.admin_seeds_schema import (
    ActualCounts,
    SeedRequest,
    SeedResponse,
    SeedSummary,
)


# ============================
# Helper Functions
# ============================


def _choose(rng: Random, seq: Sequence):
    """Randomly choose from sequence."""
    return seq[rng.randrange(0, len(seq))]


def _next_code(prefix: str, width: int, rng: Random, existing: set[str]) -> str:
    """
    Generate unique code with prefix and numeric suffix.

    Args:
        prefix: Code prefix (e.g., "C", "S", "P")
        width: Numeric width
        rng: Random generator
        existing: Set of existing codes (will be updated)

    Returns:
        Unique code (e.g., "C1043")
    """
    lo = 10 ** (width - 1)
    hi = (10**width) - 1
    while True:
        n = rng.randint(lo, hi)
        code = f"{prefix}{n}"
        if code not in existing:
            existing.add(code)
            return code


# ============================
# Refactored: Seed Functions
# ============================


def initialize_seed_generators(req: SeedRequest) -> tuple[Faker, Random, int]:
    """
    Initialize Faker and Random generators.

    Args:
        req: Seed request

    Returns:
        Tuple of (faker, rng, seed)
    """
    seed = req.seed if req.seed is not None else 42
    faker = Faker("ja_JP")
    faker.seed_instance(seed)
    rng = Random(seed)
    return faker, rng, seed


def seed_customers(db: Session, req: SeedRequest, faker: Faker, rng: Random) -> list[Customer]:
    """
    Create customer master data.

    Args:
        db: Database session
        req: Seed request
        faker: Faker instance
        rng: Random generator

    Returns:
        List of created customers
    """
    if req.customers <= 0:
        return []

    existing_customer_codes = (
        {c for (c,) in db.execute(select(Customer.customer_code)).all()}
        if not req.dry_run
        else set()
    )

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

    return [Customer(**row) for row in customer_rows]


def seed_suppliers(db: Session, req: SeedRequest, faker: Faker, rng: Random) -> list[Supplier]:
    """
    Create supplier master data.

    Args:
        db: Database session
        req: Seed request
        faker: Faker instance
        rng: Random generator

    Returns:
        List of created suppliers
    """
    if req.suppliers <= 0:
        return []

    existing_supplier_codes = (
        {c for (c,) in db.execute(select(Supplier.supplier_code)).all()}
        if not req.dry_run
        else set()
    )

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

    return [Supplier(**row) for row in supplier_rows]


def seed_delivery_places(
    db: Session, req: SeedRequest, faker: Faker, rng: Random
) -> list[DeliveryPlace]:
    """
    Create delivery place master data.

    Args:
        db: Database session
        req: Seed request
        faker: Faker instance
        rng: Random generator

    Returns:
        List of created delivery places
    """
    if req.delivery_places <= 0:
        return []

    existing_dp_codes = (
        {c for (c,) in db.execute(select(DeliveryPlace.delivery_place_code)).all()}
        if not req.dry_run
        else set()
    )

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

    return [DeliveryPlace(**row) for row in delivery_place_rows]


def seed_products(
    db: Session,
    req: SeedRequest,
    faker: Faker,
    rng: Random,
    created_delivery_places: list[DeliveryPlace],
) -> list[Product]:
    """
    Create product master data.

    Args:
        db: Database session
        req: Seed request
        faker: Faker instance
        rng: Random generator
        created_delivery_places: Previously created delivery places

    Returns:
        List of created products
    """
    if req.products <= 0:
        return []

    # Get existing delivery places for reference
    existing_dps = []
    if not req.dry_run:
        existing_dps = db.execute(select(DeliveryPlace)).scalars().all()
    elif created_delivery_places:
        existing_dps = created_delivery_places

    existing_product_codes = (
        {c for (c,) in db.execute(select(Product.product_code)).all()} if not req.dry_run else set()
    )

    product_rows = []
    for _ in range(req.products):
        # Random unit configuration
        unit_config = rng.choice([
            {"internal": "CAN", "external": "KG", "factor": 20.0},
            {"internal": "PCS", "external": "PCS", "factor": 1.0},
            {"internal": "BOX", "external": "PCS", "factor": 12.0},
            {"internal": "L", "external": "ML", "factor": 1000.0},
        ])
        
        row = {
            "product_code": _next_code("P", 5, rng, existing_product_codes),
            "product_name": faker.bs().title(),
            "internal_unit": unit_config["internal"],
            "external_unit": unit_config["external"],
            "qty_per_internal_unit": unit_config["factor"],
            "created_at": datetime.utcnow(),
        }
        # Set random delivery_place_id if available
        if existing_dps:
            dp = _choose(rng, existing_dps)
            row["delivery_place_id"] = dp.id if not req.dry_run else None
        product_rows.append(row)

    if not req.dry_run:
        stmt = pg_insert(Product).values(product_rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=[Product.product_code])
        db.execute(stmt)
        db.flush()

    return [Product(**row) for row in product_rows]


def seed_warehouses(db: Session, req: SeedRequest, faker: Faker, rng: Random) -> list[Warehouse]:
    """
    Create warehouse master data.

    Args:
        db: Database session
        req: Seed request
        faker: Faker instance
        rng: Random generator

    Returns:
        List of created warehouses
    """
    if req.warehouses <= 0:
        return []

    existing_wh_codes = (
        {c for (c,) in db.execute(select(Warehouse.warehouse_code)).all()}
        if not req.dry_run
        else set()
    )

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

    return [Warehouse(**row) for row in warehouse_rows]


def load_all_masters(
    db: Session,
    req: SeedRequest,
    created_customers: list[Customer],
    created_suppliers: list[Supplier],
    created_delivery_places: list[DeliveryPlace],
    created_products: list[Product],
    created_warehouses: list[Warehouse],
) -> dict:
    """
    Load all master data for subsequent operations.

    Args:
        db: Database session
        req: Seed request
        created_customers: Created customers (for dry_run)
        created_suppliers: Created suppliers (for dry_run)
        created_delivery_places: Created delivery places (for dry_run)
        created_products: Created products (for dry_run)
        created_warehouses: Created warehouses (for dry_run)

    Returns:
        Dictionary with all master data lists
    """
    if not req.dry_run:
        all_customers = db.execute(select(Customer)).scalars().all()
        all_suppliers = db.execute(select(Supplier)).scalars().all()
        all_delivery_places = db.execute(select(DeliveryPlace)).scalars().all()
        all_products = db.execute(select(Product)).scalars().all()
        all_warehouses = db.execute(select(Warehouse)).scalars().all()
    else:
        # For dry_run, use created data (id will be None)
        all_customers = created_customers
        all_suppliers = created_suppliers
        all_delivery_places = created_delivery_places
        all_products = created_products
        all_warehouses = created_warehouses

    return {
        "customers": all_customers,
        "suppliers": all_suppliers,
        "delivery_places": all_delivery_places,
        "products": all_products,
        "warehouses": all_warehouses,
    }


def seed_lots_with_movements(
    db: Session,
    req: SeedRequest,
    faker: Faker,
    rng: Random,
    masters: dict,
) -> list[Lot]:
    """
    Create lots with inbound stock movements.

    Args:
        db: Database session
        req: Seed request
        faker: Faker instance
        rng: Random generator
        masters: Dictionary with all master data

    Returns:
        List of created lots
    """
    created_lots = []

    all_products = masters["products"]
    all_warehouses = masters["warehouses"]
    all_suppliers = masters["suppliers"]

    for prod in all_products:
        # Limit to 0-3 lots per product (weighted towards 1-2)
        # Weights: 0 lots (5%), 1 lot (30%), 2 lots (40%), 3 lots (25%)
        num_lots = rng.choices([0, 1, 2, 3], weights=[5, 30, 40, 25], k=1)[0]
        
        for _ in range(num_lots):
            wh = _choose(rng, all_warehouses) if all_warehouses else None
            supplier = _choose(rng, all_suppliers) if all_suppliers else None
            days = rng.randint(0, 360)

            lot = Lot(
                product_id=(prod.id if (prod and not req.dry_run) else None),
                warehouse_id=(wh.id if (wh and not req.dry_run) else None),
                supplier_id=(supplier.id if (supplier and not req.dry_run) else None),
                lot_number=faker.unique.bothify(text="LOT-########"),
                receipt_date=datetime.utcnow().date() - timedelta(days=rng.randint(0, 30)),
                expiry_date=datetime.utcnow().date() + timedelta(days=360 - days),
                created_at=datetime.utcnow(),
                # Use product's internal unit
                unit=prod.internal_unit,
                # Initial quantity (will be updated by movement)
                current_quantity=0,
            )
            created_lots.append(lot)

            if not req.dry_run:
                db.add(lot)
                db.flush()  # Get lot.id

                # Inbound stock movement
                # Ensure sufficient stock (50-200 internal units)
                recv_qty = rng.randint(50, 200)
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
                
                # Update lot current quantity
                lot.current_quantity = recv_qty

    if not req.dry_run:
        db.flush()

    return created_lots


def seed_orders_with_lines(
    db: Session,
    req: SeedRequest,
    faker: Faker,
    rng: Random,
    masters: dict,
) -> tuple[list[Order], list[OrderLine]]:
    """
    Create orders with order lines.

    Args:
        db: Database session
        req: Seed request
        faker: Faker instance
        rng: Random generator
        masters: Dictionary with all master data

    Returns:
        Tuple of (created_orders, created_lines)
    """
    created_orders = []
    created_lines = []

    all_customers = masters["customers"]
    all_products = masters["products"]

    for _ in range(req.orders):
        cust = _choose(rng, all_customers) if all_customers else None
        order = Order(
            customer_id=(cust.id if (cust and not req.dry_run) else None),
            order_no=faker.unique.bothify(text="SO-########"),
            order_date=datetime.utcnow().date() - timedelta(days=rng.randint(0, 14)),
            status="draft",
            created_at=datetime.utcnow(),
        )
        created_orders.append(order)

        if not req.dry_run:
            db.add(order)
            db.flush()

        # 1-3 lines per order
        num_lines = rng.randint(1, 3)
        for line_idx in range(num_lines):
            prod = _choose(rng, all_products) if all_products else None
            
            # Determine unit (70% external, 30% internal)
            use_external = rng.random() < 0.7
            if use_external and prod.external_unit:
                unit = prod.external_unit
                # quantity in external unit (e.g. 20-200 KG)
                qty = rng.randint(20, 200)
                converted_qty = qty / float(prod.qty_per_internal_unit)
            else:
                unit = prod.internal_unit
                # quantity in internal unit (e.g. 1-10 CAN)
                qty = rng.randint(1, 10)
                converted_qty = qty

            line = OrderLine(
                order_id=(order.id if not req.dry_run else None),
                product_id=(prod.id if (prod and not req.dry_run) else None),
                # line_no is removed in v2.2 DDL, but kept here if model still has it? 
                # Checking model... OrderLine model doesn't seem to have line_no in recent view.
                # But let's check if it causes error. If model doesn't have it, remove it.
                # Assuming model update removed it or made it optional.
                # line_no=line_idx + 1, 
                order_quantity=qty,
                unit=unit,
                converted_quantity=converted_qty,
                created_at=datetime.utcnow(),
                delivery_place_id=prod.delivery_place_id if prod.delivery_place_id else 1 # Fallback
            )
            created_lines.append(line)
            if not req.dry_run:
                db.add(line)

        if not req.dry_run:
            db.flush()

    return created_orders, created_lines


def seed_allocations_with_movements(
    db: Session,
    req: SeedRequest,
    rng: Random,
    created_lots: list[Lot],
    masters: dict,
) -> list[Allocation]:
    """
    Create allocations with outbound stock movements.

    Args:
        db: Database session
        req: Seed request
        rng: Random generator
        created_lots: Created lots
        masters: Dictionary with all master data

    Returns:
        List of created allocations
    """
    created_allocs = []

    if req.dry_run or not created_lots:
        return created_allocs

    all_lots = db.execute(select(Lot)).scalars().all()
    all_lines = db.execute(select(OrderLine)).scalars().all()
    all_delivery_places = masters["delivery_places"]

    # Allocate ~30% of order lines
    sample_size = max(1, int(len(all_lines) * 0.3))
    lines_to_allocate = rng.sample(all_lines, min(sample_size, len(all_lines)))

    for line in lines_to_allocate:
        # Find lots matching product
        matching_lots = [lot for lot in all_lots if lot.product_id == line.product_id]
        if not matching_lots:
            continue

        selected_lot = _choose(rng, matching_lots)

        # Allocate 50-100% of line quantity (using converted_quantity for internal unit)
        # Ensure we have a valid converted_quantity
        base_qty = float(line.converted_quantity) if line.converted_quantity else float(line.order_quantity)
        
        alloc_qty = rng.randint(int(base_qty * 0.5), int(base_qty))
        alloc_qty = max(1, min(alloc_qty, int(base_qty)))

        # Random destination
        destination_id = None
        if all_delivery_places:
            destination_id = _choose(rng, all_delivery_places).id

        # Create allocation
        allocation = Allocation(
            order_line_id=line.id,
            lot_id=selected_lot.id,
            allocated_quantity=alloc_qty, # Use allocated_quantity (v2.2)
            destination_id=destination_id,
            created_at=datetime.utcnow(),
            status="allocated" # Set status
        )
        created_allocs.append(allocation)
        db.add(allocation)

        # Outbound stock movement (negative quantity)
        outbound_movement = StockMovement(
            product_id=selected_lot.product_id,
            warehouse_id=selected_lot.warehouse_id,
            lot_id=selected_lot.id,
            reason="outbound",
            quantity_delta=-alloc_qty,
            occurred_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(outbound_movement)

    db.flush()

    return created_allocs


def collect_actual_counts(db: Session, req: SeedRequest) -> ActualCounts | None:
    """
    Collect actual database counts.

    Args:
        db: Database session
        req: Seed request

    Returns:
        Actual counts if not dry_run, None otherwise
    """
    if req.dry_run:
        return None

    return ActualCounts(
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


def build_seed_response(
    req: SeedRequest,
    seed: int,
    created_customers: list[Customer],
    created_suppliers: list[Supplier],
    created_delivery_places: list[DeliveryPlace],
    created_products: list[Product],
    created_warehouses: list[Warehouse],
    created_lots: list[Lot],
    created_orders: list[Order],
    created_lines: list[OrderLine],
    created_allocs: list[Allocation],
    actual_counts: ActualCounts | None,
) -> SeedResponse:
    """
    Build seed response.

    Args:
        req: Seed request
        seed: Random seed used
        created_customers: Created customers
        created_suppliers: Created suppliers
        created_delivery_places: Created delivery places
        created_products: Created products
        created_warehouses: Created warehouses
        created_lots: Created lots
        created_orders: Created orders
        created_lines: Created order lines
        created_allocs: Created allocations
        actual_counts: Actual database counts (None if dry_run)

    Returns:
        Seed response
    """
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


# ============================
# Main Orchestration Function
# ============================


def create_seed_data(db: Session, req: SeedRequest) -> SeedResponse:
    """
    Create seed data with UPSERT strategy.

    Refactored: Split 441-line god function into entity-specific functions.

    Processing flow:
    1. Initialize generators (Faker, Random)
    2. Seed master data (customers, suppliers, delivery_places, products, warehouses)
    3. Load all masters for subsequent operations
    4. Seed lots with inbound movements
    5. Seed orders with lines
    6. Seed allocations with outbound movements
    7. Collect actual counts
    8. Build response

    Note: Forecast generation has been removed from this service.
    Use seed_simulate_service.py for forecast data generation.

    Args:
        db: Database session
        req: Seed request

    Returns:
        Seed response with summary and actual counts
    """
    # 1. Initialize generators
    faker, rng, seed = initialize_seed_generators(req)

    # 2. Seed master data
    created_customers = seed_customers(db, req, faker, rng)
    created_suppliers = seed_suppliers(db, req, faker, rng)
    created_delivery_places = seed_delivery_places(db, req, faker, rng)
    created_products = seed_products(db, req, faker, rng, created_delivery_places)
    created_warehouses = seed_warehouses(db, req, faker, rng)

    # 3. Load all masters
    masters = load_all_masters(
        db,
        req,
        created_customers,
        created_suppliers,
        created_delivery_places,
        created_products,
        created_warehouses,
    )

    # 4. Seed lots with inbound movements
    created_lots = seed_lots_with_movements(db, req, faker, rng, masters)

    # 5. Seed orders with lines
    created_orders, created_lines = seed_orders_with_lines(db, req, faker, rng, masters)

    # 6. Seed allocations with outbound movements
    created_allocs = seed_allocations_with_movements(db, req, rng, created_lots, masters)

    # 7. Commit if not dry_run
    if not req.dry_run:
        db.commit()

    # 8. Collect actual counts
    actual_counts = collect_actual_counts(db, req)

    # 8. Build response
    return build_seed_response(
        req,
        seed,
        created_customers,
        created_suppliers,
        created_delivery_places,
        created_products,
        created_warehouses,
        created_lots,
        created_orders,
        created_lines,
        created_allocs,
        actual_counts,
    )
