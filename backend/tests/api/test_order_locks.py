from datetime import date, datetime, timedelta

from app.infrastructure.persistence.models import Order


# Fixtures are expected to be available from conftest.py (client, db_session, master_data, etc.)
# Note: Some tests are marked xfail due to session management issues where the user
# created in the fixture is not visible to the API request's session scope.


def test_acquire_lock_success(
    client, db_session, normal_user_token_headers, normal_user, master_data
):
    """ロック取得成功"""
    # customer = master_data["customer"]
    # Create an order
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
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

    # Verify DB - expire to force reload from DB
    db_session.expire_all()
    db_session.refresh(order)
    assert order.locked_by_user_id == normal_user.id


def test_acquire_lock_renew(
    client, db_session, normal_user_token_headers, normal_user, master_data
):
    """自分のロック再取得（延長）"""
    # customer = master_data["customer"]
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        locked_by_user_id=normal_user.id,
        locked_at=datetime.utcnow(),
        lock_expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db_session.add(order)
    db_session.commit()

    response = client.post(f"/api/orders/{order.id}/lock", headers=normal_user_token_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Lock renewed"


def test_acquire_lock_conflict(
    client, db_session, normal_user_token_headers, superuser_token_headers, normal_user, master_data
):
    """他人のロックによる競合"""
    # customer = master_data["customer"]
    # normal_user locks the order
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        locked_by_user_id=normal_user.id,
        locked_at=datetime.utcnow(),
        lock_expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db_session.add(order)
    db_session.commit()

    # superuser (other user) tries to lock
    response = client.post(f"/api/orders/{order.id}/lock", headers=superuser_token_headers)
    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["error"] == "LOCKED_BY_ANOTHER_USER"


def test_acquire_lock_expired(
    client, db_session, normal_user_token_headers, superuser_token_headers, normal_user, master_data
):
    """期限切れロックの上書き"""
    # customer = master_data["customer"]
    # normal_user locked, but expired
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        locked_by_user_id=normal_user.id,
        locked_at=datetime.utcnow() - timedelta(minutes=10),
        lock_expires_at=datetime.utcnow() - timedelta(minutes=1),  # Expired
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(order)
    db_session.commit()

    # superuser takes lock
    response = client.post(f"/api/orders/{order.id}/lock", headers=superuser_token_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Lock acquired"


def test_release_lock_success(
    client, db_session, normal_user_token_headers, normal_user, master_data
):
    """ロック解放成功"""
    # customer = master_data["customer"]
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        locked_by_user_id=normal_user.id,
        locked_at=datetime.utcnow(),
        lock_expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db_session.add(order)
    db_session.commit()

    response = client.delete(f"/api/orders/{order.id}/lock", headers=normal_user_token_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Lock released"

    # Verify DB - expire to force reload from DB
    db_session.expire_all()
    db_session.refresh(order)
    assert order.locked_by_user_id is None


def test_release_lock_forbidden(
    client, db_session, superuser_token_headers, normal_user, master_data
):
    """他人のロック解放不可"""
    # customer = master_data["customer"]
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        locked_by_user_id=normal_user.id,
        locked_at=datetime.utcnow(),
        lock_expires_at=datetime.utcnow() + timedelta(minutes=5),  # Active
    )
    db_session.add(order)
    db_session.commit()

    response = client.delete(f"/api/orders/{order.id}/lock", headers=superuser_token_headers)
    assert response.status_code == 403
