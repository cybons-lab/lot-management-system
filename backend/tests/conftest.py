"""Pytest fixtures for backend tests."""

import logging
import os

import pytest
from sqlalchemy.orm import Session, sessionmaker


# Configure test database before importing the app
# Use PostgreSQL for testing to support JSONB and other PG-specific features
# TEST_DB_PATH = Path(tempfile.gettempdir()) / "lot_management_test.db"
os.environ.setdefault("ENVIRONMENT", "test")
# os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
# Override DATABASE_URL to use the test database
os.environ["DATABASE_URL"] = "postgresql://admin:dev_password@db-postgres:5432/lot_management_test"

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
    
    # Drop views first (they depend on tables)
    view_names = [
        "v_candidate_lots_by_order_line",
        "v_lot_details",
        "v_product_code_to_id",
        "v_forecast_order_pairs",
        "v_delivery_place_code_to_id",
        "v_customer_code_to_id",
        "v_order_line_context",
        "v_lot_available_qty",
        "v_customer_daily_products",
        "v_lot_current_stock",
        "lot_current_stock",
    ]
    
    with engine.connect() as conn:
        for view_name in view_names:
            conn.execute(text(f"DROP VIEW IF EXISTS {view_name} CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()
    
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
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
        
        alembic_cfg = Config("/app/alembic.ini")
        alembic_cfg.set_main_option("script_location", "/app/alembic")
        
        # Stamp head (since create_all created the latest schema)
        command.stamp(alembic_cfg, "head")
        logger.info("✅ Alembic head をスタンプしました")
        
        # Apply views manually (since they are not in alembic migrations)
        from pathlib import Path
        view_sql_path = Path("/app/apply_views_v2_5.sql")
        if view_sql_path.exists():
            sql_content = view_sql_path.read_text(encoding="utf-8")
            with engine.connect() as conn:
                # Execute the whole script at once
                conn.execute(text(sql_content))
                conn.commit()
            logger.info("✅ ビュー定義(apply_views_v2_5.sql)を適用しました")
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
