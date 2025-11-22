"""Conftest for domain layer tests (no database required)."""

import pytest


def pytest_configure(config):
    """Configure pytest to skip database setup for domain tests."""
    config.addinivalue_line(
        "markers", "no_db: mark test as not requiring database setup"
    )


# Override the session-level setup_database fixture to do nothing for domain tests
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """No-op database setup for domain tests."""
    yield
