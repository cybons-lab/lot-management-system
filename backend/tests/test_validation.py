import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_order_validation_error():
    from app.models.auth_models import User
    from app.services.auth.auth_service import AuthService

    mock_user = User(
        id=1,
        username="test",
        email="test@example.com",
        password_hash="hash",
        display_name="Test",
        is_active=True,
    )
    app.dependency_overrides[AuthService.get_current_user] = lambda: mock_user

    try:
        payload = {"customer_code": "C001", "lines": []}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.post("/api/orders", json=payload)
            assert r.status_code == 422
            body = r.json()
            assert body["title"] == "Validation Error"
    finally:
        app.dependency_overrides.clear()
