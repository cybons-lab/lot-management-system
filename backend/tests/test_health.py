# backend/tests/test_health.py
"""
ヘルスチェックエンドポイントのテスト
"""
import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.main import app


@pytest.fixture
def client(db_session):
    """テスト用クライアント"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # conftest.pyが管理するのでcloseしない
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health_ok(client):
    """ヘルスチェックエンドポイントが正常に応答すること"""
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    # statusフィールドが存在し、正常な値を持つことを確認
    assert "status" in data
    assert data["status"] in ("ok", "healthy", True)
