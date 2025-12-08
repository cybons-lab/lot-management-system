import os
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError


# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.models  # noqa: F401, E402
from app.infrastructure.persistence.models.base_model import Base  # noqa: E402


def init_single_db(db_url):
    """Initialize a single database."""
    print(f"Initializing database: {db_url}")

    # Create database if not exists (needs connection to default db)
    # Extract db name
    base_url = db_url.rsplit("/", 1)[0]
    db_name = db_url.rsplit("/", 1)[1]

    # Connect to postgres db to create new db
    postgres_url = f"{base_url}/postgres"
    engine_pg = create_engine(postgres_url, isolation_level="AUTOCOMMIT")

    with engine_pg.connect() as conn:
        # Check if db exists
        result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"))
        if not result.scalar():
            print(f"Creating database {db_name}...")
            conn.execute(text(f"CREATE DATABASE {db_name}"))

    engine_pg.dispose()

    # Now connect to the target db
    engine = create_engine(db_url)

    # Create tables
    print(f"Creating tables in {db_name}...")
    Base.metadata.create_all(bind=engine)

    # Create views
    print(f"Creating views in {db_name}...")
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            # Drop table if it was created by create_all
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
            print(f"Database {db_name} initialization completed successfully.")
        except Exception as e:
            transaction.rollback()
            print(f"Error initializing database {db_name}: {e}")
            raise
    engine.dispose()


def init_test_dbs():
    """Initialize test databases."""
    base_db_url = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+psycopg2://testuser:testpass@localhost:5433/lot_management_test",
    )

    # Only initialize the main test db
    db_urls = [base_db_url]

    # Initialize databases
    # Use Pool even for single DB to keep the logic simple or just call directly
    for db_url in db_urls:
        init_single_db(db_url)


if __name__ == "__main__":
    init_test_dbs()
