import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.notification_model import Notification


@pytest.fixture
def create_test_notification(db: Session, normal_user: User):
    def _create(title: str, is_read: bool = False, type: str = "info"):
        n = Notification(
            user_id=normal_user.id,
            title=title,
            message="Message",
            type=type,
            is_read=is_read,
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
