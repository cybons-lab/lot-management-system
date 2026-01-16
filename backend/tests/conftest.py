import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.persistence.models.base_model import Base
from app.main import application

from .db_utils import (
    apply_views_sql,
    create_core_tables,
    drop_known_view_relations,
    get_non_view_tables,
)


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

    create_core_tables(engine)

    # Create views using the same SQL file as production
    # This ensures test DB views are in sync with production
    apply_views_sql(engine)

    yield engine

    # Drop all views before dropping tables to avoid dependency errors
    drop_known_view_relations(engine)
    Base.metadata.drop_all(bind=engine, tables=get_non_view_tables())


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

    def override_get_current_user():
        """Override to return no user (or a default valid user if needed)."""
        return None

    application.dependency_overrides[api_deps.get_db] = override_get_db
    application.dependency_overrides[core_database.get_db] = override_get_db
    application.dependency_overrides[api_deps.get_uow] = override_get_uow
    with TestClient(application) as client:
        yield client
    application.dependency_overrides.clear()


@pytest.fixture
def setup_search_data(db_session):
    """Setup basic master data for search and label tests."""
    from app.infrastructure.persistence.models import Product, Supplier, Warehouse

    # Supplier
    supplier = Supplier(supplier_code="sup-search", supplier_name="Search Supplier")
    db_session.add(supplier)
    db_session.flush()

    # Product
    product = Product(
        maker_part_code="SEARCH-PROD-001",
        product_name="Search Test Product",
        base_unit="EA",
    )
    db_session.add(product)

    # Warehouse
    warehouse = Warehouse(
        warehouse_code="WH-SEARCH",
        warehouse_name="Search Warehouse",
        warehouse_type="internal",
    )
    db_session.add(warehouse)
    db_session.commit()
    db_session.refresh(product)
    db_session.refresh(warehouse)
    db_session.refresh(supplier)

    return {"product": product, "warehouse": warehouse, "supplier": supplier}


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
