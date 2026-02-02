# backend/tests/test_allocations_refactored.py
"""
引当モジュールのテストコード
既存API入出力の挙動を保証する回帰テスト

Updated 2025-12: Removed order_number references after business key refactor.
Orders are now identified by id, with business keys (customer_order_no, sap_order_no)
stored at the order_line level.
"""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    LotReceipt,
    Order,
    OrderLine,
    Supplier,
    SupplierItem,
    Warehouse,
)
from app.main import app
from app.presentation.api.deps import get_db


@pytest.fixture
def client(db_session):
    """テスト用クライアント"""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # conftest.pyが管理するのでcloseしない

    from app.application.services.auth.auth_service import AuthService
    from app.infrastructure.persistence.models.auth_models import User
    from app.presentation.api.routes.auth.auth_router import get_current_user

    mock_user = User(
        id=1,
        username="test",
        email="test@example.com",
        password_hash="hash",
        display_name="Test",
        is_active=True,
    )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[AuthService.get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def setup_test_data(db_session, supplier):
    """テストデータをセットアップ"""
    # Note: commit() is required instead of flush() because SQL views
    # (VOrderLineContext, VLotAvailableQty) cannot see uncommitted data

    # 倉庫
    warehouse = Warehouse(warehouse_code="WH001", warehouse_name="倉庫1", warehouse_type="internal")
    db_session.add(warehouse)
    db_session.flush()

    # 顧客（FK: orders.customer_code が参照）
    customer = Customer(customer_code="CUS-001", customer_name="顧客A")
    db_session.add(customer)
    db_session.flush()

    # 仕入先（FK: lots.supplier_code が参照）
    supplier = Supplier(supplier_code="SUP-001", supplier_name="仕入先A")
    db_session.add(supplier)
    db_session.flush()

    # 製品
    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PROD-001",
        display_name="製品A",
        base_unit="EA",
    )
    db_session.add(product)
    db_session.flush()

    # 納入先 (ForecastCurrentで必要)
    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP001",
        delivery_place_name="納入先1",
    )
    db_session.add(delivery_place)
    db_session.flush()

    # Forecast (APIテスト用にデータを保持)
    from app.infrastructure.persistence.models.forecast_models import ForecastCurrent

    today = date.today()
    forecast = ForecastCurrent(
        customer_id=customer.id,
        delivery_place_id=delivery_place.id,
        supplier_item_id=product.id,
        forecast_date=today,
        forecast_quantity=100,
        forecast_period=today.strftime("%Y-%m"),
    )
    db_session.add(forecast)
    db_session.commit()

    # LotMaster
    from app.infrastructure.persistence.models.lot_master_model import LotMaster

    lot_master = LotMaster(
        supplier_item_id=product.id,
        supplier_id=supplier.id,
        lot_number="LOT-001",
    )
    db_session.add(lot_master)
    db_session.flush()

    # ロット
    lot = LotReceipt(
        lot_master_id=lot_master.id,
        supplier_id=supplier.id,
        supplier_item_id=product.id,
        received_date=today - timedelta(days=7),
        expiry_date=today + timedelta(days=180),
        warehouse_id=warehouse.id,
        received_quantity=100.0,
        unit="EA",
        status="active",
    )
    db_session.add(lot)
    db_session.commit()

    # 受注 (order_number removed - using customer_order_no at line level)
    order = Order(customer_id=customer.id, order_date=today)
    db_session.add(order)
    db_session.commit()

    # 受注明細 (with business keys)
    order_line = OrderLine(
        order_id=order.id,
        supplier_item_id=product.id,
        delivery_date=today + timedelta(days=1),
        order_quantity=50.0,
        unit="EA",
        delivery_place_id=delivery_place.id,
        status="pending",
        customer_order_no="ORD001",  # Business key at line level
    )
    db_session.add(order_line)
    db_session.commit()

    return {
        "lot_id": lot.id,
        "order_id": order.id,
        "order_line_id": order_line.id,
        "customer_id": customer.id,
        "delivery_place_id": delivery_place.id,
        "supplier_item_id": product.id,
        "warehouse_id": warehouse.id,
        "supplier_id": supplier.id,
    }


class TestAllocationAPI:
    """引当APIのテスト"""

    def test_cancel_allocation_not_found(self, client):
        """存在しない引当の取消でエラーが返ること"""
        response = client.delete("/api/allocations/99999")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]


class TestRoundingPolicy:
    """丸めポリシーのテスト"""

    def test_round_allocation_qty(self):
        """引当数量の丸めが正しいこと"""
        from app.domain.allocation import RoundingPolicy

        assert RoundingPolicy.round_allocation_qty(10.123) == 10.12
        assert RoundingPolicy.round_allocation_qty(10.125) == 10.13
        assert RoundingPolicy.round_allocation_qty(10.124) == 10.12


class TestReservationStateMachine:
    """ReservationStateMachine のテスト (C-03: 新しい統一ステートマシン)"""

    def test_valid_transitions(self):
        """許可された状態遷移"""
        from app.infrastructure.persistence.models import ReservationStateMachine

        # TEMPORARY → ACTIVE
        assert ReservationStateMachine.can_transition("temporary", "active") is True
        # TEMPORARY → RELEASED
        assert ReservationStateMachine.can_transition("temporary", "released") is True
        # ACTIVE → CONFIRMED
        assert ReservationStateMachine.can_transition("active", "confirmed") is True
        # ACTIVE → RELEASED
        assert ReservationStateMachine.can_transition("active", "released") is True
        # CONFIRMED → RELEASED
        assert ReservationStateMachine.can_transition("confirmed", "released") is True

    def test_invalid_transitions(self):
        """禁止された状態遷移"""
        from app.infrastructure.persistence.models import ReservationStateMachine

        # RELEASED は終端状態
        assert ReservationStateMachine.can_transition("released", "active") is False
        assert ReservationStateMachine.can_transition("released", "confirmed") is False

        # 逆方向の遷移は不可
        assert ReservationStateMachine.can_transition("confirmed", "active") is False
        assert ReservationStateMachine.can_transition("active", "temporary") is False

    def test_validate_transition_raises_on_invalid(self):
        """不正な遷移で例外が発生すること"""
        from app.infrastructure.persistence.models import ReservationStateMachine

        with pytest.raises(ValueError) as exc_info:
            ReservationStateMachine.validate_transition("released", "active")

        assert "Invalid reservation status transition" in str(exc_info.value)
        assert "released → active" in str(exc_info.value)

    def test_can_confirm(self):
        """確定可能かチェック"""
        from app.infrastructure.persistence.models import ReservationStateMachine

        assert ReservationStateMachine.can_confirm("active") is True
        assert ReservationStateMachine.can_confirm("temporary") is False
        assert ReservationStateMachine.can_confirm("confirmed") is False
        assert ReservationStateMachine.can_confirm("released") is False

    def test_can_release(self):
        """解放可能かチェック"""
        from app.infrastructure.persistence.models import ReservationStateMachine

        assert ReservationStateMachine.can_release("active") is True
        assert ReservationStateMachine.can_release("confirmed") is True
        assert ReservationStateMachine.can_release("temporary") is True
        assert ReservationStateMachine.can_release("released") is False

    def test_is_terminal(self):
        """終端状態チェック"""
        from app.infrastructure.persistence.models import ReservationStateMachine

        assert ReservationStateMachine.is_terminal("released") is True
        assert ReservationStateMachine.is_terminal("active") is False
        assert ReservationStateMachine.is_terminal("confirmed") is False
        assert ReservationStateMachine.is_terminal("temporary") is False
