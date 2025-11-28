"""Pytest fixtures for backend tests."""

import logging
import os
from pathlib import Path

import pytest
from sqlalchemy.orm import Session, sessionmaker


# Configure test database before importing the app
# Use PostgreSQL for testing to support JSONB and other PG-specific features
os.environ.setdefault("ENVIRONMENT", "test")
# Override DATABASE_URL to use the test database
# Allow host to be configured via TEST_DB_HOST (default: db-postgres for Docker, localhost for host)
test_db_host = os.environ.get("TEST_DB_HOST", "db-postgres")
os.environ["DATABASE_URL"] = (
    f"postgresql://admin:dev_password@{test_db_host}:5432/lot_management_test"
)

from app.core.database import engine  # noqa: E402


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
logger = logging.getLogger(__name__)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """テスト用データベースのセットアップ"""
    # if TEST_DB_PATH.exists():
    #     TEST_DB_PATH.unlink()

    # テスト環境では全テーブルを作成
    from sqlalchemy import text

    from app.models import Base

    with engine.connect() as conn:
        # Use DROP SCHEMA CASCADE to ensure everything is removed including views and dependent tables
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()

    # Create only actual tables (exclude view models)
    # Create only actual tables (exclude view models)
    from app.models import (
        Adjustment,
        Allocation,
        AllocationSuggestion,
        BatchJob,
        BusinessRule,
        Customer,
        CustomerItem,
        DeliveryPlace,
        ExpectedLot,
        ForecastCurrent,
        ForecastHistory,
        InboundPlan,
        InboundPlanLine,
        Lot,
        MasterChangeLog,
        OperationLog,
        Order,
        OrderLine,
        Product,
        Role,
        SeedSnapshot,
        StockHistory,
        Supplier,
        SystemConfig,
        User,
        UserRole,
        Warehouse,
    )

    tables = [
        Lot.__table__,
        Product.__table__,
        Warehouse.__table__,
        Supplier.__table__,
        Customer.__table__,
        Order.__table__,
        OrderLine.__table__,
        Allocation.__table__,
        AllocationSuggestion.__table__,
        Adjustment.__table__,
        StockHistory.__table__,
        DeliveryPlace.__table__,
        ForecastCurrent.__table__,
        ForecastHistory.__table__,
        InboundPlan.__table__,
        InboundPlanLine.__table__,
        ExpectedLot.__table__,
        User.__table__,
        Role.__table__,
        UserRole.__table__,
        OperationLog.__table__,
        MasterChangeLog.__table__,
        BusinessRule.__table__,
        BatchJob.__table__,
        SystemConfig.__table__,
        SeedSnapshot.__table__,
        CustomerItem.__table__,
    ]
    Base.metadata.create_all(bind=engine, tables=tables)
    logger.info("✅ テスト用テーブルのみ作成しました")

    # Apply Alembic migrations (including views)
    try:
        from alembic.config import Config

        from alembic import command

        # Use relative paths for local execution
        base_dir = Path(__file__).resolve().parent.parent
        alembic_ini_path = base_dir / "alembic.ini"
        alembic_cfg = Config(str(alembic_ini_path))
        alembic_cfg.set_main_option("script_location", str(base_dir / "alembic"))

        # Stamp head (since create_all created the latest schema)
        command.stamp(alembic_cfg, "head")
        logger.info("✅ Alembic head をスタンプしました")

        # Apply views manually (since they are not in alembic migrations)
        view_sql_path = base_dir / "sql" / "views" / "create_views.sql"
        if view_sql_path.exists():
            sql_content = view_sql_path.read_text(encoding="utf-8")
            with engine.connect() as conn:
                # Execute the whole script at once
                conn.execute(text(sql_content))
                conn.commit()
            logger.info("✅ ビュー定義(create_views.sql)を適用しました")
        else:
            logger.warning(f"⚠️ ビュー定義ファイルが見つかりません: {view_sql_path}")

    except Exception as e:
        logger.error(f"Failed to setup database: {e}")
        raise

    yield

    # クリーンアップ
    engine.dispose()
    # if TEST_DB_PATH.exists():
    #     TEST_DB_PATH.unlink()
    logger.info("🧹 テスト用データベースをクリーンアップしました")


@pytest.fixture()
def db_session() -> Session:
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session):
    """Test client with overridden dependencies."""
    from app.core.database import get_db
    from app.main import app
    from app.models.auth_models import User
    from app.services.auth.auth_service import AuthService

    # Mock user for tests
    mock_user = User(
        id=1,
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
        display_name="Test User",
        is_active=True,
    )

    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[AuthService.get_current_user] = lambda: mock_user

    from fastapi.testclient import TestClient

    yield TestClient(app)

    app.dependency_overrides.clear()
