import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.persistence.models.base_model import Base
from app.main import application


# Load Hypothesis settings
try:
    from . import conftest_hypothesis  # noqa: F401
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
    # If pre-initialized (e.g. in CI), skip table/view creation
    if os.getenv("TEST_DB_PRE_INITIALIZED"):
        yield engine
        return

    Base.metadata.create_all(bind=engine)

    # Create views using the same SQL file as production
    # This ensures test DB views are in sync with production
    from pathlib import Path

    views_sql_path = Path(__file__).parent.parent / "sql" / "views" / "create_views.sql"
    if views_sql_path.exists():
        sql_content = views_sql_path.read_text(encoding="utf-8")
        # Use raw connection for multi-statement SQL execution
        raw_conn = engine.raw_connection()
        try:
            cursor = raw_conn.cursor()
            # Drop any tables that ORM might have created for view models
            # The create_views.sql handles DROP VIEW, but ORM might create tables
            view_names = [
                "v_inventory_summary",
                "v_lot_details",
                "v_order_line_details",
                "v_lot_allocations",
                "v_lot_current_stock",
                "v_customer_daily_products",
                "v_order_line_context",
                "v_customer_code_to_id",
                "v_delivery_place_code_to_id",
                "v_product_code_to_id",
                "v_forecast_order_pairs",
                "v_lot_available_qty",
                "v_candidate_lots_by_order_line",
                "v_supplier_code_to_id",
                "v_warehouse_code_to_id",
                "v_user_supplier_assignments",
                "v_customer_item_jiku_mappings",
            ]
            for view_name in view_names:
                try:
                    cursor.execute(f"DROP TABLE IF EXISTS {view_name} CASCADE")
                except Exception:
                    pass  # Might be a VIEW, not a TABLE - create_views.sql handles it
            raw_conn.commit()
            # Now execute the views SQL
            cursor.execute(sql_content)
            raw_conn.commit()
        finally:
            raw_conn.close()
    else:
        # Fallback: views might already exist in pre-initialized DB
        import warnings

        warnings.warn(f"Views SQL file not found: {views_sql_path}", stacklevel=2)

    yield engine

    # Drop all views before dropping tables to avoid dependency errors
    from sqlalchemy import text

    with engine.connect() as connection:
        with connection.begin():
            # Dynamically get all views from the database and drop them
            result = connection.execute(
                text("""
                    SELECT table_name FROM information_schema.views
                    WHERE table_schema = 'public'
                """)
            )
            views = [row[0] for row in result]
            for view_name in views:
                try:
                    with connection.begin_nested():
                        connection.execute(text(f'DROP VIEW IF EXISTS "{view_name}" CASCADE'))
                except Exception:
                    pass

            # Also drop any tables that might have been created by ORM for views
            for obj_name in [
                "v_inventory_summary",
                "v_lot_details",
                "v_order_line_details",
            ]:
                try:
                    with connection.begin_nested():
                        connection.execute(text(f"DROP TABLE IF EXISTS {obj_name} CASCADE"))
                except Exception:
                    pass

    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db(db_engine) -> Generator[Session]:
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
def db_session(db) -> Generator[Session]:
    """Alias for db fixture for backward compatibility."""
    yield db


@pytest.fixture(scope="function")
def client(db) -> Generator[TestClient]:
    """Create FastAPI TestClient."""
    # Override both get_db functions since different modules import from different locations
    from app.core import database as core_database
    from app.presentation.api import deps as api_deps

    def override_get_db():
        yield db

    def override_get_uow():
        """Override UoW to use the test session directly.

        Note: We create a fake UoW that uses the existing test session
        and flushes on exit (without full commit) so changes are visible.
        """

        class TestUnitOfWork:
            def __init__(self, session):
                self.session = session

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                if exc_type is None:
                    # Flush changes so they're visible, but don't commit
                    # (test fixture's transaction rollback handles cleanup)
                    self.session.flush()
                # Don't rollback on error - let test fixture handle it

        yield TestUnitOfWork(db)

    application.dependency_overrides[api_deps.get_db] = override_get_db
    application.dependency_overrides[core_database.get_db] = override_get_db
    application.dependency_overrides[api_deps.get_uow] = override_get_uow
    with TestClient(application) as c:
        yield c
    application.dependency_overrides.clear()


@pytest.fixture
def master_data(db):
    """Create common master data for tests."""
    from app.infrastructure.persistence.models import (
        Customer,
        DeliveryPlace,
        Product,
        Supplier,
        Warehouse,
    )
    from app.infrastructure.persistence.models.auth_models import Role, User, UserRole

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

    # Create Roles if not exist
    admin_role = db.query(Role).filter(Role.role_code == "admin").first()
    if not admin_role:
        admin_role = Role(role_code="admin", role_name="Administrator")
        db.add(admin_role)

    user_role = db.query(Role).filter(Role.role_code == "user").first()
    if not user_role:
        user_role = Role(role_code="user", role_name="User")
        db.add(user_role)

    db.flush()

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

    # Assign user role
    db.add(UserRole(user_id=user.id, role_id=user_role.id))
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


@pytest.fixture
def normal_user(db):
    """Create a normal test user."""
    from app.infrastructure.persistence.models.auth_models import Role, User, UserRole

    # Ensure user role exists
    user_role = db.query(Role).filter(Role.role_code == "user").first()
    if not user_role:
        user_role = Role(role_code="user", role_name="User")
        db.add(user_role)
        db.flush()

    user = User(
        username="test_user_normal",
        email="normal@example.com",
        password_hash="dummy_hash",
        display_name="Normal Test User",
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Assign role
    db.add(UserRole(user_id=user.id, role_id=user_role.id))

    db.commit()
    db.refresh(user)
    yield user
    # Cleanup
    db.delete(user)
    db.commit()


@pytest.fixture
def superuser(db):
    """Create a superuser for testing."""
    from app.infrastructure.persistence.models.auth_models import Role, User, UserRole

    # Ensure admin role exists
    admin_role = db.query(Role).filter(Role.role_code == "admin").first()
    if not admin_role:
        admin_role = Role(role_code="admin", role_name="Administrator")
        db.add(admin_role)
        db.flush()

    user = User(
        username="test_superuser",
        email="super@example.com",
        password_hash="dummy_hash",
        display_name="Super Test User",
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Assign admin role
    db.add(UserRole(user_id=user.id, role_id=admin_role.id))

    db.commit()
    db.refresh(user)
    yield user
    # Cleanup
    db.delete(user)
    db.commit()


@pytest.fixture
def normal_user_token_headers(normal_user) -> dict[str, str]:
    """Create auth headers for normal user."""
    from app.core.security import create_access_token

    # Include both user_id (as sub) and username for different auth checks
    token = create_access_token(data={"sub": str(normal_user.id), "username": normal_user.username})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def superuser_token_headers(superuser) -> dict[str, str]:
    """Create auth headers for superuser."""
    from app.core.security import create_access_token

    # Include both user_id (as sub) and username for different auth checks
    token = create_access_token(data={"sub": str(superuser.id), "username": superuser.username})
    return {"Authorization": f"Bearer {token}"}
