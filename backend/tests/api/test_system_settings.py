from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.application.services.system_config_service import ConfigKeys, SystemConfigService


def test_system_settings_rbac(client: TestClient, db: Session, normal_user_token_headers):
    """一般ユーザーはシステム設定にアクセスできないことを確認."""
    response = client.get("/api/admin/system-settings", headers=normal_user_token_headers)
    assert response.status_code == 403


def test_list_system_settings(client: TestClient, db: Session, superuser_token_headers):
    """管理者による設定一覧取得を確認."""
    # テスト環境では空の可能性があるので、事前に作成しておく
    service = SystemConfigService(db)
    service.set(ConfigKeys.ENABLE_DB_BROWSER, "false", "Test description")

    response = client.get("/api/admin/system-settings", headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert any(item["config_key"] == ConfigKeys.ENABLE_DB_BROWSER for item in data)


def test_update_system_setting(client: TestClient, db: Session, superuser_token_headers):
    """設定の更新を確認."""
    key = ConfigKeys.ENABLE_DB_BROWSER

    # Update to true
    response = client.patch(
        f"/api/admin/system-settings/{key}",
        json={"config_value": "true", "description": "Updated description"},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["config_value"] == "true"

    # Verify in DB
    service = SystemConfigService(db)
    assert service.get_bool(key) is True

    # Update to false
    response = client.patch(
        f"/api/admin/system-settings/{key}",
        json={"config_value": "false"},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["config_value"] == "false"
    assert service.get_bool(key) is False


def test_db_browser_enforcement(client: TestClient, db: Session, superuser_token_headers):
    """DBブラウザのアクセス制限が設定に従うことを確認."""
    key = ConfigKeys.ENABLE_DB_BROWSER

    # 1. Disable
    client.patch(
        f"/api/admin/system-settings/{key}",
        json={"config_value": "false"},
        headers=superuser_token_headers,
    )

    response = client.get("/api/debug/db/objects", headers=superuser_token_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "DB browser is disabled"

    # 2. Enable
    client.patch(
        f"/api/admin/system-settings/{key}",
        json={"config_value": "true"},
        headers=superuser_token_headers,
    )

    response = client.get("/api/debug/db/objects", headers=superuser_token_headers)
    assert response.status_code == 200  # Should be allowed
