import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.auth_models import User


@pytest.fixture(autouse=True)
def ensure_db_browser_enabled(db: Session):
    """Ensure DB browser is enabled after each test in this module."""
    yield
    # Re-enable DB browser after test completes (in case test disabled it)
    from app.application.services.system_config_service import ConfigKeys, SystemConfigService

    service = SystemConfigService(db)
    service.set(ConfigKeys.ENABLE_DB_BROWSER, "true")
    db.commit()  # Force commit to persist the change


def test_db_browser_rows_limit_enforced(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
):
    db.add(
        User(
            username="debug_user",
            email="debug@example.com",
            password_hash="dummy_hash",
            display_name="Debug User",
            is_active=True,
        )
    )
    db.commit()

    response = client.get(
        "/api/debug/db/objects/public/users/rows?limit=500",
        headers=superuser_token_headers,
    )

    assert response.status_code == 422


def test_db_browser_rows_missing_table_returns_404(
    client: TestClient,
    superuser_token_headers: dict[str, str],
):
    response = client.get(
        "/api/debug/db/objects/public/does_not_exist/rows",
        headers=superuser_token_headers,
    )

    assert response.status_code == 404


def test_db_browser_disabled_returns_404(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
):
    """Test that DB browser returns 404 when disabled.

    Note: autouse fixture ensures DB browser is re-enabled after this test.
    """
    from app.application.services.system_config_service import ConfigKeys, SystemConfigService

    service = SystemConfigService(db)
    service.set(ConfigKeys.ENABLE_DB_BROWSER, "false")
    db.commit()  # Commit to make it visible to the request

    response = client.get("/api/debug/db/objects", headers=superuser_token_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "DB browser is disabled"

    # Re-enable will be handled by autouse fixture
