"""Pytest fixtures for backend tests."""
import os
from pathlib import Path
import tempfile

import pytest
from sqlalchemy.orm import Session, sessionmaker

# Configure test database before importing the app
TEST_DB_PATH = Path(tempfile.gettempdir()) / "lot_management_test.db"
os.environ.setdefault("ENVIRONMENT", "test")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

from app.core.database import Base, engine  # noqa: E402

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


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

