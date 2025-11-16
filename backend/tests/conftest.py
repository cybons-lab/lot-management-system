"""Pytest fixtures for backend tests."""

import logging
import os
import tempfile
from pathlib import Path

import pytest
from sqlalchemy.orm import Session, sessionmaker


# Configure test database before importing the app
TEST_DB_PATH = Path(tempfile.gettempdir()) / "lot_management_test.db"
os.environ.setdefault("ENVIRONMENT", "test")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

from app.core.database import engine  # noqa: E402


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
logger = logging.getLogger(__name__)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """テスト用データベースのセットアップ"""
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    
    # テスト環境では全テーブルを作成
    from app.models import Base
    Base.metadata.create_all(bind=engine)
    logger.info("✅ テスト用データベーステーブルを作成しました")
    
    yield
    
    # クリーンアップ
    engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
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
