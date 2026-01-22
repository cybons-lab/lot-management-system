import os

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.infrastructure.persistence.models.auth_models import User


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


def test_db_browser_disabled_returns_404(client: TestClient, superuser_token_headers: dict[str, str]):
    original_value = settings.ENABLE_DB_BROWSER
    settings.ENABLE_DB_BROWSER = False
    os.environ["ENABLE_DB_BROWSER"] = "false"

    try:
        response = client.get("/api/debug/db/objects", headers=superuser_token_headers)
        assert response.status_code == 404
    finally:
        settings.ENABLE_DB_BROWSER = original_value
