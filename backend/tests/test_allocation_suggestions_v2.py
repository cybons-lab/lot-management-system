"""Tests for AllocationSuggestionService.

These tests verify the FEFO allocation suggestion logic for forecasts.
Restored after order_number removal refactor (2025-12).
"""

from datetime import date, datetime
from decimal import Decimal

from app.application.services.allocations.suggestion import AllocationSuggestionService
from app.infrastructure.persistence.models.forecast_models import ForecastCurrent
from app.infrastructure.persistence.models.inventory_models import LotReceipt
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    DeliveryPlace,
    Product,
    Supplier,
    Warehouse,
)


def test_regenerate_for_periods(db):
    """Test basic FEFO allocation suggestion regeneration."""
    # Setup Master Data
    warehouse = Warehouse(
        warehouse_code="WH1", warehouse_name="Main Warehouse", warehouse_type="internal"
    )
    db.add(warehouse)

    supplier = Supplier(supplier_code="SUP1", supplier_name="Supplier 1")
    db.add(supplier)

    customer = Customer(customer_code="CUST1", customer_name="Customer 1")
    db.add(customer)

    delivery_place = DeliveryPlace(
        delivery_place_code="DP1", delivery_place_name="Place 1", customer=customer
    )
    db.add(delivery_place)

    product = Product(maker_part_code="PROD1", product_name="Product 1", base_unit="EA")
    db.add(product)
    db.commit()

    # Setup Lots (FEFO test)
    # Lot 1: Expires sooner (2025-12-01), Qty 100
    lot_master1 = LotMaster(
        product_id=product.id,
        lot_number="LOT1",
    )
    db.add(lot_master1)
    db.flush()

    lot1 = LotReceipt(
        lot_master_id=lot_master1.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 1, 1),
        expiry_date=date(2026, 12, 1),
        received_quantity=Decimal("100"),
        unit="EA",
        status="active",
        origin_type="order",
    )
    db.add(lot1)

    # Lot 2: Expires later (2026-01-01), Qty 100
    lot_master2 = LotMaster(
        product_id=product.id,
        lot_number="LOT2",
    )
    db.add(lot_master2)
    db.flush()

    lot2 = LotReceipt(
        lot_master_id=lot_master2.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 1, 1),
        expiry_date=date(2027, 1, 1),
        received_quantity=Decimal("100"),
        unit="EA",
        status="active",
        origin_type="order",
    )
    db.add(lot2)
    db.commit()

    # Setup Forecast
    # Period 2025-11, Qty 150
    forecast = ForecastCurrent(
        customer_id=customer.id,
        delivery_place_id=delivery_place.id,
        product_id=product.id,
        forecast_date=date(2025, 11, 1),
        forecast_quantity=Decimal("150"),
        unit="EA",
        forecast_period="2025-11",
        snapshot_at=datetime.now(),
    )
    db.add(forecast)
    db.commit()

    # Execute Service
    service = AllocationSuggestionService(db)
    response = service.regenerate_for_periods(["2025-11"])

    # Verify
    assert len(response.suggestions) == 2

    # Should allocate from Lot 1 first (100) then Lot 2 (50)
    s1 = next(s for s in response.suggestions if s.lot_id == lot1.id)
    s2 = next(s for s in response.suggestions if s.lot_id == lot2.id)

    assert s1.quantity == Decimal("100")
    assert s2.quantity == Decimal("50")

    assert response.stats.total_forecast_quantity == Decimal("150")
    assert response.stats.total_allocated_quantity == Decimal("150")
    assert response.stats.total_shortage_quantity == Decimal("0")
    assert len(response.gaps) == 0


def test_regenerate_with_shortage(db):
    """Test allocation suggestion with inventory shortage."""
    # Setup Master Data
    warehouse = Warehouse(
        warehouse_code="WH2", warehouse_name="Main Warehouse 2", warehouse_type="internal"
    )
    db.add(warehouse)

    supplier = Supplier(supplier_code="SUP2", supplier_name="Supplier 2")
    db.add(supplier)

    customer = Customer(customer_code="CUST2", customer_name="Customer 2")
    db.add(customer)

    delivery_place = DeliveryPlace(
        delivery_place_code="DP2", delivery_place_name="Place 2", customer=customer
    )
    db.add(delivery_place)

    product = Product(maker_part_code="PROD2", product_name="Product 2", base_unit="EA")
    db.add(product)
    db.commit()

    # Setup Lots (Shortage test)
    # Lot 1: Qty 50
    lot_master1 = LotMaster(
        product_id=product.id,
        lot_number="LOT3",
    )
    db.add(lot_master1)
    db.flush()

    lot1 = LotReceipt(
        lot_master_id=lot_master1.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 1, 1),
        expiry_date=date(2026, 12, 1),
        received_quantity=Decimal("50"),
        unit="EA",
        status="active",
        origin_type="order",
    )
    db.add(lot1)
    db.commit()

    # Setup Forecast
    # Period 2025-11, Qty 100 (Shortage 50)
    forecast = ForecastCurrent(
        customer_id=customer.id,
        delivery_place_id=delivery_place.id,
        product_id=product.id,
        forecast_date=date(2025, 11, 1),
        forecast_quantity=Decimal("100"),
        unit="EA",
        forecast_period="2025-11",
        snapshot_at=datetime.now(),
    )
    db.add(forecast)
    db.commit()

    # Execute Service
    service = AllocationSuggestionService(db)
    response = service.regenerate_for_periods(["2025-11"])

    # Verify
    assert len(response.suggestions) == 1
    assert response.suggestions[0].quantity == Decimal("50")

    assert response.stats.total_forecast_quantity == Decimal("100")
    assert response.stats.total_allocated_quantity == Decimal("50")
    assert response.stats.total_shortage_quantity == Decimal("50")

    assert len(response.gaps) == 1
    assert response.gaps[0].shortage_quantity == Decimal("50")


def test_regenerate_single_lot_fit(db):
    """
    Test "Single Lot Fit" strategy:
    If a demand (80) can be covered by a single lot (100) but not by the oldest lot (50),
    prefer the single lot (100) even if it is newer.
    """
    # Setup Master Data
    warehouse = Warehouse(
        warehouse_code="WH3", warehouse_name="Main Warehouse 3", warehouse_type="internal"
    )
    db.add(warehouse)

    supplier = Supplier(supplier_code="SUP3", supplier_name="Supplier 3")
    db.add(supplier)

    customer = Customer(customer_code="CUST3", customer_name="Customer 3")
    db.add(customer)

    delivery_place = DeliveryPlace(
        delivery_place_code="DP3", delivery_place_name="Place 3", customer=customer
    )
    db.add(delivery_place)

    product = Product(maker_part_code="PROD3", product_name="Product 3", base_unit="EA")
    db.add(product)
    db.commit()

    # Setup Lots
    # Lot 1 (Older): Qty 50. Expires 2025-11-01.
    lot_master1 = LotMaster(
        product_id=product.id,
        lot_number="LOT_OLD_SMALL",
    )
    db.add(lot_master1)
    db.flush()

    lot1 = LotReceipt(
        lot_master_id=lot_master1.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 1, 1),
        expiry_date=date(2026, 11, 1),
        received_quantity=Decimal("50"),
        unit="EA",
        status="active",
        origin_type="order",
    )
    db.add(lot1)

    # Lot 2 (Newer): Qty 100. Expires 2025-12-01.
    lot_master2 = LotMaster(
        product_id=product.id,
        lot_number="LOT_NEW_LARGE",
    )
    db.add(lot_master2)
    db.flush()

    lot2 = LotReceipt(
        lot_master_id=lot_master2.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 2, 1),
        expiry_date=date(2026, 12, 1),
        received_quantity=Decimal("100"),
        unit="EA",
        status="active",
        origin_type="order",
    )
    db.add(lot2)
    db.commit()

    # Setup Forecast
    # Period 2025-11, Qty 80.
    # Older lot (50) cannot cover it. Newer lot (100) can.
    # Expected: Allocate 80 from LOT_NEW_LARGE (Single Lot Fit).
    forecast = ForecastCurrent(
        customer_id=customer.id,
        delivery_place_id=delivery_place.id,
        product_id=product.id,
        forecast_date=date(2025, 11, 15),
        forecast_quantity=Decimal("80"),
        unit="EA",
        forecast_period="2025-11",
        snapshot_at=datetime.now(),
    )
    db.add(forecast)
    db.commit()

    # Execute Service
    service = AllocationSuggestionService(db)
    response = service.regenerate_for_periods(["2025-11"])

    # Verify
    # Should have exactly 1 allocation
    assert len(response.suggestions) == 1
    suggestion = response.suggestions[0]

    # It should be from Lot 2 (Newer/Large)
    assert suggestion.lot_id == lot2.id
    assert suggestion.quantity == Decimal("80")

    # Stats verification
    assert response.stats.total_forecast_quantity == Decimal("80")
    assert response.stats.total_allocated_quantity == Decimal("80")
    assert response.stats.total_shortage_quantity == Decimal("0")
