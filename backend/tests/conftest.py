import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.models  # Register all models
from app.main import app
from app.models.base_model import Base

# Load Hypothesis settings
try:
    from . import conftest_hypothesis
except ImportError:
    pass


# Use PostgreSQL test database (docker-compose.test.yml)
# Can be overridden with TEST_DATABASE_URL environment variable
SQLALCHEMY_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg2://testuser:testpass@localhost:5433/lot_management_test",
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    echo=False,  # Set to True for SQL query debugging
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    """Create database engine."""
    Base.metadata.create_all(bind=engine)

    # Create views (since create_all doesn't create them, and might create tables instead)
    from sqlalchemy import text
    from sqlalchemy.exc import ProgrammingError

    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            # Drop table if it was created by create_all (because it's defined as a model)
            try:
                with connection.begin_nested():
                    connection.execute(text("DROP TABLE IF EXISTS v_inventory_summary CASCADE"))
            except ProgrammingError:
                pass

            # Drop view if exists
            try:
                with connection.begin_nested():
                    connection.execute(text("DROP VIEW IF EXISTS v_inventory_summary CASCADE"))
            except ProgrammingError:
                pass

            # Create view
            connection.execute(
                text("""
                CREATE OR REPLACE VIEW v_inventory_summary AS
                SELECT
                    l.product_id,
                    l.warehouse_id,
                    SUM(l.current_quantity) AS total_quantity,
                    SUM(l.allocated_quantity) AS allocated_quantity,
                    (SUM(l.current_quantity) - SUM(l.allocated_quantity)) AS available_quantity,
                    COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
                    (SUM(l.current_quantity) - SUM(l.allocated_quantity) + COALESCE(SUM(ipl.planned_quantity), 0)) AS available_with_provisional,
                    MAX(l.updated_at) AS last_updated
                FROM lots l
                LEFT JOIN inbound_plan_lines ipl ON l.product_id = ipl.product_id
                LEFT JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
                WHERE l.status = 'active'
                GROUP BY l.product_id, l.warehouse_id
            """)
            )

            # Create v_lot_details view
            try:
                with connection.begin_nested():
                    connection.execute(text("DROP TABLE v_lot_details CASCADE"))
            except Exception:
                connection.execute(text("DROP VIEW IF EXISTS v_lot_details CASCADE"))

            connection.execute(
                text("""
                CREATE OR REPLACE VIEW v_lot_details AS
                SELECT
                    l.id AS lot_id,
                    l.lot_number,
                    l.product_id,
                    p.maker_part_code,
                    p.product_name,
                    l.warehouse_id,
                    w.warehouse_code,
                    w.warehouse_name,
                    l.supplier_id,
                    s.supplier_code,
                    s.supplier_name,
                    l.received_date,
                    l.expiry_date,
                    l.current_quantity,
                    l.allocated_quantity,
                    (l.current_quantity - l.allocated_quantity - l.locked_quantity) AS available_quantity,
                    l.unit,
                    l.status,
                    (l.expiry_date - CURRENT_DATE) AS days_to_expiry,
                    l.created_at,
                    l.updated_at
                FROM lots l
                JOIN products p ON l.product_id = p.id
                JOIN warehouses w ON l.warehouse_id = w.id
                LEFT JOIN suppliers s ON l.supplier_id = s.id
            """)
            )

            # Create v_order_line_details view
            try:
                with connection.begin_nested():
                    connection.execute(text("DROP TABLE v_order_line_details CASCADE"))
            except Exception:
                connection.execute(text("DROP VIEW IF EXISTS v_order_line_details CASCADE"))

            connection.execute(
                text("""
                CREATE OR REPLACE VIEW v_order_line_details AS
                SELECT
                    o.id AS order_id,
                    o.order_number,
                    o.order_date,
                    o.customer_id,
                    c.customer_code,
                    c.customer_name,
                    ol.id AS line_id,
                    ol.product_id,
                    ol.delivery_date,
                    ol.order_quantity,
                    ol.unit,
                    ol.delivery_place_id,
                    ol.status AS line_status,
                    p.maker_part_code AS product_code,
                    p.product_name,
                    p.internal_unit AS product_internal_unit,
                    p.external_unit AS product_external_unit,
                    p.qty_per_internal_unit AS product_qty_per_internal_unit,
                    dp.delivery_place_code,
                    dp.delivery_place_name,
                    s.supplier_name,
                    COALESCE(SUM(a.allocated_quantity), 0) AS allocated_quantity
                FROM order_lines ol
                JOIN orders o ON ol.order_id = o.id
                LEFT JOIN customers c ON o.customer_id = c.id
                LEFT JOIN products p ON ol.product_id = p.id
                LEFT JOIN delivery_places dp ON ol.delivery_place_id = dp.id
                LEFT JOIN allocations a ON ol.id = a.order_line_id
                LEFT JOIN customer_items ci ON o.customer_id = ci.customer_id AND ol.product_id = ci.product_id
                LEFT JOIN suppliers s ON ci.supplier_id = s.id
                GROUP BY
                    o.id, o.order_number, o.order_date, o.customer_id,
                    c.customer_code, c.customer_name,
                    ol.id, ol.product_id, ol.delivery_date, ol.order_quantity, ol.unit, ol.delivery_place_id, ol.status,
                    p.maker_part_code, p.product_name, p.internal_unit, p.external_unit, p.qty_per_internal_unit,
                    dp.delivery_place_code, dp.delivery_place_name,
                    s.supplier_name
            """)
            )

            transaction.commit()
        except Exception:
            transaction.rollback()
            raise
    yield engine

    # Drop view before dropping tables to avoid dependency errors
    with engine.connect() as connection:
        with connection.begin():
            connection.execute(text("DROP VIEW IF EXISTS v_inventory_summary CASCADE"))
            try:
                with connection.begin_nested():
                    connection.execute(text("DROP TABLE v_lot_details CASCADE"))
            except Exception:
                connection.execute(text("DROP VIEW IF EXISTS v_lot_details CASCADE"))
            try:
                with connection.begin_nested():
                    connection.execute(text("DROP TABLE v_order_line_details CASCADE"))
            except Exception:
                connection.execute(text("DROP VIEW IF EXISTS v_order_line_details CASCADE"))

    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db(db_engine) -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test.
    Rollback transaction after each test to ensure isolation.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db) -> Generator[TestClient, None, None]:
    """Create FastAPI TestClient."""
    from app.api.deps import get_db

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def master_data(db):
    """Create common master data for tests."""
    from app.models import Customer, DeliveryPlace, Product, Supplier, Warehouse
    from app.models.auth_models import User

    # Create Warehouse
    warehouse = Warehouse(
        warehouse_code="WH-TEST", warehouse_name="Test Warehouse", warehouse_type="internal"
    )
    db.add(warehouse)

    # Create Supplier
    supplier = Supplier(supplier_code="SUP-TEST", supplier_name="Test Supplier")
    db.add(supplier)

    # Create Products
    product1 = Product(
        maker_part_code="PRD-TEST-001",
        product_name="Test Product 1",
        base_unit="EA",
        internal_unit="BOX",
        external_unit="PLT",
        qty_per_internal_unit=10,
    )
    product2 = Product(
        maker_part_code="PRD-TEST-002", product_name="Test Product 2", base_unit="KG"
    )
    db.add(product1)
    db.add(product2)

    # Create Customer
    customer = Customer(customer_code="CUST-TEST", customer_name="Test Customer")
    db.add(customer)
    db.flush()  # Ensure IDs are generated

    # Create DeliveryPlace
    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-TEST",
        delivery_place_name="Test Delivery Place",
    )
    db.add(delivery_place)

    # Create User
    user = User(
        username="test_user_common",
        email="test_common@example.com",
        password_hash="dummy_hash",
        display_name="Test User Common",
        is_active=True,
    )
    db.add(user)

    db.flush()

    return {
        "warehouse": warehouse,
        "supplier": supplier,
        "product1": product1,
        "product2": product2,
        "customer": customer,
        "delivery_place": delivery_place,
        "user": user,
    }
