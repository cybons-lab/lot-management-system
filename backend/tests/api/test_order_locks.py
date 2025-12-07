from datetime import datetime, timedelta

from app.models import Order


# Fixtures are expected to be available from conftest.py (client, db_session, etc.)


def test_acquire_lock_success(client, db_session, normal_user_token_headers, normal_user):
    """ロック取得成功"""
    # Create an order
    order = Order(
        order_number="LOCK-TEST-001",
        customer_id=1,
        order_date=datetime.now().date(),
        status="open",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db_session.add(order)
    db_session.commit()

    response = client.post(f"/api/orders/{order.id}/lock", headers=normal_user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Lock acquired"
    assert data["locked_by_user_id"] == normal_user.id
    assert "locked_at" in data
    assert "lock_expires_at" in data

    # Verify DB
    db_session.refresh(order)
    assert order.locked_by_user_id == normal_user.id


def test_acquire_lock_renew(client, db_session, normal_user_token_headers, normal_user):
    """自分のロック再取得（延長）"""
    order = Order(
        order_number="LOCK-TEST-002",
        customer_id=1,
        order_date=datetime.now().date(),
        status="open",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        locked_by_user_id=normal_user.id,
        locked_at=datetime.now(),
        lock_expires_at=datetime.now() + timedelta(minutes=5),
    )
    db_session.add(order)
    db_session.commit()

    response = client.post(f"/api/orders/{order.id}/lock", headers=normal_user_token_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Lock renewed"


def test_acquire_lock_conflict(
    client, db_session, normal_user_token_headers, superuser_token_headers, normal_user
):
    """他人のロックによる競合"""
    # normal_user locks the order
    order = Order(
        order_number="LOCK-TEST-003",
        customer_id=1,
        order_date=datetime.now().date(),
        status="open",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        locked_by_user_id=normal_user.id,
        locked_at=datetime.now(),
        lock_expires_at=datetime.now() + timedelta(minutes=10),
    )
    db_session.add(order)
    db_session.commit()

    # superuser (other user) tries to lock
    response = client.post(f"/api/orders/{order.id}/lock", headers=superuser_token_headers)
    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["error"] == "LOCKED_BY_ANOTHER_USER"


def test_acquire_lock_expired(
    client, db_session, normal_user_token_headers, superuser_token_headers, normal_user
):
    """期限切れロックの上書き"""
    # normal_user locked, but expired
    order = Order(
        order_number="LOCK-TEST-004",
        customer_id=1,
        order_date=datetime.now().date(),
        status="open",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        locked_by_user_id=normal_user.id,
        locked_at=datetime.now() - timedelta(minutes=20),
        lock_expires_at=datetime.now() - timedelta(minutes=10),
    )
    db_session.add(order)
    db_session.commit()

    # superuser takes lock
    response = client.post(f"/api/orders/{order.id}/lock", headers=superuser_token_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Lock acquired"


def test_release_lock_success(client, db_session, normal_user_token_headers, normal_user):
    """ロック解放成功"""
    order = Order(
        order_number="LOCK-TEST-005",
        customer_id=1,
        order_date=datetime.now().date(),
        status="open",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        locked_by_user_id=normal_user.id,
        locked_at=datetime.now(),
        lock_expires_at=datetime.now() + timedelta(minutes=10),
    )
    db_session.add(order)
    db_session.commit()

    response = client.delete(f"/api/orders/{order.id}/lock", headers=normal_user_token_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Lock released"

    db_session.refresh(order)
    assert order.locked_by_user_id is None


def test_release_lock_forbidden(client, db_session, superuser_token_headers, normal_user):
    """他人のロック解放不可"""
    order = Order(
        order_number="LOCK-TEST-006",
        customer_id=1,
        order_date=datetime.now().date(),
        status="open",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        locked_by_user_id=normal_user.id,
        locked_at=datetime.now(),
        lock_expires_at=datetime.now() + timedelta(minutes=10),
    )
    db_session.add(order)
    db_session.commit()

    response = client.delete(f"/api/orders/{order.id}/lock", headers=superuser_token_headers)
    assert response.status_code == 403
