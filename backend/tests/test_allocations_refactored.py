# backend/tests/test_allocations_refactored.py
"""
引当モジュールのテストコード
既存API入出力の挙動を保証する回帰テスト
"""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.main import app
from app.models import (
    Allocation,
    Customer,
    Lot,
    LotCurrentStock,
    Order,
    OrderLine,
    Product,
    Supplier,
    Warehouse,
)


# ✅ 修正: conftest.pyのdb_sessionを使用（独自engineを削除）


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


@pytest.fixture
def setup_test_data(db_session):
    """テストデータをセットアップ"""
    # 倉庫
    warehouse = Warehouse(warehouse_code="WH001", warehouse_name="倉庫1")
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
    product = Product(
        product_code="PROD-001",
        product_name="製品A",
        packaging_qty=1,
        packaging_unit="EA",
        internal_unit="EA",
        base_unit="EA",
    )
    db_session.add(product)
    db_session.flush()

    # ロット - warehouse_idのみ使用
    today = date.today()
    lot = Lot(
        supplier_code="SUP-001",
        product_code="PROD-001",
        lot_number="LOT-001",
        receipt_date=today - timedelta(days=7),
        expiry_date=today + timedelta(days=180),
        warehouse_id=warehouse.id,
    )
    db_session.add(lot)
    db_session.flush()

    # 現在在庫
    current_stock = LotCurrentStock(lot_id=lot.id, current_quantity=100.0)
    db_session.add(current_stock)

    # 受注
    order = Order(order_no="ORD-001", customer_code="CUS-001", order_date=today)
    db_session.add(order)
    db_session.flush()

    # 受注明細
    order_line = OrderLine(
        order_id=order.id, line_no=1, product_code="PROD-001", quantity=50.0, unit="EA"
    )
    db_session.add(order_line)

    db_session.flush()  # commitではなくflushを使用

    return {"lot_id": lot.id, "order_line_id": order_line.id}


class TestAllocationAPI:
    """引当APIのテスト"""

    def test_drag_assign_success(self, client, setup_test_data):
        """ドラッグ引当が成功すること"""
        response = client.post(
            "/api/allocations/drag-assign",
            json={
                "order_line_id": setup_test_data["order_line_id"],
                "lot_id": setup_test_data["lot_id"],
                "allocate_qty": 30.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "allocation_id" in data
        assert "引当成功" in data["message"]

    def test_drag_assign_insufficient_stock(self, client, setup_test_data):
        """在庫不足の場合にエラーが返ること"""
        response = client.post(
            "/api/allocations/drag-assign",
            json={
                "order_line_id": setup_test_data["order_line_id"],
                "lot_id": setup_test_data["lot_id"],
                "allocate_qty": 150.0,
            },
        )

        assert response.status_code == 400
        assert "Insufficient stock" in response.json()["detail"]

    def test_cancel_allocation_success(self, client, setup_test_data, db_session):
        """引当取消が成功すること"""
        allocation = Allocation(
            order_line_id=setup_test_data["order_line_id"],
            lot_id=setup_test_data["lot_id"],
            allocated_qty=30.0,
            status="active",
        )
        db_session.add(allocation)
        db_session.flush()

        response = client.delete(f"/api/allocations/{allocation.id}")

        assert response.status_code == 204

        db_session.refresh(allocation)
        assert allocation.status == "cancelled"

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


class TestStateMachine:
    """状態遷移のテスト"""

    def test_valid_transitions(self):
        """許可された状態遷移"""
        from app.domain.allocation import AllocationStateMachine

        assert AllocationStateMachine.can_transition("active", "shipped") is True
        assert AllocationStateMachine.can_transition("active", "cancelled") is True

    def test_invalid_transitions(self):
        """禁止された状態遷移"""
        from app.domain.allocation import AllocationStateMachine, InvalidTransitionError

        assert AllocationStateMachine.can_transition("shipped", "active") is False
        assert AllocationStateMachine.can_transition("cancelled", "active") is False

        with pytest.raises(InvalidTransitionError):
            AllocationStateMachine.validate_transition("shipped", "active")
