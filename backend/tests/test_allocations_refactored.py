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
    db_session.commit()

    # 顧客（FK: orders.customer_code が参照）
    customer = Customer(customer_code="CUS-001", customer_name="顧客A")
    db_session.add(customer)
    db_session.commit()

    # 仕入先（FK: lots.supplier_code が参照）
    supplier = Supplier(supplier_code="SUP-001", supplier_name="仕入先A")
    db_session.add(supplier)
    db_session.commit()

    # 製品
    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PROD-001",
        display_name="製品A",
        base_unit="EA",
    )
    db_session.add(product)
    db_session.commit()

    # 納入先 (ForecastCurrentで必要)
    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP001",
        delivery_place_name="納入先1",
    )
    db_session.add(delivery_place)
    db_session.commit()

    # Forecast (APIテスト用にデータを保持)
    from app.infrastructure.persistence.models.forecast_models import ForecastCurrent

    today = date.today()
    forecast = ForecastCurrent(
        customer_id=customer.id,
        delivery_place_id=delivery_place.id,
        product_group_id=product.id,
        forecast_date=today,
        forecast_quantity=100,
        forecast_period=today.strftime("%Y-%m"),
    )
    db_session.add(forecast)
    db_session.commit()

    # LotMaster
    from app.infrastructure.persistence.models.lot_master_model import LotMaster

    lot_master = LotMaster(
        product_group_id=product.id,
        supplier_id=supplier.id,
        lot_number="LOT-001",
    )
    db_session.add(lot_master)
    db_session.flush()

    # ロット
    lot = LotReceipt(
        lot_master_id=lot_master.id,
        supplier_id=supplier.id,
        product_group_id=product.id,
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
        product_group_id=product.id,
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
        "product_group_id": product.id,
        "warehouse_id": warehouse.id,
        "supplier_id": supplier.id,
    }


class TestAllocationAPI:
    """引当APIのテスト"""

    @pytest.mark.skip(reason="Flaky TestClient db visibility - UndefinedTable")
    def test_cancel_allocation_not_found(self, client):
        """存在しない引当の取消でエラーが返ること"""
        response = client.delete("/api/allocations/99999")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    @pytest.mark.xfail(
        reason="View VOrderLineContext not visible in test transaction - requires architecture fix"
    )
    def test_candidate_lots_with_forecast(self, client, setup_test_data):
        """forecast に含まれる商品は候補ロットが返ること（既存動作の確認）"""
        response = client.get(
            f"/api/allocation-candidates?order_line_id={setup_test_data['order_line_id']}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) > 0  # 候補ロットが返る
        # 最初の候補ロットが期待通りの商品であることを確認
        assert data["items"][0]["product_group_id"] == setup_test_data["product_group_id"]

    @pytest.mark.xfail(
        reason="View VOrderLineContext not visible in test transaction - requires architecture fix"
    )
    def test_candidate_lots_without_forecast(self, client, db_session, setup_test_data, supplier):
        """forecast に含まれない商品でも、有効在庫があれば候補ロットが返ること"""
        # 新しい商品を作成（forecast 無し）

        product_no_forecast = SupplierItem(
            supplier_id=supplier.id,
            maker_part_no="PROD-NO-FORECAST",
            display_name="Forecast無し商品",
            base_unit="EA",
        )
        db_session.add(product_no_forecast)
        db_session.flush()

        # この商品のロットを作成（有効在庫あり）
        today = date.today()
        from app.infrastructure.persistence.models.lot_master_model import LotMaster

        lot_master_no_forecast = LotMaster(
            product_group_id=product_no_forecast.id,
            supplier_id=setup_test_data.get("supplier_id"),
            lot_number="LOT-NO-FORECAST",
        )
        db_session.add(lot_master_no_forecast)
        db_session.flush()

        lot_no_forecast = LotReceipt(
            lot_master_id=lot_master_no_forecast.id,
            supplier_id=setup_test_data.get("supplier_id"),
            product_group_id=product_no_forecast.id,
            received_date=today - timedelta(days=3),
            expiry_date=today + timedelta(days=90),
            warehouse_id=setup_test_data["warehouse_id"],
            received_quantity=50.0,
            unit="EA",
            status="active",
        )
        db_session.add(lot_no_forecast)
        db_session.flush()

        # この商品の受注明細を作成
        order_line_no_forecast = OrderLine(
            order_id=setup_test_data["order_id"],
            product_group_id=product_no_forecast.id,
            delivery_date=today + timedelta(days=2),
            order_quantity=20.0,
            unit="EA",
            delivery_place_id=setup_test_data["delivery_place_id"],
            status="pending",
        )
        db_session.add(order_line_no_forecast)
        db_session.flush()

        # forecast が無い商品でも候補ロットが返るか確認
        response = client.get(
            f"/api/allocation-candidates?order_line_id={order_line_no_forecast.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) > 0, "forecast無しでも候補ロットが返るべき"
        assert data["items"][0]["product_group_id"] == product_no_forecast.id
        assert data["items"][0]["lot_id"] == lot_no_forecast.id


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
