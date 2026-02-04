# backend/tests/test_orders_refactored.py
"""
受注モジュールのテストコード
既存API入出力の挙動を保証する回帰テスト

Updated 2025-12: Removed order_number references after business key refactor.
Orders are now identified by id, with business keys (customer_order_no, sap_order_no)
stored at the order_line level.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    Order,
    OrderLine,
    SupplierItem,
)
from app.main import app
from app.presentation.api.deps import get_db, get_uow


@pytest.fixture
def client(db_session):
    """テスト用クライアント"""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # conftest.pyが管理するのでcloseしない

    def override_get_uow():
        """テスト用UnitOfWorkをオーバーライド"""

        # db_sessionを直接使用する簡易UnitOfWork
        class TestUnitOfWork:
            def __init__(self, session):
                self.session = session

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                if exc_type is None:
                    self.session.flush()  # commitではなくflushを使用

        yield TestUnitOfWork(db_session)

    from app.infrastructure.persistence.models.auth_models import Role, User, UserRole
    from app.presentation.api.routes.auth.auth_router import get_current_user

    # Create user with role
    mock_user = User(
        id=1,
        username="test",
        email="test@example.com",
        password_hash="hash",
        display_name="Test",
        is_active=True,
    )

    # Add user role to mock user
    user_role = db_session.query(Role).filter(Role.role_code == "user").first()
    if not user_role:
        user_role = Role(role_code="user", role_name="一般ユーザー", description="一般ユーザー")
        db_session.add(user_role)
        db_session.flush()

    # Create mock user_roles relationship
    mock_user_role = UserRole(user_id=mock_user.id, role_id=user_role.id)
    mock_user_role.role = user_role  # Set the relationship manually
    mock_user.user_roles = [mock_user_role]

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_uow] = override_get_uow
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def setup_test_data(db_session, supplier):
    """テストデータをセットアップ"""
    customer = Customer(customer_code="CUS-001", customer_name="得意先A")
    db_session.add(customer)
    db_session.flush()

    delivery_place = DeliveryPlace(
        delivery_place_code="DP-001",
        delivery_place_name="納入先A",
        customer_id=customer.id,
    )
    db_session.add(delivery_place)

    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PROD-001",
        display_name="製品A",
        internal_unit="EA",
        base_unit="EA",
    )
    db_session.add(product)

    db_session.flush()

    return {
        "customer_code": "CUS-001",
        "customer_id": customer.id,
        "product_code": "PROD-001",
        "supplier_item_id": product.id,
        "delivery_place_id": delivery_place.id,
    }


class TestOrderAPI:
    """受注APIのテスト"""

    def test_create_order_success(self, client, setup_test_data):
        """受注作成が成功すること (order_number removed, using customer_order_no at line level)"""
        response = client.post(
            "/api/orders",
            json={
                "customer_id": setup_test_data["customer_id"],
                "order_date": "2024-11-01",
                "lines": [
                    {
                        "supplier_item_id": setup_test_data["supplier_item_id"],
                        "order_quantity": 100.0,
                        "unit": "EA",
                        "delivery_date": "2024-11-15",
                        "delivery_place_id": setup_test_data["delivery_place_id"],
                        "customer_order_no": "ORD001",  # Business key at line level
                    }
                ],
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["id"] is not None
        assert len(data["lines"]) == 1
        assert data["lines"][0]["customer_order_no"] == "ORD001"

    def test_get_order_success(self, client, setup_test_data, db_session):
        """受注詳細取得が成功すること"""
        order = Order(
            customer_id=setup_test_data["customer_id"],
            order_date=date(2024, 11, 1),
            status="open",
        )
        db_session.add(order)
        db_session.flush()

        order_line = OrderLine(
            order_id=order.id,
            supplier_item_id=setup_test_data["supplier_item_id"],
            order_quantity=100.0,
            unit="EA",
            delivery_date=date(2024, 11, 15),
            delivery_place_id=setup_test_data["delivery_place_id"],
            customer_order_no="ORD001",
        )
        db_session.add(order_line)
        db_session.flush()

        response = client.get(f"/api/orders/{order.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == order.id
        assert len(data["lines"]) == 1
        assert data["lines"][0]["customer_order_no"] == "ORD001"

    def test_cancel_order_success(self, client, setup_test_data, db_session):
        """受注キャンセルが成功すること"""
        order = Order(
            customer_id=setup_test_data["customer_id"],
            order_date=date(2024, 11, 1),
            status="open",
        )
        db_session.add(order)
        db_session.flush()

        order_id = order.id

        response = client.delete(f"/api/orders/{order_id}/cancel")

        assert response.status_code == 204

        # DB確認: 新しいクエリでステータスを確認
        db_session.expire_all()
        updated_order = db_session.query(Order).filter(Order.id == order_id).first()
        assert updated_order is not None
        assert updated_order.status == "cancelled"


class TestOrderStateMachine:
    """受注状態遷移のテスト"""

    def test_valid_transitions(self):
        """許可された状態遷移"""
        from app.domain.order import OrderStateMachine

        assert OrderStateMachine.can_transition("open", "allocated") is True
        assert OrderStateMachine.can_transition("allocated", "shipped") is True
        assert OrderStateMachine.can_transition("shipped", "closed") is True

    def test_invalid_transitions(self):
        """禁止された状態遷移"""
        from app.domain.order import InvalidOrderStatusError, OrderStateMachine

        assert OrderStateMachine.can_transition("closed", "open") is False

        with pytest.raises(InvalidOrderStatusError):
            OrderStateMachine.validate_transition("closed", "open")


class TestOrderBusinessRules:
    """受注ビジネスルールのテスト"""

    def test_validate_quantity(self):
        """数量バリデーション"""
        from app.domain.order import OrderBusinessRules, OrderValidationError

        OrderBusinessRules.validate_quantity(100.0, "PROD-001")

        with pytest.raises(OrderValidationError):
            OrderBusinessRules.validate_quantity(0.0, "PROD-001")

        with pytest.raises(OrderValidationError):
            OrderBusinessRules.validate_quantity(-10.0, "PROD-001")

    def test_calculate_progress_percentage(self):
        """進捗率計算"""
        from app.domain.order import OrderBusinessRules

        assert OrderBusinessRules.calculate_progress_percentage(100.0, 50.0) == 50.0
        assert OrderBusinessRules.calculate_progress_percentage(100.0, 100.0) == 100.0
        assert OrderBusinessRules.calculate_progress_percentage(100.0, 0.0) == 0.0
