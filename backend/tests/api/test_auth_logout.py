# backend/tests/api/test_auth_logout.py
"""Tests for logout endpoint."""

from fastapi.testclient import TestClient


def test_logout_clears_refresh_cookie(client: TestClient, normal_user):
    """Logout should clear refresh token cookie."""
    login_response = client.post(
        "/api/auth/login",
        json={"username": normal_user.username},
    )
    assert login_response.status_code == 200

    assert client.cookies.get("refresh_token")

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    data = logout_response.json()
    assert data["detail"] == "ok"

    set_cookie = logout_response.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie
    assert "max-age=0" in set_cookie.lower()
    assert "path=/api/auth" in set_cookie.lower()

    assert not client.cookies.get("refresh_token")
