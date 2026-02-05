import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.notification_model import Notification


@pytest.fixture
def create_test_notification(db: Session, normal_user: User):
    def _create(
        title: str,
        is_read: bool = False,
        type: str = "info",
        display_strategy: str = "immediate",
    ):
        n = Notification(
            user_id=normal_user.id,
            title=title,
            message="Message",
            type=type,
            is_read=is_read,
            display_strategy=display_strategy,
        )
        db.add(n)
        db.flush()
        db.refresh(n)
        return n

    return _create


def test_get_notifications(
    client: TestClient, normal_user_token_headers: dict[str, str], create_test_notification
) -> None:
    """通知一覧取得のテスト"""
    create_test_notification("Notification 1")
    create_test_notification("Notification 2", type="success")
    create_test_notification("Notification 3", is_read=True, type="error")

    r = client.get(f"{settings.API_PREFIX}/notifications", headers=normal_user_token_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 3, f"Expected 3 notifications, but got {len(data)}. Data: {data}"

    titles = [n["title"] for n in data]
    assert "Notification 1" in titles
    assert "Notification 2" in titles
    assert "Notification 3" in titles


def test_get_unread_count(
    client: TestClient, normal_user_token_headers: dict[str, str], create_test_notification
) -> None:
    """未読数取得のテスト"""
    create_test_notification("Notification 1")
    create_test_notification("Notification 2")
    create_test_notification("Notification 3", is_read=True)

    r = client.get(
        f"{settings.API_PREFIX}/notifications/unread-count", headers=normal_user_token_headers
    )
    assert r.status_code == 200
    data = r.json()
    print(f"DEBUG: unread_count data: {data}")
    assert data["count"] == 2


def test_mark_as_read(
    client: TestClient, normal_user_token_headers: dict[str, str], create_test_notification
) -> None:
    """通知既読化のテスト"""
    target = create_test_notification("Notification 1", is_read=False)

    r = client.patch(
        f"{settings.API_PREFIX}/notifications/{target.id}/read",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    data = r.json()
    print(f"DEBUG: mark_as_read data: {data}")
    assert data["id"] == target.id
    assert data["is_read"] is True

    # Check unread count decreased
    r = client.get(
        f"{settings.API_PREFIX}/notifications/unread-count", headers=normal_user_token_headers
    )
    assert r.json()["count"] == 0


def test_mark_all_as_read(
    client: TestClient, normal_user_token_headers: dict[str, str], create_test_notification
) -> None:
    """一括既読化のテスト"""
    create_test_notification("Notification 1")
    create_test_notification("Notification 2")

    r = client.post(
        f"{settings.API_PREFIX}/notifications/mark-all-read",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict), f"Response data is not a dict. Type: {type(data)}, Data: {data}"
    assert data["count"] == 0, f"Expected count 0, but got {data.get('count')}. Data: {data}"

    # Verify all are read
    r = client.get(f"{settings.API_PREFIX}/notifications", headers=normal_user_token_headers)
    notifications = r.json()
    for n in notifications:
        assert n["is_read"] is True


def test_create_notification_with_display_strategy(
    client: TestClient, superuser_token_headers: dict[str, str], normal_user: User
) -> None:
    """display_strategy を指定して通知を作成できる"""
    response = client.post(
        f"{settings.API_PREFIX}/notifications",
        json={
            "user_id": normal_user.id,
            "title": "Test Notification",
            "message": "Test message",
            "type": "info",
            "display_strategy": "deferred",
        },
        headers=superuser_token_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["display_strategy"] == "deferred"


def test_notification_default_display_strategy(
    client: TestClient, superuser_token_headers: dict[str, str], normal_user: User
) -> None:
    """display_strategy を省略した場合、immediate がデフォルト"""
    response = client.post(
        f"{settings.API_PREFIX}/notifications",
        json={
            "user_id": normal_user.id,
            "title": "Test Notification",
            "message": "Test message",
            "type": "info",
            # display_strategy 省略
        },
        headers=superuser_token_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["display_strategy"] == "immediate"


def test_invalid_display_strategy_rejected(
    client: TestClient, superuser_token_headers: dict[str, str], normal_user: User
) -> None:
    """無効な display_strategy は 422 エラー"""
    response = client.post(
        f"{settings.API_PREFIX}/notifications",
        json={
            "user_id": normal_user.id,
            "title": "Test Notification",
            "message": "Test message",
            "type": "info",
            "display_strategy": "invalid_value",  # 無効値
        },
        headers=superuser_token_headers,
    )
    assert response.status_code == 422  # Pydantic validation error


def test_get_notifications_includes_display_strategy(
    client: TestClient, normal_user_token_headers: dict[str, str], create_test_notification
) -> None:
    """一覧取得時に display_strategy が含まれる"""
    # 通知を作成
    create_test_notification("Test", display_strategy="persistent")

    # 一覧取得
    response = client.get(f"{settings.API_PREFIX}/notifications", headers=normal_user_token_headers)
    assert response.status_code == 200
    notifications = response.json()
    assert len(notifications) > 0
    assert "display_strategy" in notifications[0]
    assert notifications[0]["display_strategy"] in ["immediate", "deferred", "persistent"]
