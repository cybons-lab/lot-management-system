import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect

from app.core.security import create_access_token
from app.infrastructure.persistence.models.auth_models import Role, User, UserRole


@pytest.fixture
def admin_user(db: Session):
    """管理者ユーザーを作成."""
    admin_role = db.query(Role).filter(Role.role_code == "admin").first()
    if not admin_role:
        raise RuntimeError("Admin role 'admin' not found in baseline data")

    existing_user = db.query(User).filter(User.email == "admin@example.com").first()
    if existing_user:
        # Ensure role is assigned
        if not existing_user.user_roles:
            db.add(UserRole(user=existing_user, role=admin_role))
            db.commit()
        db.refresh(existing_user)
        return existing_user

    user = User(
        username="admin_test",
        email="admin@example.com",
        password_hash="dummy",
        display_name="Admin User",
        is_active=True,
    )
    db.add(user)
    db.flush()

    db.add(UserRole(user=user, role=admin_role))
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def normal_user(db: Session):
    """一般ユーザーを作成."""
    user_role = db.query(Role).filter(Role.role_code == "user").first()
    if not user_role:
        raise RuntimeError("User role 'user' not found in baseline data")

    existing_user = db.query(User).filter(User.email == "user@example.com").first()
    if existing_user:
        if not existing_user.user_roles:
            db.add(UserRole(user=existing_user, role=user_role))
            db.commit()
        db.refresh(existing_user)
        return existing_user

    user = User(
        username="user_test",
        email="user@example.com",
        password_hash="dummy",
        display_name="Normal User",
        is_active=True,
    )
    db.add(user)
    db.flush()

    db.add(UserRole(user=user, role=user_role))
    db.commit()
    db.refresh(user)
    return user


def test_websocket_logs_stream_no_token(client: TestClient):
    """トークンなしの場合、4003 (Policy Violation) で閉じられることを確認."""
    with client.websocket_connect("/api/logs/stream") as websocket:
        with pytest.raises(WebSocketDisconnect):
            websocket.receive_text()


def test_websocket_logs_stream_invalid_token(client: TestClient):
    """無効なトークンの場合、閉じられることを確認."""
    with client.websocket_connect("/api/logs/stream?token=invalid") as websocket:
        with pytest.raises(WebSocketDisconnect):
            websocket.receive_text()


def test_websocket_logs_stream_admin_success(client: TestClient, admin_user: User):
    """管理者の場合、WebSocket接続が成功し、ping/pongができることを確認."""
    token = create_access_token(data={"sub": str(admin_user.id)})
    with client.websocket_connect(f"/api/logs/stream?token={token}") as websocket:
        # Skip initial log message ("Log streaming client connected")
        initial_msg = websocket.receive_text()
        assert "Log streaming client connected" in initial_msg

        # Now test ping/pong
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"


def test_websocket_logs_stream_normal_user_denied(client: TestClient, normal_user: User):
    """一般ユーザーの場合、管理者権限がないため閉じられることを確認."""
    token = create_access_token(data={"sub": str(normal_user.id)})
    with client.websocket_connect(f"/api/logs/stream?token={token}") as websocket:
        with pytest.raises(WebSocketDisconnect):
            websocket.receive_text()
