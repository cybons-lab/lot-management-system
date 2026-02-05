import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.maker_models import Maker
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    CustomerItemDeliverySetting,
    CustomerItemJikuMapping,
    DeliveryPlace,
    ProductUomConversion,
    Supplier,
    Warehouse,
    WarehouseDeliveryRoute,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

from .utils import fake


def generate_makers(db: Session, options: object = None) -> list[Maker]:
    """Generate Maker (メーカーマスタ) test data.

    Makers are referenced by supplier_items.maker_code for grouping/filtering.
    """
    makers = []

    # Scale logic
    scale = "small"
    if options and hasattr(options, "scale"):
        scale = options.scale

    if scale == "medium":
        count = random.randint(15, 25)
    elif scale == "large":
        count = random.randint(40, 60)
    else:  # small
        count = random.randint(5, 10)

    for i in range(count):
        # 90% active, 10% historical (soft deleted)
        valid_to = date(9999, 12, 31)
        if random.random() < 0.1:
            valid_to = date.today() - timedelta(days=random.randint(30, 365))

        maker = Maker(
            maker_code=fake.unique.bothify(text="MK-####"),
            maker_name=fake.company() + "製作所",
            display_name=f"メーカー{i + 1}",
            short_name=f"M{i + 1}",
            valid_to=valid_to,
        )
        makers.append(maker)

    db.add_all(makers)
    db.commit()
    return makers


def generate_warehouses(db: Session, options: object = None) -> list[Warehouse]:
    warehouses = []

    # Scale logic
    scale = "small"
    if options and hasattr(options, "scale"):
        scale = options.scale

    if scale == "medium":
        count = random.randint(8, 12)
    elif scale == "large":
        count = random.randint(15, 20)
    else:  # small
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


def generate_suppliers(db: Session, options: object = None) -> list[Supplier]:
    suppliers = []

    # Scale logic
    scale = "small"
    if options and hasattr(options, "scale"):
        scale = options.scale

    if scale == "medium":
        count = random.randint(10, 20)
    elif scale == "large":
        count = random.randint(30, 50)
    else:  # small
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
    db: Session, options: object = None
) -> tuple[list[Customer], list[DeliveryPlace]]:
    customers = []
    delivery_places = []

    # Scale logic
    scale = "small"
    if options and hasattr(options, "scale"):
        scale = options.scale

    if scale == "medium":
        count = random.randint(20, 40)
    elif scale == "large":
        count = random.randint(100, 200)
    else:  # small
        count = random.randint(5, 10)
    for _ in range(count):
        from datetime import date, timedelta

        valid_to = date(9999, 12, 31)
        if random.random() < 0.1:  # 10% chance to be inactive
            valid_to = date.today() - timedelta(days=random.randint(1, 30))

        c = Customer(
            customer_code=fake.unique.bothify(text="CUST-####"),
            customer_name=fake.company(),
            valid_to=valid_to,
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


def generate_products(
    db: Session, suppliers: list[Supplier], options: object = None
) -> list[SupplierItem]:
    products = []

    # Scale logic
    scale = "small"
    if options and hasattr(options, "scale"):
        scale = options.scale

    if scale == "medium":
        count = random.randint(80, 120)
    elif scale == "large":
        count = random.randint(300, 500)
    else:  # small
        count = 20

    for _ in range(count):
        product_name = (
            random.choice(
                [
                    "六角ボルト M6",
                    "六角ボルト M8",
                    "六角ボルト M10",
                    "ワッシャー M6",
                    "ワッシャー M8",
                    "ナット M6",
                    "ナット M8",
                    "ゴムパッキン A",
                    "ゴムパッキン B",
                    "Oリング P-10",
                    "Oリング P-20",
                    "樹脂スペーサー",
                    "金属スペーサー",
                    "配線ケーブル A",
                    "配線ケーブル B",
                    "コネクタ端子",
                ]
            )
            + " "
            + fake.bothify(text="##")
        )
        p = SupplierItem(
            supplier_id=random.choice(suppliers).id if suppliers else 1,
            maker_part_no=fake.unique.bothify(text="PRD-###??"),
            display_name=product_name,
            base_unit="pcs",
            consumption_limit_days=random.choice([30, 60, 90, 120, 180, 365]),
        )
        products.append(p)

    db.add_all(products)
    db.flush()

    # Generate UOM conversions (KG conversion) for 60% of products
    for p in products:
        if random.random() < 0.6:
            # 1 PCS = 15-25 KG
            factor = Decimal(random.randint(15, 25))
            conv = ProductUomConversion(supplier_item_id=p.id, external_unit="KG", factor=factor)
            db.add(conv)

    db.commit()
    return products


def generate_customer_items(
    db: Session,
    customers: list[Customer],
    products: list[SupplierItem],
    suppliers: list[Supplier],
    delivery_places: list[DeliveryPlace] | None = None,
    options: object = None,
):
    """Generate CustomerItem records linking customers to supplier items.

    Design Philosophy (SIMPLIFIED):
    1. Each SupplierItem (メーカー品番) is assigned to 1-3 customers
    2. Each customer gets a unique customer_part_no (得意先品番)
    3. Each CustomerItem gets a default delivery place
    4. 70% of CustomerItems get Jiku code mappings

    Business Constraints:
    - UNIQUE(customer_id, customer_part_no) - enforced by DB
    - supplier_item_id is NOT NULL (required)
    """
    import logging

    logger = logging.getLogger(__name__)

    # Get delivery places if not provided
    if delivery_places is None:
        delivery_places = db.query(DeliveryPlace).all()

    # Build customer_id -> delivery_places map
    customer_delivery_map: dict[int, list[DeliveryPlace]] = {}
    for dp in delivery_places:
        if dp.customer_id not in customer_delivery_map:
            customer_delivery_map[dp.customer_id] = []
        customer_delivery_map[dp.customer_id].append(dp)

    # Track used customer_part_no per customer to ensure uniqueness
    customer_part_no_tracker: dict[int, set[str]] = {c.id: set() for c in customers}

    # For each SupplierItem, assign it to 1-3 customers
    for supplier_item in products:
        # Select 1-3 customers for this product
        # 70% get assigned to 1 customer, 20% to 2, 10% to 3
        num_customers = random.choices([1, 2, 3], weights=[70, 20, 10], k=1)[0]
        selected_customers = random.sample(customers, min(num_customers, len(customers)))

        for customer in selected_customers:
            # Generate unique customer_part_no
            # Format: CUST-XXXX-PRD-XXXXX
            base_customer_part_no = f"{customer.customer_code}-{supplier_item.maker_part_no}"
            customer_part_no = base_customer_part_no

            # Ensure uniqueness within customer (handle collisions)
            counter = 1
            while customer_part_no in customer_part_no_tracker[customer.id]:
                customer_part_no = f"{base_customer_part_no}-{counter}"
                counter += 1
                logger.warning(
                    "customer_part_no collision detected",
                    extra={
                        "customer_id": customer.id,
                        "base": base_customer_part_no,
                        "resolved": customer_part_no,
                    },
                )

            # Track this customer_part_no
            customer_part_no_tracker[customer.id].add(customer_part_no)

            # Create CustomerItem
            ci = CustomerItem(
                customer_id=customer.id,
                supplier_item_id=supplier_item.id,
                customer_part_no=customer_part_no,
                base_unit="pcs",
            )
            db.add(ci)
            db.flush()  # Get the ID for related tables

            logger.debug(
                "Created CustomerItem",
                extra={
                    "customer_item_id": ci.id,
                    "customer_id": customer.id,
                    "customer_part_no": customer_part_no,
                    "supplier_item_id": supplier_item.id,
                },
            )

            # Create default delivery setting if customer has delivery places
            if customer.id in customer_delivery_map and customer_delivery_map[customer.id]:
                default_dp = random.choice(customer_delivery_map[customer.id])
                delivery_setting = CustomerItemDeliverySetting(
                    customer_item_id=ci.id,
                    delivery_place_id=default_dp.id,
                    is_default=True,
                )
                db.add(delivery_setting)

                # Create Jiku mappings (70% chance)
                if random.random() < 0.7:
                    # Map 1-2 Jiku codes to delivery places
                    jiku_codes = ["A", "B", "C"]
                    num_jiku = random.randint(1, 2)
                    selected_jiku = random.sample(jiku_codes, num_jiku)

                    for jiku in selected_jiku:
                        # Pick a random delivery place of this customer
                        target_dp = random.choice(customer_delivery_map[customer.id])
                        jiku_map = CustomerItemJikuMapping(
                            customer_item_id=ci.id,
                            jiku_code=jiku,
                            delivery_place_id=target_dp.id,
                            is_default=(jiku == "A"),  # 'A' is default if present
                        )
                        db.add(jiku_map)

    db.commit()
    logger.info(
        "CustomerItem generation completed",
        extra={
            "total_products": len(products),
            "total_customers": len(customers),
        },
    )


def generate_warehouse_delivery_routes(
    db: Session,
    warehouses: list[Warehouse],
    delivery_places: list[DeliveryPlace],
) -> None:
    """Generate WarehouseDeliveryRoute test data.

    Links warehouses to delivery places with lead times and costs.
    """
    # Create 5-15 routes connecting warehouses to delivery places
    num_routes = random.randint(5, min(15, len(warehouses) * 2))

    for _ in range(num_routes):
        warehouse = random.choice(warehouses)
        delivery_place = random.choice(delivery_places)

        # Avoid duplicate routes
        existing = (
            db.query(WarehouseDeliveryRoute)
            .filter_by(warehouse_id=warehouse.id, delivery_place_id=delivery_place.id)
            .first()
        )
        if existing:
            continue

        # Lead time: 0-7 days (0 = same-day delivery)
        lead_time = random.choices([0, 1, 2, 3, 5, 7], weights=[5, 30, 30, 20, 10, 5], k=1)[0]

        # Cost: 1000-10000 yen
        cost = random.randint(1000, 10000)

        route = WarehouseDeliveryRoute(
            warehouse_id=warehouse.id,
            delivery_place_id=delivery_place.id,
            transport_lead_time_days=lead_time,
            transport_cost=cost,
        )
        db.add(route)

    db.commit()
