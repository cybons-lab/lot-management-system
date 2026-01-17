from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.services.inventory.stock_calculation import (
    get_allocatable_quantity,
    get_available_quantity,
    get_confirmed_reserved_quantity,
    get_provisional_quantity,
    get_reserved_quantity,
)
from app.infrastructure.persistence.models import (
    LotMaster,
    LotReceipt,
    LotReservation,
    Product,
    ReservationSourceType,
    ReservationStatus,
    Warehouse,
)


@pytest.fixture
def stock_test_data(db_session: Session):
    """Setup data for stock calculation tests."""
    # Basic master data
    prod = Product(
        maker_part_code="CALC-TEST-001",
        product_name="Calculation Test Product",
        base_unit="EA",
    )
    wh = Warehouse(
        warehouse_code="WH-CALC",
        warehouse_name="Calc Test Warehouse",
        warehouse_type="internal",
    )
    db_session.add_all([prod, wh])
    db_session.flush()

    # Lot Master
    lm = LotMaster(
        product_id=prod.id,
        lot_number="LOT-CALC-001",
    )
    db_session.add(lm)
    db_session.flush()

    # Lot (Initial state: 100 qty, no locks)
    lot = LotReceipt(
        lot_master_id=lm.id,
        product_id=prod.id,
        warehouse_id=wh.id,
        received_quantity=Decimal("100.0"),
        locked_quantity=Decimal("0.0"),
        unit="EA",
        received_date=date.today(),
        status="active",
    )
    db_session.add(lot)
    db_session.commit()
    db_session.refresh(lot)

    return {"lot": lot, "product": prod, "warehouse": wh}


def test_basic_availability(stock_test_data, db_session):
    """Test available quantity with no reservations or locks."""
    lot = stock_test_data["lot"]

    # 100 (current) - 0 (reserved) - 0 (locked) = 100
    available = get_available_quantity(db_session, lot)
    assert available == Decimal("100.0")


def test_confirmed_reservation_reduces_availability(stock_test_data, db_session):
    """Test that CONFIRMED reservations reduce available quantity."""
    lot = stock_test_data["lot"]

    # Add CONFIRMED reservation
    res = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=1,
        reserved_qty=Decimal("20.0"),
        status=ReservationStatus.CONFIRMED,
    )
    db_session.add(res)
    db_session.commit()

    # 100 (current) - 20 (confirmed) - 0 (locked) = 80
    available = get_available_quantity(db_session, lot)
    assert available == Decimal("80.0")

    # Verify helper matches
    confirmed = get_confirmed_reserved_quantity(db_session, lot.id)
    assert confirmed == Decimal("20.0")


def test_active_reservation_ignored_for_availability(stock_test_data, db_session):
    """
    Test that ACTIVE (provisional) reservations DO NOT reduce available quantity
    per business rule (allow overbooking/provisional).
    """
    lot = stock_test_data["lot"]

    # Add ACTIVE reservation
    res = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=2,
        reserved_qty=Decimal("15.0"),
        status=ReservationStatus.ACTIVE,
    )
    db_session.add(res)
    db_session.commit()

    # 100 (current) - 0 (confirmed) - 0 (locked) = 100
    # Active reservation is IGNORED for availability calculation
    available = get_available_quantity(db_session, lot)
    assert available == Decimal("100.0")

    # But it should be visible in provisional quantity
    provisional = get_provisional_quantity(db_session, lot.id)
    assert provisional == Decimal("15.0")


def test_lock_reduces_availability(stock_test_data, db_session):
    """Test that locked_quantity reduces available quantity."""
    lot = stock_test_data["lot"]

    # Lock 10 items
    lot.locked_quantity = Decimal("10.0")
    lot.lock_reason = "Inspection"
    db_session.commit()
    db_session.refresh(lot)

    # 100 (current) - 0 (reserved) - 10 (locked) = 90
    available = get_available_quantity(db_session, lot)
    assert available == Decimal("90.0")


def test_allocatable_quantity_logic(stock_test_data, db_session):
    """
    Test get_allocatable_quantity logic.
    It should validly ignore 'locked' quantity (as that's handled separately or allowed for specific allocation modes),
    but still subtract confirmed reservations.
    Wait: get_allocatable_quantity docstring says "allocatable = current - reserved".
    """
    lot = stock_test_data["lot"]

    # Add CONFIRMED reservation: 20
    res = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=1,
        reserved_qty=Decimal("20.0"),
        status=ReservationStatus.CONFIRMED,
    )
    db_session.add(res)

    # Add Lock: 5
    lot.locked_quantity = Decimal("5.0")
    db_session.commit()

    # Confirm regular availability: 100 - 20 - 5 = 75
    available = get_available_quantity(db_session, lot)
    assert available == Decimal("75.0")

    # Allocatable (ignoring lock): 100 - 20 = 80
    allocatable = get_allocatable_quantity(db_session, lot)
    assert allocatable == Decimal("80.0")


def test_complex_calculation_scenario(stock_test_data, db_session):
    """
    Test combination of all factors:
    Current: 100
    - Confirmed Reservation: 20
    - Confirmed Reservation 2: 5
    - Active Reservation: 10 (Ignored)
    - Locked: 5

    Expected Available: 100 - (20+5) - 5 = 70
    """
    lot = stock_test_data["lot"]

    # 1. Confirmed Reservation: 20
    db_session.add(
        LotReservation(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            reserved_qty=Decimal("20.0"),
            status=ReservationStatus.CONFIRMED,
        )
    )

    # 2. Confirmed Reservation 2: 5
    db_session.add(
        LotReservation(
            lot_id=lot.id,
            source_type=ReservationSourceType.MANUAL,
            source_id=99,
            reserved_qty=Decimal("5.0"),
            status=ReservationStatus.CONFIRMED,
        )
    )

    # 3. Active Reservation: 10
    db_session.add(
        LotReservation(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=2,
            reserved_qty=Decimal("10.0"),
            status=ReservationStatus.ACTIVE,
        )
    )

    # 4. Locked: 5
    lot.locked_quantity = Decimal("5.0")

    db_session.commit()
    db_session.refresh(lot)

    # Verify
    available = get_available_quantity(db_session, lot)
    assert available == Decimal("70.0")

    reserved = get_reserved_quantity(db_session, lot.id)
    assert reserved == Decimal("25.0")  # 20 + 5 (Confirmed only)

    provisional = get_provisional_quantity(db_session, lot.id)
    assert provisional == Decimal("10.0")  # Active only
