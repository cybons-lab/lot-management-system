import random

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    DeliveryPlace,
    Product,
    Supplier,
    Warehouse,
)
from app.infrastructure.persistence.models.product_supplier_models import ProductSupplier

from .utils import fake


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
    """Generate CustomerItem and ProductSupplier records.

    Each product is assigned to:
    - 1-2 suppliers (via product_suppliers table)
    - 1-3 customers (via customer_items table)
    """
    # Track which products already have suppliers to avoid duplicates
    product_supplier_pairs: set[tuple[int, int]] = set()

    for p in products:
        # 1. Assign 1-2 suppliers to this product
        if suppliers:
            num_suppliers = random.randint(1, min(2, len(suppliers)))
            selected_suppliers = random.sample(suppliers, num_suppliers)

            for idx, supplier in enumerate(selected_suppliers):
                if (p.id, supplier.id) not in product_supplier_pairs:
                    ps = ProductSupplier(
                        product_id=p.id,
                        supplier_id=supplier.id,
                        is_primary=(idx == 0),  # First supplier is primary
                    )
                    db.add(ps)
                    product_supplier_pairs.add((p.id, supplier.id))

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
