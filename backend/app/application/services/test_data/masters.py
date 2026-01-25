import random
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    CustomerItemDeliverySetting,
    CustomerItemJikuMapping,
    DeliveryPlace,
    Product,
    ProductUomConversion,
    Supplier,
    Warehouse,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

from .utils import fake


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


def generate_products(db: Session, options: object = None) -> list[Product]:
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
        p = Product(
            maker_part_code=fake.unique.bothify(text="PRD-###??"),
            product_name=product_name,
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
            conv = ProductUomConversion(product_id=p.id, external_unit="KG", factor=factor)
            db.add(conv)

    db.commit()
    return products


def generate_customer_items(
    db: Session,
    customers: list[Customer],
    products: list[Product],
    suppliers: list[Supplier],
    delivery_places: list[DeliveryPlace] | None = None,
    options: object = None,
):
    """Generate CustomerItem, SupplierItem, and CustomerItemDeliverySettings records.

    Each product is assigned to:
    - 1-2 suppliers (via supplier_items table)
    - 1-3 customers (via customer_items table)
    - Default delivery place per customer-product (via customer_item_delivery_settings)
    """
    # Track which supplier-maker_part_no pairs already exist to avoid duplicates
    supplier_maker_pairs: set[tuple[int, str]] = set()
    # Map product_id + supplier_id -> supplier_item for linking
    supplier_item_map: dict[tuple[int, int], SupplierItem] = {}

    # Get delivery places if not provided
    if delivery_places is None:
        delivery_places = db.query(DeliveryPlace).all()

    # Build customer_id -> delivery_places map
    customer_delivery_map: dict[int, list[DeliveryPlace]] = {}
    for dp in delivery_places:
        if dp.customer_id not in customer_delivery_map:
            customer_delivery_map[dp.customer_id] = []
        customer_delivery_map[dp.customer_id].append(dp)

    for p in products:
        # 1. Assign 1-2 suppliers to this product (via supplier_items)
        if suppliers:
            num_suppliers = random.randint(1, min(2, len(suppliers)))
            selected_suppliers = random.sample(suppliers, num_suppliers)

            for idx, supplier in enumerate(selected_suppliers):
                maker_part_no = p.maker_part_code  # Use product's maker_part_code
                if (supplier.id, maker_part_no) not in supplier_maker_pairs:
                    si = SupplierItem(
                        product_id=p.id,
                        supplier_id=supplier.id,
                        maker_part_no=maker_part_no,
                        is_primary=(idx == 0),  # First supplier is primary
                    )
                    db.add(si)
                    db.flush()  # Get the ID
                    supplier_maker_pairs.add((supplier.id, maker_part_no))
                    supplier_item_map[(p.id, supplier.id)] = si

        # 2. Assign this product to customers
        primary_customer = random.choice(customers)
        is_shared = random.random() < 0.15  # 15% of products are shared

        customers_for_product = [primary_customer]

        if is_shared:
            num_additional = random.randint(1, 2)
            other_customers = [c for c in customers if c.id != primary_customer.id]
            if other_customers:
                additional = random.sample(
                    other_customers, min(num_additional, len(other_customers))
                )
                customers_for_product.extend(additional)

        # Create CustomerItem and CustomerItemDeliverySettings for each customer
        for idx, c in enumerate(customers_for_product):
            # Use meaningful customer part number (not EXT- prefix)
            customer_part_no = f"{c.customer_code}-{p.maker_part_code}"

            # Link to supplier_item if available
            selected_supplier = random.choice(suppliers) if suppliers else None
            supplier_item = None
            if selected_supplier and (p.id, selected_supplier.id) in supplier_item_map:
                supplier_item = supplier_item_map[(p.id, selected_supplier.id)]

            ci = CustomerItem(
                customer_id=c.id,
                product_id=p.id,
                customer_part_no=customer_part_no,
                base_unit="pcs",
                supplier_id=selected_supplier.id if selected_supplier else None,
                supplier_item_id=supplier_item.id if supplier_item else None,
                is_primary=(idx == 0),  # First customer is primary for this supplier_item
            )
            db.add(ci)
            db.flush()  # Get the ID for related tables

            # Create default delivery setting if customer has delivery places
            if c.id in customer_delivery_map and customer_delivery_map[c.id]:
                default_dp = random.choice(customer_delivery_map[c.id])
                delivery_setting = CustomerItemDeliverySetting(
                    customer_item_id=ci.id,
                    delivery_place_id=default_dp.id,
                    is_default=True,
                )
                db.add(delivery_setting)

                # Create Jiku mappings (70% chance)
                if random.random() < 0.7:
                    # Map Jiku code 'A', 'B' to specific delivery places
                    jiku_codes = ["A", "B", "C"]
                    for jiku in random.sample(jiku_codes, random.randint(1, 2)):
                        # Pick a random delivery place of this customer
                        target_dp = random.choice(customer_delivery_map[c.id])
                        jiku_map = CustomerItemJikuMapping(
                            customer_item_id=ci.id,
                            jiku_code=jiku,
                            delivery_place_id=target_dp.id,
                            is_default=(jiku == "A"),  # 'A' is default if present
                        )
                        db.add(jiku_map)

    db.commit()
