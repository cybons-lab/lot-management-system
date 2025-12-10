"""Tests for preempt_soft_allocations_for_hard function.

Tests the automatic release of soft allocations when hard allocations are confirmed,
following priority rules: KANBAN > ORDER > SPOT > FORECAST_LINKED
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.services.allocations.actions import preempt_soft_allocations_for_hard
from app.infrastructure.persistence.models import (
    Allocation,
    Customer,
    DeliveryPlace,
    ForecastCurrent,
    Lot,
    Order,
    OrderLine,
    Product,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_reservations_model import LotReservation


def _truncate_all(db: Session):
    """Clean up test data in dependency order."""
    tables = [
        Allocation,
        LotReservation,
        OrderLine,
        Order,
        ForecastCurrent,
        Lot,
        DeliveryPlace,
        Product,
        Customer,
        Warehouse,
    ]
    for table in tables:
        try:
            db.query(table).delete()
        except Exception:
            pass
    db.commit()


@pytest.fixture
def test_db(db: Session):
    """Provide clean database session for each test."""
    _truncate_all(db)
    yield db
    _truncate_all(db)


@pytest.fixture
def master_data(test_db: Session):
    """Create master data for testing."""
    # Warehouse
    warehouse = Warehouse(
        warehouse_code="WH-001",
        warehouse_name="Test Warehouse",
        warehouse_type="internal",
    )
    test_db.add(warehouse)
    test_db.flush()

    # Customer
    customer = Customer(
        customer_code="CUST-001",
        customer_name="Test Customer",
    )
    test_db.add(customer)
    test_db.flush()

    # Product
    product = Product(
        maker_part_code="PROD-001",
        product_name="Test Product",
        base_unit="EA",
    )
    test_db.add(product)
    test_db.flush()

    # Delivery Place
    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DEL-001",
        delivery_place_name="Test Delivery Place",
    )
    test_db.add(delivery_place)
    test_db.commit()

    return {
        "warehouse": warehouse,
        "customer": customer,
        "product": product,
        "delivery_place": delivery_place,
    }


@pytest.fixture
def lot_with_stock(test_db: Session, master_data):
    """Create a lot with available stock."""
    lot = Lot(
        lot_number="LOT-001",
        product_id=master_data["product"].id,
        warehouse_id=master_data["warehouse"].id,
        current_quantity=Decimal("1000"),
        expiry_date=date.today() + timedelta(days=30),
        received_date=date.today(),
        status="active",
        unit="EA",
    )
    test_db.add(lot)
    test_db.commit()
    test_db.refresh(lot)
    return lot


def create_order_line(
    test_db: Session,
    master_data: dict,
    order_type: str,
    quantity: Decimal,
) -> OrderLine:
    """Helper to create an order line with specified order_type."""
    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
    )
    test_db.add(order)
    test_db.flush()

    order_line = OrderLine(
        order_id=order.id,
        product_id=master_data["product"].id,
        delivery_place_id=master_data["delivery_place"].id,
        delivery_date=date.today() + timedelta(days=7),
        order_quantity=quantity,
        unit="EA",
        order_type=order_type,
        status="pending",
    )
    test_db.add(order_line)
    test_db.commit()
    test_db.refresh(order_line)
    return order_line


def create_soft_allocation(
    test_db: Session,
    order_line: OrderLine,
    lot: Lot,
    quantity: Decimal,
) -> Allocation:
    """Helper to create a soft allocation with corresponding LotReservation."""
    from app.infrastructure.persistence.models.lot_reservations_model import (
        LotReservation,
        ReservationSourceType,
        ReservationStatus,
    )

    allocation = Allocation(
        order_line_id=order_line.id,
        lot_reference=lot.lot_number,
        allocated_quantity=quantity,
        allocation_type="soft",
        status="allocated",
        created_at=datetime.utcnow(),
    )
    test_db.add(allocation)

    # Create corresponding LotReservation
    reservation = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=order_line.id,
        reserved_qty=quantity,
        status=ReservationStatus.ACTIVE,
    )
    test_db.add(reservation)
    test_db.commit()
    test_db.refresh(allocation)
    return allocation


class TestPreemptSoftAllocations:
    """Test suite for preempt_soft_allocations_for_hard function."""

    def test_no_preemption_when_sufficient_stock(
        self, test_db: Session, master_data, lot_with_stock
    ):
        """Test: No soft allocations are released when there is sufficient available stock."""
        # Create soft allocation (300 units)
        order_line = create_order_line(test_db, master_data, "FORECAST_LINKED", Decimal("300"))
        create_soft_allocation(test_db, order_line, lot_with_stock, Decimal("300"))

        # Try to allocate 500 units (should succeed without preemption)
        # Available: 1000 - 300 = 700 units
        hard_line = create_order_line(test_db, master_data, "ORDER", Decimal("500"))

        released = preempt_soft_allocations_for_hard(
            test_db,
            lot_id=lot_with_stock.id,
            required_qty=Decimal("500"),
            hard_demand_id=hard_line.id,
        )

        assert len(released) == 0
        # Soft allocation should still exist
        remaining_allocations = test_db.query(Allocation).filter_by(allocation_type="soft").count()
        assert remaining_allocations == 1

    def test_preemption_forecast_linked_first(self, test_db: Session, master_data, lot_with_stock):
        """Test: FORECAST_LINKED (lowest priority) is released first."""
        # Create soft allocations
        forecast_line = create_order_line(test_db, master_data, "FORECAST_LINKED", Decimal("300"))
        order_line = create_order_line(test_db, master_data, "ORDER", Decimal("300"))

        create_soft_allocation(test_db, forecast_line, lot_with_stock, Decimal("300"))
        create_soft_allocation(test_db, order_line, lot_with_stock, Decimal("300"))

        # Total allocated: 600
        # Available: 1000 - 600 = 400
        # Try to allocate 700 units (need to release 300)
        hard_line = create_order_line(test_db, master_data, "KANBAN", Decimal("700"))

        released = preempt_soft_allocations_for_hard(
            test_db,
            lot_id=lot_with_stock.id,
            required_qty=Decimal("700"),
            hard_demand_id=hard_line.id,
        )

        # Should release FORECAST_LINKED first
        assert len(released) == 1
        assert released[0]["order_type"] == "FORECAST_LINKED"
        assert released[0]["released_qty"] == 300.0

        # ORDER soft allocation should still exist
        remaining = (
            test_db.query(Allocation)
            .filter_by(allocation_type="soft", order_line_id=order_line.id)
            .count()
        )
        assert remaining == 1

    def test_preemption_priority_order(self, test_db: Session, master_data, lot_with_stock):
        """Test: Soft allocations are released in priority order (FORECAST < SPOT < ORDER < KANBAN)."""
        # Create soft allocations for all types
        forecast_line = create_order_line(test_db, master_data, "FORECAST_LINKED", Decimal("200"))
        spot_line = create_order_line(test_db, master_data, "SPOT", Decimal("200"))
        order_line = create_order_line(test_db, master_data, "ORDER", Decimal("200"))
        kanban_line = create_order_line(test_db, master_data, "KANBAN", Decimal("200"))

        create_soft_allocation(test_db, forecast_line, lot_with_stock, Decimal("200"))
        create_soft_allocation(test_db, spot_line, lot_with_stock, Decimal("200"))
        create_soft_allocation(test_db, order_line, lot_with_stock, Decimal("200"))
        create_soft_allocation(test_db, kanban_line, lot_with_stock, Decimal("200"))

        # Total allocated: 800
        # Available: 1000 - 800 = 200
        # Try to allocate 600 units (need to release 400)
        hard_line = create_order_line(test_db, master_data, "KANBAN", Decimal("600"))

        released = preempt_soft_allocations_for_hard(
            test_db,
            lot_id=lot_with_stock.id,
            required_qty=Decimal("600"),
            hard_demand_id=hard_line.id,
        )

        # Should release FORECAST (200) and SPOT (200) = 400 total
        assert len(released) == 2
        assert released[0]["order_type"] == "FORECAST_LINKED"
        assert released[0]["released_qty"] == 200.0
        assert released[1]["order_type"] == "SPOT"
        assert released[1]["released_qty"] == 200.0

        # ORDER and KANBAN soft allocations should still exist
        remaining_order = (
            test_db.query(Allocation)
            .filter_by(allocation_type="soft", order_line_id=order_line.id)
            .count()
        )
        remaining_kanban = (
            test_db.query(Allocation)
            .filter_by(allocation_type="soft", order_line_id=kanban_line.id)
            .count()
        )
        assert remaining_order == 1
        assert remaining_kanban == 1

    def test_partial_preemption(self, test_db: Session, master_data, lot_with_stock):
        """Test: Partial release when only part of an allocation needs to be released."""
        # Create soft allocation of 500 units
        forecast_line = create_order_line(test_db, master_data, "FORECAST_LINKED", Decimal("500"))
        create_soft_allocation(test_db, forecast_line, lot_with_stock, Decimal("500"))

        # Available: 1000 - 500 = 500
        # Try to allocate 700 units (need to release 200)
        hard_line = create_order_line(test_db, master_data, "ORDER", Decimal("700"))

        released = preempt_soft_allocations_for_hard(
            test_db,
            lot_id=lot_with_stock.id,
            required_qty=Decimal("700"),
            hard_demand_id=hard_line.id,
        )

        # Should release only 200 units (not all 500)
        assert len(released) == 1
        assert released[0]["released_qty"] == 200.0

        # Check lot reserved quantity updated correctly via LotReservation
        from app.application.services.inventory.stock_calculation import get_reserved_quantity

        test_db.refresh(lot_with_stock)
        # Original 500 - 200 released = 300 remaining
        reserved = get_reserved_quantity(test_db, lot_with_stock.id)
        assert reserved == Decimal("300")

    def test_no_self_preemption(self, test_db: Session, master_data, lot_with_stock):
        """Test: Hard demand doesn't release its own soft allocation."""
        # Create soft allocation
        order_line = create_order_line(test_db, master_data, "ORDER", Decimal("500"))
        create_soft_allocation(test_db, order_line, lot_with_stock, Decimal("500"))

        # Try to confirm the same order_line as hard
        released = preempt_soft_allocations_for_hard(
            test_db,
            lot_id=lot_with_stock.id,
            required_qty=Decimal("500"),
            hard_demand_id=order_line.id,  # Same as soft allocation
        )

        # Should not release its own allocation
        assert len(released) == 0

        # Soft allocation should still exist
        remaining = (
            test_db.query(Allocation)
            .filter_by(allocation_type="soft", order_line_id=order_line.id)
            .count()
        )
        assert remaining == 1

    def test_lot_not_found(self, test_db: Session):
        """Test: Returns empty list when lot doesn't exist."""
        released = preempt_soft_allocations_for_hard(
            test_db,
            lot_id=99999,  # Non-existent lot
            required_qty=Decimal("100"),
            hard_demand_id=1,
        )

        assert released == []

    def test_release_updates_lot_allocated_quantity(
        self, test_db: Session, master_data, lot_with_stock
    ):
        """Test: Lot's reserved_quantity is correctly updated after release."""
        from app.application.services.inventory.stock_calculation import get_reserved_quantity

        # Create soft allocation
        forecast_line = create_order_line(test_db, master_data, "FORECAST_LINKED", Decimal("400"))
        create_soft_allocation(test_db, forecast_line, lot_with_stock, Decimal("400"))

        initial_reserved = get_reserved_quantity(test_db, lot_with_stock.id)
        assert initial_reserved == Decimal("400")

        # Release 200 units
        hard_line = create_order_line(test_db, master_data, "KANBAN", Decimal("800"))

        preempt_soft_allocations_for_hard(
            test_db,
            lot_id=lot_with_stock.id,
            required_qty=Decimal("800"),
            hard_demand_id=hard_line.id,
        )

        # Check lot reserved quantity via LotReservation
        from app.application.services.inventory.stock_calculation import get_reserved_quantity

        test_db.refresh(lot_with_stock)
        # Need 800, available was 600 (1000 - 400), so release 200
        reserved = get_reserved_quantity(test_db, lot_with_stock.id)
        assert reserved == Decimal("200")

    def test_multiple_soft_allocations_same_priority(
        self, test_db: Session, master_data, lot_with_stock
    ):
        """Test: When multiple soft allocations have same priority, older ones are released first."""
        # Create two FORECAST_LINKED allocations at different times
        import time

        forecast_line1 = create_order_line(test_db, master_data, "FORECAST_LINKED", Decimal("300"))
        alloc1 = create_soft_allocation(test_db, forecast_line1, lot_with_stock, Decimal("300"))
        alloc1.created_at = datetime.utcnow() - timedelta(hours=2)  # Older
        test_db.commit()

        time.sleep(0.01)  # Ensure different timestamps

        forecast_line2 = create_order_line(test_db, master_data, "FORECAST_LINKED", Decimal("300"))
        alloc2 = create_soft_allocation(test_db, forecast_line2, lot_with_stock, Decimal("300"))
        alloc2.created_at = datetime.utcnow()  # Newer
        test_db.commit()

        # Available: 1000 - 600 = 400
        # Try to allocate 600 units (need to release 200)
        hard_line = create_order_line(test_db, master_data, "KANBAN", Decimal("600"))

        released = preempt_soft_allocations_for_hard(
            test_db,
            lot_id=lot_with_stock.id,
            required_qty=Decimal("600"),
            hard_demand_id=hard_line.id,
        )

        # Should release older allocation first (partial)
        assert len(released) == 1
        assert released[0]["order_line_id"] == forecast_line1.id
        assert released[0]["released_qty"] == 200.0
