# backend/tests/api/test_auth_refresh_token.py
"""Tests for refresh token endpoint."""

from datetime import timedelta

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_refresh_token


def test_refresh_access_token_success(client: TestClient, normal_user):
    """Refresh should return a new access token and set cookie attributes."""
    login_response = client.post(
        "/api/auth/login",
        json={"username": normal_user.username},
    )
    assert login_response.status_code == 200

    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    set_cookie = refresh_response.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie
    assert "httponly" in set_cookie.lower()
    assert "samesite=lax" in set_cookie.lower()
    assert "path=/api/auth" in set_cookie.lower()
    if settings.ENVIRONMENT == "production":
        assert "secure" in set_cookie.lower()
    else:
        assert "secure" not in set_cookie.lower()


def test_refresh_access_token_missing_cookie(client: TestClient):
    """Missing refresh token cookie should return 401."""
    response = client.post("/api/auth/refresh")
    assert response.status_code == 401


def test_refresh_access_token_invalid_token(client: TestClient):
    """Invalid refresh token should return 401."""
    client.cookies.set("refresh_token", "invalid.token.value", path="/api/auth")
    response = client.post("/api/auth/refresh")
    assert response.status_code == 401


def test_refresh_access_token_expired_token(client: TestClient, normal_user):
    """Expired refresh token should return 401."""
    expired_token = create_refresh_token(
        data={"sub": str(normal_user.id), "username": normal_user.username},
        expires_delta=timedelta(minutes=-1),
    )
    client.cookies.set("refresh_token", expired_token, path="/api/auth")
    response = client.post("/api/auth/refresh")
    assert response.status_code == 401
