import random
from datetime import date, timedelta
from decimal import Decimal

from faker import Faker
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.forecast_models import ForecastCurrent
from app.models.inventory_models import AllocationSuggestion, Lot
from app.models.masters_models import (
    Customer,
    CustomerItem,
    DeliveryPlace,
    Product,
    Supplier,
    Warehouse,
)
from app.models.orders_models import Order, OrderLine


fake = Faker("ja_JP")
Faker.seed(42)
random.seed(42)


def clear_data(db: Session):
    """Clear all data from related tables."""
    # Disable foreign key checks temporarily to avoid constraint errors during truncation
    db.execute(text("SET session_replication_role = 'replica';"))

    tables = [
        "allocation_suggestions",
        "order_lines",
        "orders",
        "forecast_current",
        "forecast_history",
        "lots",
        "customer_items",
        "products",
        "delivery_places",
        "customers",
        "suppliers",
        "warehouses",
    ]

    for table in tables:
        db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))

    db.execute(text("SET session_replication_role = 'origin';"))
    db.commit()


def generate_warehouses(db: Session) -> list[Warehouse]:
    warehouses = []
    # 4-8 warehouses
    count = random.randint(4, 8)
    types = ["internal", "external", "supplier"]

    for _ in range(count):
        w = Warehouse(
            warehouse_code=fake.unique.bothify(text="WH-####"),
            warehouse_name=fake.company() + "倉庫",
            warehouse_type=random.choice(types),
        )
        warehouses.append(w)

    db.add_all(warehouses)
    db.commit()
    return warehouses


def generate_suppliers(db: Session) -> list[Supplier]:
    suppliers = []
    # 3-5 suppliers
    count = random.randint(3, 5)

    for _ in range(count):
        s = Supplier(
            supplier_code=fake.unique.bothify(text="SUP-####"),
            supplier_name=fake.company(),
        )
        suppliers.append(s)

    db.add_all(suppliers)
    db.commit()
    return suppliers


def generate_customers_and_delivery_places(
    db: Session,
) -> tuple[list[Customer], list[DeliveryPlace]]:
    customers = []
    delivery_places = []

    # 5-10 customers
    count = random.randint(5, 10)

    for i in range(count):
        c = Customer(
            customer_code=fake.unique.bothify(text="CUST-####"),
            customer_name=fake.company(),
        )
        customers.append(c)
        db.add(c)
        db.flush()  # get ID

        # 2-3 delivery places per customer
        dp_count = random.randint(2, 3)
        for _ in range(dp_count):
            dp = DeliveryPlace(
                customer_id=c.id,
                delivery_place_code=fake.unique.bothify(text="DP-####"),
                delivery_place_name=fake.city() + "センター",
            )
            delivery_places.append(dp)
            db.add(dp)

    db.commit()
    return customers, delivery_places


def generate_products(db: Session) -> list[Product]:
    products = []
    # ~20 products
    count = 20

    for _ in range(count):
        p = Product(
            maker_part_code=fake.unique.bothify(text="PRD-###??"),
            product_name=fake.unique.bothify(text="Product-####?").upper(),
            base_unit="pcs",
            consumption_limit_days=random.choice([30, 60, 90, 120, 180, 365]),
        )
        products.append(p)

    db.add_all(products)
    db.commit()
    return products


def generate_customer_items(
    db: Session, customers: list[Customer], products: list[Product], suppliers: list[Supplier]
):
    # Product-centric mapping: Each product is primarily for 1 customer
    # 10-20% of products are shared with 2-3 customers (rare cases)

    for p in products:
        # Primary customer for this product
        primary_customer = random.choice(customers)

        # Determine if this product is shared (10-20% chance)
        is_shared = random.random() < 0.15  # 15% of products are shared

        customers_for_product = [primary_customer]

        if is_shared:
            # Add 1-2 additional customers
            num_additional = random.randint(1, 2)
            other_customers = [c for c in customers if c.id != primary_customer.id]
            if other_customers:
                additional = random.sample(
                    other_customers, min(num_additional, len(other_customers))
                )
                customers_for_product.extend(additional)

        # Create CustomerItem for each customer that deals with this product
        for c in customers_for_product:
            ci = CustomerItem(
                customer_id=c.id,
                product_id=p.id,
                external_product_code=f"EXT-{c.customer_code}-{p.maker_part_code}",
                base_unit="pcs",
                supplier_id=random.choice(suppliers).id if suppliers else None,
            )
            db.add(ci)

    db.commit()


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
        forecast_totals: Dict mapping product_id to total forecasted quantity for that product
    """
    today = date.today()

    for i, p in enumerate(products):
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
    from sqlalchemy import func

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


def generate_forecasts(
    db: Session,
    customers: list[Customer],
    products: list[Product],
    delivery_places: list[DeliveryPlace],
) -> tuple[list[Product], dict[int, int]]:
    """Generate forecasts and return products with forecasts + forecast totals.

    Returns:
        Tuple of (products_with_forecast, forecast_totals)
        where forecast_totals is a dict mapping product_id to total forecast quantity
    """
    # 3.1 Forecast products vs 3.2 No Forecast products
    # Split products: 70% with forecast, 30% without
    num_products = len(products)
    num_with_forecast = int(num_products * 0.7)
    products_with_forecast = products[:num_with_forecast]

    today = date.today()
    next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
    next_next_month = (next_month + timedelta(days=32)).replace(day=1)

    # Helper to get delivery places for a customer
    dp_map = {c.id: [dp for dp in delivery_places if dp.customer_id == c.id] for c in customers}

    # Track forecast totals per product
    forecast_totals = {}

    for p in products_with_forecast:
        product_total = 0

        for c in customers:
            dps = dp_map.get(c.id, [])
            if not dps:
                continue

            # For each delivery place
            for dp in dps:
                # Daily Forecast (Next Month)
                # Randomly pick days (3, 5, 10 day intervals)
                interval = random.choice([3, 5, 10])
                current_date = next_month

                while current_date.month == next_month.month:
                    if random.random() > 0.3:  # 70% chance to have forecast on interval
                        qty = random.randint(20, 120)
                        product_total += qty

                        # Create ForecastCurrent
                        fc = ForecastCurrent(
                            customer_id=c.id,
                            delivery_place_id=dp.id,
                            product_id=p.id,
                            forecast_date=current_date,
                            forecast_quantity=Decimal(qty),
                            unit="pcs",
                            forecast_period=current_date.strftime("%Y-%m"),
                        )
                        db.add(fc)

                    current_date += timedelta(days=interval)

        # Store total forecast for this product
        forecast_totals[p.id] = product_total

    db.commit()
    return products_with_forecast, forecast_totals


def get_any_lot_id(db: Session, product_id: int) -> int | None:
    lot = db.query(Lot).filter(Lot.product_id == product_id).first()
    return lot.id if lot else None


def generate_reservations(db: Session):
    """Generate reservations (AllocationSuggestion) by copying from forecasts.

    This must be called AFTER lots are created, since reservations require lot_id.
    """
    # Get all forecasts
    forecasts = db.query(ForecastCurrent).all()

    for fc in forecasts:
        # Find a suitable lot for this product
        lot_id = get_any_lot_id(db, fc.product_id)
        if not lot_id:
            continue

        # Create reservation (100% copy of forecast)
        res = AllocationSuggestion(
            customer_id=fc.customer_id,
            delivery_place_id=fc.delivery_place_id,
            product_id=fc.product_id,
            lot_id=lot_id,
            quantity=fc.forecast_quantity,
            allocation_type="soft",
            source="forecast_copy",
            forecast_period=fc.forecast_period,
        )
        db.add(res)

    db.commit()


def generate_orders(
    db: Session,
    customers: list[Customer],
    products: list[Product],
    products_with_forecast: list[Product],
    delivery_places: list[DeliveryPlace],
):
    # 1 Customer is "Perfect Scenario"
    perfect_customer = customers[0]
    other_customers = customers[1:]

    dp_map = {c.id: [dp for dp in delivery_places if dp.customer_id == c.id] for c in customers}

    # Build customer-product mapping from CustomerItem
    customer_products_map = {}
    customer_items = db.query(CustomerItem).all()
    for ci in customer_items:
        if ci.customer_id not in customer_products_map:
            customer_products_map[ci.customer_id] = []
        customer_products_map[ci.customer_id].append(ci.product_id)

    # Generate 50-80 orders total (spread across all products, not per product)
    total_orders = random.randint(50, 80)

    for _ in range(total_orders):
        # Pick customer
        c = random.choice(customers)

        # Only pick products that this customer deals with
        available_product_ids = customer_products_map.get(c.id, [])
        if not available_product_ids:
            continue

        # Pick random product from available ones
        p_id = random.choice(available_product_ids)
        p = next((prod for prod in products if prod.id == p_id), None)
        if not p:
            continue

        dps = dp_map.get(c.id, [])
        if not dps:
            continue
        dp = random.choice(dps)

        # CRITICAL: delivery_place must always be set (never NULL)
        # This ensures "納入先未設定" does not occur
        if not dp or not dp.id:
            continue

        is_perfect = c.id == perfect_customer.id

        # Base date and quantity
        has_forecast = p in products_with_forecast

        order_date = date.today() + timedelta(days=random.randint(1, 60))
        qty = Decimal(random.randint(20, 120))

        if has_forecast and is_perfect:
            pass

        if not is_perfect:
            # Apply anomalies
            anomaly = random.choices(
                [
                    "normal",
                    "early",
                    "late",
                    "qty_mismatch",
                    "wrong_dp",
                    "steal",
                    "no_stock",
                    "no_fc",
                ],
                weights=[50, 10, 10, 10, 5, 5, 5, 5],
                k=1,
            )[0]

            if anomaly == "early":
                order_date -= timedelta(days=random.randint(1, 3))
            elif anomaly == "late":
                order_date += timedelta(days=random.randint(1, 3))
            elif anomaly == "qty_mismatch":
                qty = qty * Decimal(random.uniform(0.8, 1.5))

        # Create Order
        o = Order(
            order_number=fake.unique.bothify(text="ORD-########"),
            customer_id=c.id,
            order_date=date.today(),
        )
        db.add(o)
        db.flush()

        # Create OrderLine with delivery_place_id (NEVER NULL)
        ol = OrderLine(
            order_id=o.id,
            product_id=p.id,
            delivery_date=order_date,
            order_quantity=qty,
            unit="pcs",
            delivery_place_id=dp.id,  # CRITICAL: Always set
            status="pending",
        )
        db.add(ol)

    db.commit()


def generate_all_test_data(db: Session):
    try:
        clear_data(db)

        warehouses = generate_warehouses(db)
        suppliers = generate_suppliers(db)
        customers, delivery_places = generate_customers_and_delivery_places(db)
        products = generate_products(db)

        generate_customer_items(db, customers, products, suppliers)

        # Step 1: Generate forecasts and get totals
        products_with_forecast, forecast_totals = generate_forecasts(
            db, customers, products, delivery_places
        )

        # Step 2: Generate lots based on forecast totals
        generate_lots(db, products, warehouses, suppliers, forecast_totals)

        # Step 3: Generate reservations (requires lots to exist)
        generate_reservations(db)

        # Step 4: Generate orders
        generate_orders(db, customers, products, products_with_forecast, delivery_places)

        return True
    except Exception as e:
        db.rollback()
        print(f"Error generating test data: {e}")
        raise e
