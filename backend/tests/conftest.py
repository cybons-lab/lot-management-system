import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker


# Set dummy DATABASE_URL if not set, to pass Pydantic validation during imports
# This will be overridden later with the actual test database URL
os.environ.setdefault("ENABLE_DB_BROWSER", "true")

from app.infrastructure.persistence.models.base_model import Base
from app.main import application

from .db_utils import (
    apply_views_sql,
    create_core_tables,
    drop_known_view_relations,
    get_non_view_tables,
)


# SQL Profiler fixture
@pytest.fixture(autouse=True)
def check_n_plus_one(caplog, db_engine):
    """全てのテスト実行中にN+1警告が出ていないか監視する."""

    from app.core.config import settings
    from app.infrastructure.monitoring.sql_profiler import register_sql_profiler

    # 既存の設定を退避 & プロファイル有効化
    original_enabled = settings.SQL_PROFILER_ENABLED
    original_n_plus_one = settings.SQL_PROFILER_N_PLUS_ONE_THRESHOLD

    # テスト環境用に強制有効化
    settings.SQL_PROFILER_ENABLED = True
    settings.SQL_PROFILER_N_PLUS_ONE_THRESHOLD = 10  # 厳しめに設定 (from 5 to 10)

    # テスト用エンジンにリスナーを登録
    if not hasattr(db_engine, "_sql_profiler_registered"):
        register_sql_profiler(db_engine)
        db_engine._sql_profiler_registered = True

    # ContextVarを初期化 (Middlewareを通らない直接的なDB操作も計測するため)
    from app.infrastructure.monitoring.sql_profiler import RequestStats, _profiler_context

    # ContextVarが既にセットされている場合（例えば他でセットされている場合）も考慮しつつ
    # 基本はここで新規セットする
    stats = RequestStats()
    token = _profiler_context.set(stats)

    yield

    # statsの中身を直接検査
    n_plus_one_errors = []

    # N+1検知ロジック (middlewareと同等)
    for _sql_norm, query_stat in stats.queries.items():
        if query_stat.count > settings.SQL_PROFILER_N_PLUS_ONE_THRESHOLD:
            n_plus_one_errors.append(f"Count: {query_stat.count}, SQL: {query_stat.example_sql}")

    _profiler_context.reset(token)

    # 設定を戻す
    settings.SQL_PROFILER_ENABLED = original_enabled
    settings.SQL_PROFILER_N_PLUS_ONE_THRESHOLD = original_n_plus_one

    if n_plus_one_errors:
        pytest.fail(
            f"N+1 Detected in test! (Threshold: {settings.SQL_PROFILER_N_PLUS_ONE_THRESHOLD})\n"
            + "\n".join(n_plus_one_errors)
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

# CRITICAL: Force DATABASE_URL to be the same as test database URL
# This ensures that the application (which uses settings.DATABASE_URL)
# connects to the same database as the test fixtures.
os.environ["DATABASE_URL"] = SQLALCHEMY_DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    echo=True,  # Set to True for SQL query debugging
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    """Create database engine."""
    # If pre-initialized (e.g. in CI), skip table/view creation
    if os.getenv("TEST_DB_PRE_INITIALIZED"):
        yield engine
        return

    # Ensure all models are imported so Base.metadata is populated
    # Importing the package triggers __init__.py which imports all models
    import app.infrastructure.persistence.models  # noqa: F401

    print("DEBUG: Conftest - Imported Models.")
    print(f"DEBUG: Base.metadata.tables keys: {list(Base.metadata.tables.keys())}")

    # Force reset schema to ensure models are synced (drop old tables if exist)
    # Use CASCADE to handle dependencies even for tables not in metadata (orphaned)
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.commit()

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
    Monkey patch session.commit to prevent actual commits during tests.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Monkey patch commit to flush instead
    # This prevents application code from committing the transaction
    original_commit = session.commit
    session.commit = session.flush

    yield session

    # Restore commit
    session.commit = original_commit

    session.close()
    if transaction.is_active:
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

    def override_get_current_user():
        """Override to return a default test user with admin role.

        Creates the user in the test database to avoid FK violations in operation_logs.
        """
        from app.infrastructure.persistence.models.auth_models import Role, User, UserRole

        # Check if admin user already exists
        existing_user = db.query(User).filter(User.username == "test_admin").first()
        if existing_user:
            return existing_user

        # Create or get admin role
        admin_role = db.query(Role).filter(Role.role_code == "admin").first()
        if not admin_role:
            admin_role = Role(role_code="admin", role_name="Administrator")
            db.add(admin_role)
            db.flush()

        # Create admin user (email, display_name are required NOT NULL)
        user = User(
            username="test_admin",
            email="test_admin@example.com",
            password_hash="dummy_hash",
            display_name="Test Admin User",
            is_active=True,
        )
        db.add(user)
        db.flush()

        # Assign admin role
        user_role = UserRole(user_id=user.id, role_id=admin_role.id)
        db.add(user_role)
        db.flush()

        # Refresh to load relationships
        db.refresh(user)
        return user

    # Import oauth2_scheme for dependency injection
    from fastapi import Depends
    from fastapi.security import OAuth2PasswordBearer

    # Create local oauth2_scheme (same as in auth_router)
    local_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

    def override_get_current_user_optional(
        token: str | None = Depends(local_oauth2_scheme),
        db_session: Session = Depends(override_get_db),
    ):
        """Override get_current_user_optional.

        If a token is provided, use the real auth flow (for tests with token headers).
        If no token, return the default admin user (for tests without auth).
        """
        if token:
            # Token provided - use real authentication flow
            from app.core.security import decode_access_token
            from app.infrastructure.persistence.models.auth_models import User

            payload = decode_access_token(token)
            if not payload:
                return None
            user_id = payload.get("sub")
            if user_id is None:
                return None
            # Use the injected db_session
            return db_session.query(User).filter(User.id == int(user_id)).first()

        # No token - return default admin user for tests
        return override_get_current_user()

    def override_get_current_user_required(
        user=Depends(override_get_current_user_optional),
    ):
        """Override get_current_user (required version).

        Depends on get_current_user_optional and raises 401 if user is None.
        This maintains the same dependency chain as the original.
        """
        if not user:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    application.dependency_overrides[api_deps.get_db] = override_get_db
    application.dependency_overrides[core_database.get_db] = override_get_db
    application.dependency_overrides[api_deps.get_uow] = override_get_uow

    # Override auth dependencies
    from app.application.services.auth.auth_service import AuthService
    from app.presentation.api.routes.auth.auth_router import (
        get_current_user,
        get_current_user_optional,
    )

    application.dependency_overrides[AuthService.get_current_user] = override_get_current_user
    application.dependency_overrides[get_current_user] = override_get_current_user_required
    application.dependency_overrides[get_current_user_optional] = override_get_current_user_optional
    with TestClient(application) as client:
        yield client
    application.dependency_overrides.clear()


@pytest.fixture
def setup_search_data(db_session, supplier):
    """Setup basic master data for search and label tests."""
    from app.infrastructure.persistence.models import Supplier, SupplierItem, Warehouse

    # Supplier
    supplier = Supplier(supplier_code="sup-search", supplier_name="Search Supplier")
    db_session.add(supplier)
    db_session.flush()

    # Product
    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="SEARCH-PROD-001",
        display_name="Search Test Product",
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
def master_data(db, supplier):
    """Create common master data for tests."""
    from app.infrastructure.persistence.models import (
        Customer,
        DeliveryPlace,
        Supplier,
        SupplierItem,
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
    db.flush()  # Ensure supplier.id is generated

    # Create Products (SupplierItems)
    product1 = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PRD-TEST-001",
        display_name="Test Product 1",
        base_unit="EA",
        internal_unit="BOX",
        external_unit="PLT",
        qty_per_internal_unit=10,
    )
    product2 = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PRD-TEST-002",
        display_name="Test Product 2",
        base_unit="KG",
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
        jiku_code="TEST-JIKU",
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
def supplier(db):
    """Create a simple test supplier."""
    from app.infrastructure.persistence.models import Supplier

    supplier = Supplier(supplier_code="SUP-TEST-DEFAULT", supplier_name="Default Test Supplier")
    db.add(supplier)
    db.flush()  # Use flush for transaction safety
    return supplier


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
    db.flush()

    db.refresh(user)
    yield user
    # Cleanup is handled by transaction rollback


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
