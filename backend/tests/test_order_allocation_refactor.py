"""Tests for order allocation refactoring."""

import pytest
from sqlalchemy.orm import Session

from app.domain.order import InvalidOrderStatusError, OrderStateMachine, OrderStatus
from app.models import Customer, Order, OrderLine, Product
from app.services.allocation.allocations_service import _load_order


class TestOrderStatusEnum:
    """OrderStatus Enum とヘルパー関数のテスト."""

    def test_from_str_valid(self):
        """有効な文字列からEnumへの変換."""
        assert OrderStatus.from_str("draft") == OrderStatus.DRAFT
        assert OrderStatus.from_str("open") == OrderStatus.OPEN
        assert OrderStatus.from_str("part_allocated") == OrderStatus.PART_ALLOCATED
        assert OrderStatus.from_str("allocated") == OrderStatus.ALLOCATED
        assert OrderStatus.from_str("shipped") == OrderStatus.SHIPPED
        assert OrderStatus.from_str("closed") == OrderStatus.CLOSED
        assert OrderStatus.from_str("cancelled") == OrderStatus.CANCELLED

    def test_from_str_invalid(self):
        """無効な文字列からEnumへの変換はValueError."""
        with pytest.raises(ValueError, match="Invalid order status"):
            OrderStatus.from_str("invalid_status")

    def test_to_str(self):
        """EnumからDB保存用の文字列への変換."""
        assert OrderStatus.DRAFT.to_str() == "draft"
        assert OrderStatus.OPEN.to_str() == "open"
        assert OrderStatus.PART_ALLOCATED.to_str() == "part_allocated"
        assert OrderStatus.ALLOCATED.to_str() == "allocated"
        assert OrderStatus.SHIPPED.to_str() == "shipped"
        assert OrderStatus.CLOSED.to_str() == "closed"
        assert OrderStatus.CANCELLED.to_str() == "cancelled"


class TestOrderStateMachine:
    """OrderStateMachine の遷移テスト."""

    def test_can_transition_allowed(self):
        """許可された遷移."""
        # draft -> open
        assert OrderStateMachine.can_transition(OrderStatus.DRAFT, OrderStatus.OPEN) is True
        # open -> part_allocated
        assert (
            OrderStateMachine.can_transition(OrderStatus.OPEN, OrderStatus.PART_ALLOCATED) is True
        )
        # open -> allocated
        assert OrderStateMachine.can_transition(OrderStatus.OPEN, OrderStatus.ALLOCATED) is True
        # part_allocated -> allocated
        assert (
            OrderStateMachine.can_transition(OrderStatus.PART_ALLOCATED, OrderStatus.ALLOCATED)
            is True
        )
        # allocated -> shipped
        assert (
            OrderStateMachine.can_transition(OrderStatus.ALLOCATED, OrderStatus.SHIPPED) is True
        )
        # shipped -> closed
        assert OrderStateMachine.can_transition(OrderStatus.SHIPPED, OrderStatus.CLOSED) is True

    def test_can_transition_disallowed(self):
        """許可されない遷移."""
        # closed -> open (終端状態から遷移不可)
        assert OrderStateMachine.can_transition(OrderStatus.CLOSED, OrderStatus.OPEN) is False
        # cancelled -> open (終端状態から遷移不可)
        assert OrderStateMachine.can_transition(OrderStatus.CANCELLED, OrderStatus.OPEN) is False
        # shipped -> draft (逆方向は不可)
        assert OrderStateMachine.can_transition(OrderStatus.SHIPPED, OrderStatus.DRAFT) is False

    def test_validate_transition_allowed(self):
        """validate_transition: 許可された遷移は例外なし."""
        # Enum 渡し
        OrderStateMachine.validate_transition(OrderStatus.OPEN, OrderStatus.ALLOCATED)
        # str 渡し（互換性）
        OrderStateMachine.validate_transition("open", "allocated")

    def test_validate_transition_disallowed(self):
        """validate_transition: 許可されない遷移は InvalidOrderStatusError."""
        with pytest.raises(InvalidOrderStatusError):
            OrderStateMachine.validate_transition(OrderStatus.CLOSED, OrderStatus.OPEN)

        with pytest.raises(InvalidOrderStatusError):
            OrderStateMachine.validate_transition("closed", "open")

    def test_validate_transition_str_to_enum_conversion(self):
        """validate_transition: str -> Enum 変換が正しく動作."""
        # 許可された遷移（str）
        OrderStateMachine.validate_transition("draft", "open")
        OrderStateMachine.validate_transition("open", "part_allocated")

        # 許可されない遷移（str）
        with pytest.raises(InvalidOrderStatusError):
            OrderStateMachine.validate_transition("shipped", "draft")


class TestLoadOrder:
    """_load_order() 関数のテスト."""

    def test_load_order_by_id(self, db_session: Session):
        """ID で注文を取得."""
        # テストデータ作成
        customer = Customer(customer_code="CUST001", customer_name="Test Customer")
        db_session.add(customer)
        db_session.flush()

        order = Order(
            order_no="ORD001",
            order_date="2025-01-01",
            status="open",
            customer_id=customer.id,
            customer_code=customer.customer_code,
        )
        db_session.add(order)
        db_session.flush()

        product = Product(product_code="PROD001", product_name="Test Product")
        db_session.add(product)
        db_session.flush()

        order_line = OrderLine(
            order_id=order.id, line_no=1, product_id=product.id, quantity=10.0
        )
        db_session.add(order_line)
        db_session.commit()

        # ID で取得
        loaded_order = _load_order(db_session, order_id=order.id)
        assert loaded_order.id == order.id
        assert loaded_order.order_no == "ORD001"
        assert len(loaded_order.order_lines) == 1

    def test_load_order_by_order_no(self, db_session: Session):
        """注文番号で注文を取得."""
        # テストデータ作成
        customer = Customer(customer_code="CUST002", customer_name="Test Customer 2")
        db_session.add(customer)
        db_session.flush()

        order = Order(
            order_no="ORD002",
            order_date="2025-01-02",
            status="open",
            customer_id=customer.id,
            customer_code=customer.customer_code,
        )
        db_session.add(order)
        db_session.commit()

        # 注文番号で取得
        loaded_order = _load_order(db_session, order_no="ORD002")
        assert loaded_order.order_no == "ORD002"
        assert loaded_order.status == "open"

    def test_load_order_not_found_by_id(self, db_session: Session):
        """存在しない ID で取得すると ValueError."""
        with pytest.raises(ValueError, match="Order not found: ID=9999"):
            _load_order(db_session, order_id=9999)

    def test_load_order_not_found_by_order_no(self, db_session: Session):
        """存在しない注文番号で取得すると ValueError."""
        with pytest.raises(ValueError, match="Order not found: order_no=NONEXISTENT"):
            _load_order(db_session, order_no="NONEXISTENT")

    def test_load_order_no_params(self, db_session: Session):
        """パラメータなしで呼び出すと ValueError."""
        with pytest.raises(ValueError, match="Either order_id or order_no must be provided"):
            _load_order(db_session)


class TestAllocationPreviewStatus:
    """引当プレビューの状態チェックテスト."""

    def test_preview_allowed_statuses(self, db_session: Session):
        """プレビューは draft|open|part_allocated|allocated を許容."""
        from app.services.allocation.allocations_service import preview_fefo_allocation

        # テストデータ作成
        customer = Customer(customer_code="CUST003", customer_name="Test Customer 3")
        db_session.add(customer)
        db_session.flush()

        # draft, open, part_allocated, allocated でテスト
        for status in ["draft", "open", "part_allocated", "allocated"]:
            order = Order(
                order_no=f"ORD_PREVIEW_{status}",
                order_date="2025-01-03",
                status=status,
                customer_id=customer.id,
                customer_code=customer.customer_code,
            )
            db_session.add(order)
            db_session.flush()

            # プレビューが成功すること（警告があっても良い）
            try:
                result = preview_fefo_allocation(db_session, order.id)
                assert result.order_id == order.id
            except ValueError as e:
                # 状態チェック以外のエラー（製品未設定など）は許容
                assert "does not allow preview" not in str(e)

    def test_preview_disallowed_statuses(self, db_session: Session):
        """プレビューは shipped|closed|cancelled を拒否."""
        from app.services.allocation.allocations_service import preview_fefo_allocation

        # テストデータ作成
        customer = Customer(customer_code="CUST004", customer_name="Test Customer 4")
        db_session.add(customer)
        db_session.flush()

        # shipped, closed, cancelled でテスト
        for status in ["shipped", "closed", "cancelled"]:
            order = Order(
                order_no=f"ORD_PREVIEW_DISALLOW_{status}",
                order_date="2025-01-04",
                status=status,
                customer_id=customer.id,
                customer_code=customer.customer_code,
            )
            db_session.add(order)
            db_session.flush()

            # プレビューが失敗すること
            with pytest.raises(ValueError, match="does not allow preview"):
                preview_fefo_allocation(db_session, order.id)


class TestAllocationCommitStatus:
    """引当確定の状態チェックテスト."""

    def test_commit_allowed_statuses(self, db_session: Session):
        """確定は open|part_allocated のみ許容."""
        from app.services.allocation.allocations_service import commit_fefo_allocation

        # テストデータ作成
        customer = Customer(customer_code="CUST005", customer_name="Test Customer 5")
        db_session.add(customer)
        db_session.flush()

        product = Product(product_code="PROD002", product_name="Test Product 2")
        db_session.add(product)
        db_session.flush()

        # open, part_allocated でテスト
        for status in ["open", "part_allocated"]:
            order = Order(
                order_no=f"ORD_COMMIT_{status}",
                order_date="2025-01-05",
                status=status,
                customer_id=customer.id,
                customer_code=customer.customer_code,
            )
            db_session.add(order)
            db_session.flush()

            order_line = OrderLine(
                order_id=order.id, line_no=1, product_id=product.id, quantity=10.0
            )
            db_session.add(order_line)
            db_session.commit()

            # 確定が状態チェックを通過すること（在庫不足などは別）
            try:
                commit_fefo_allocation(db_session, order.id)
            except Exception as e:
                # 状態チェック以外のエラーは許容
                assert "does not allow commit" not in str(e)

    def test_commit_disallowed_statuses(self, db_session: Session):
        """確定は draft|allocated|shipped|closed|cancelled を拒否."""
        from app.services.allocation.allocations_service import commit_fefo_allocation

        # テストデータ作成
        customer = Customer(customer_code="CUST006", customer_name="Test Customer 6")
        db_session.add(customer)
        db_session.flush()

        # draft, allocated, shipped, closed, cancelled でテスト
        for status in ["draft", "allocated", "shipped", "closed", "cancelled"]:
            order = Order(
                order_no=f"ORD_COMMIT_DISALLOW_{status}",
                order_date="2025-01-06",
                status=status,
                customer_id=customer.id,
                customer_code=customer.customer_code,
            )
            db_session.add(order)
            db_session.flush()

            # 確定が失敗すること
            with pytest.raises(ValueError, match="does not allow commit"):
                commit_fefo_allocation(db_session, order.id)
