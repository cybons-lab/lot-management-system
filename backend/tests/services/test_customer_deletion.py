"""Tests for CustomerService with relation check and order transition.

Tests:
- Physical deletion blocked when related data exists
- Physical deletion allowed when no related data
- Soft deletion transitions orders correctly
"""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.services.common.relation_check_service import RelationCheckService
from app.application.services.masters.customer_service import CustomerService


class TestRelationCheckService:
    """Tests for relation check service."""

    def test_customer_has_no_related_data(self, db_session: Session):
        """Customer with no orders should return False."""
        from app.infrastructure.persistence.models.masters_models import Customer

        # Create customer
        customer = Customer(
            customer_code="TEST001",
            customer_name="Test Customer",
        )
        db_session.add(customer)
        db_session.commit()

        # Check
        checker = RelationCheckService(db_session)
        assert checker.customer_has_related_data(customer.id) is False

        # Cleanup
        db_session.delete(customer)
        db_session.commit()

    def test_customer_has_related_orders(self, db_session: Session):
        """Customer with orders should return True."""
        from app.infrastructure.persistence.models.masters_models import (
            Customer,
        )
        from app.infrastructure.persistence.models.orders_models import Order

        # Create customer
        customer = Customer(
            customer_code="TEST002",
            customer_name="Test Customer 2",
        )
        db_session.add(customer)
        db_session.commit()

        # Create order
        order = Order(
            customer_id=customer.id,
            order_date=date.today(),
            status="open",
        )
        db_session.add(order)
        db_session.commit()

        # Check
        checker = RelationCheckService(db_session)
        assert checker.customer_has_related_data(customer.id) is True

        # Cleanup
        db_session.delete(order)
        db_session.delete(customer)
        db_session.commit()


class TestCustomerServiceHardDelete:
    """Tests for hard delete with relation check."""

    def test_hard_delete_blocked_with_orders(self, db_session: Session):
        """Hard delete should fail when customer has orders."""
        from fastapi import HTTPException

        from app.infrastructure.persistence.models.masters_models import Customer
        from app.infrastructure.persistence.models.orders_models import Order

        # Create customer with order
        customer = Customer(
            customer_code="DEL001",
            customer_name="Delete Test Customer",
        )
        db_session.add(customer)
        db_session.commit()

        order = Order(
            customer_id=customer.id,
            order_date=date.today(),
            status="open",
        )
        db_session.add(order)
        db_session.commit()

        # Attempt hard delete
        service = CustomerService(db_session)
        with pytest.raises(HTTPException) as exc_info:
            service.hard_delete_by_code("DEL001")

        assert exc_info.value.status_code == 409
        assert "関連データが存在するため削除できません" in exc_info.value.detail

        # Cleanup
        db_session.delete(order)
        db_session.delete(customer)
        db_session.commit()

    def test_hard_delete_allowed_without_orders(self, db_session: Session):
        """Hard delete should succeed when customer has no orders."""
        from app.infrastructure.persistence.models.masters_models import Customer

        # Create customer without order
        customer = Customer(
            customer_code="DEL002",
            customer_name="Delete Test Customer 2",
        )
        db_session.add(customer)
        db_session.commit()

        # Hard delete should succeed
        service = CustomerService(db_session)
        service.hard_delete_by_code("DEL002")

        # Verify deleted
        assert db_session.query(Customer).filter(Customer.customer_code == "DEL002").first() is None


class TestCustomerServiceSoftDeleteOrderTransition:
    """Tests for order status transitions on soft delete."""

    def test_soft_delete_cancels_unallocated_orders(self, db_session: Session):
        """Soft delete should cancel orders without allocations."""
        from app.infrastructure.persistence.models.masters_models import (
            Customer,
            DeliveryPlace,
            Product,
        )
        from app.infrastructure.persistence.models.orders_models import Order, OrderLine

        # Create customer
        customer = Customer(
            customer_code="SOFT001",
            customer_name="Soft Delete Test",
        )
        db_session.add(customer)
        db_session.commit()

        # Create delivery place
        delivery_place = DeliveryPlace(
            customer_id=customer.id,
            delivery_place_code="SOFT001-DP",
            delivery_place_name="Test Delivery Place SOFT001",
        )
        db_session.add(delivery_place)
        db_session.commit()

        # Create product
        product = Product(
            maker_part_code="SOFT001-PROD",
            product_name="Test Product SOFT001",
            base_unit="EA",
        )
        db_session.add(product)
        db_session.commit()

        # Create order with line (no allocation)
        order = Order(
            customer_id=customer.id,
            order_date=date.today(),
            status="open",
        )
        db_session.add(order)
        db_session.commit()

        order_line = OrderLine(
            order_id=order.id,
            product_id=product.id,
            delivery_place_id=delivery_place.id,
            delivery_date=date.today(),
            order_quantity=Decimal("100"),
            unit="EA",
            status="pending",
        )
        db_session.add(order_line)
        db_session.commit()

        # Soft delete customer
        service = CustomerService(db_session)
        service.delete_by_code("SOFT001")

        # Verify order line is cancelled
        db_session.refresh(order_line)
        assert order_line.status == "cancelled"

        # Verify order header is closed
        db_session.refresh(order)
        assert order.status == "closed"

        # Cleanup
        db_session.delete(order_line)
        db_session.flush()  # OrderLine削除を先に確定
        db_session.delete(order)
        db_session.delete(delivery_place)
        db_session.delete(product)
        db_session.delete(customer)
        db_session.commit()

    def test_soft_delete_holds_allocated_orders(self, db_session: Session):
        """Soft delete should put allocated orders on hold."""
        from app.infrastructure.persistence.models.inventory_models import Lot
        from app.infrastructure.persistence.models.lot_reservations_model import (
            LotReservation,
        )
        from app.infrastructure.persistence.models.masters_models import (
            Customer,
            DeliveryPlace,
            Product,
            Warehouse,
        )
        from app.infrastructure.persistence.models.orders_models import Order, OrderLine

        # Create customer
        customer = Customer(
            customer_code="SOFT002",
            customer_name="Soft Delete Allocated Test",
        )
        db_session.add(customer)
        db_session.commit()

        # Create delivery place
        delivery_place = DeliveryPlace(
            customer_id=customer.id,
            delivery_place_code="SOFT002-DP",
            delivery_place_name="Test Delivery Place SOFT002",
        )
        db_session.add(delivery_place)
        db_session.commit()

        # Create product
        product = Product(
            maker_part_code="SOFT002-PROD",
            product_name="Test Product SOFT002",
            base_unit="EA",
        )
        db_session.add(product)
        db_session.commit()

        # Create warehouse
        warehouse = Warehouse(
            warehouse_code="SOFT002-WH",
            warehouse_name="Test Warehouse SOFT002",
            warehouse_type="internal",
        )
        db_session.add(warehouse)
        db_session.commit()

        # Create lot
        lot = Lot(
            lot_number="SOFT002-LOT",
            product_id=product.id,
            warehouse_id=warehouse.id,
            current_quantity=Decimal("1000"),
            received_date=date.today(),
            unit="EA",
        )
        db_session.add(lot)
        db_session.commit()

        # Create order with line
        order = Order(
            customer_id=customer.id,
            order_date=date.today(),
            status="allocated",
        )
        db_session.add(order)
        db_session.commit()

        order_line = OrderLine(
            order_id=order.id,
            product_id=product.id,
            delivery_place_id=delivery_place.id,
            delivery_date=date.today(),
            order_quantity=Decimal("100"),
            unit="EA",
            status="allocated",
        )
        db_session.add(order_line)
        db_session.commit()

        # Create reservation (allocation)
        reservation = LotReservation(
            lot_id=lot.id,
            source_type="order",
            source_id=order_line.id,
            reserved_qty=Decimal("100"),
        )
        db_session.add(reservation)
        db_session.commit()

        # Soft delete customer
        service = CustomerService(db_session)
        service.delete_by_code("SOFT002")

        # Verify order line is on_hold
        db_session.refresh(order_line)
        assert order_line.status == "on_hold"

        # Verify order header is on_hold
        db_session.refresh(order)
        assert order.status == "on_hold"

        # Cleanup
        db_session.delete(reservation)
        db_session.delete(order_line)
        db_session.flush()  # OrderLine削除を先に確定
        db_session.delete(order)
        db_session.delete(lot)
        db_session.delete(warehouse)
        db_session.delete(delivery_place)
        db_session.delete(product)
        db_session.delete(customer)
        db_session.commit()
