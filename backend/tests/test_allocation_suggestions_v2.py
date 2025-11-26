from datetime import date, datetime
from decimal import Decimal

from app.models.forecast_models import ForecastCurrent
from app.models.inventory_models import Lot
from app.models.masters_models import Customer, DeliveryPlace, Product, Supplier, Warehouse
from app.services.allocation.allocation_suggestions_service import AllocationSuggestionService


def test_regenerate_for_periods(db_session):
    # Setup Master Data
    warehouse = Warehouse(
        warehouse_code="WH1", warehouse_name="Main Warehouse", warehouse_type="internal"
    )
    db_session.add(warehouse)

    supplier = Supplier(supplier_code="SUP1", supplier_name="Supplier 1")
    db_session.add(supplier)

    customer = Customer(customer_code="CUST1", customer_name="Customer 1")
    db_session.add(customer)

    delivery_place = DeliveryPlace(
        delivery_place_code="DP1", delivery_place_name="Place 1", customer=customer
    )
    db_session.add(delivery_place)

    product = Product(maker_part_code="PROD1", product_name="Product 1", base_unit="EA")
    db_session.add(product)
    db_session.commit()

    # Setup Lots (FEFO test)
    # Lot 1: Expires sooner (2025-12-01), Qty 100
    lot1 = Lot(
        lot_number="LOT1",
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 1, 1),
        expiry_date=date(2025, 12, 1),
        current_quantity=Decimal("100"),
        allocated_quantity=Decimal("0"),
        unit="EA",
        status="active",
    )
    db_session.add(lot1)

    # Lot 2: Expires later (2026-01-01), Qty 100
    lot2 = Lot(
        lot_number="LOT2",
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 1, 1),
        expiry_date=date(2026, 1, 1),
        current_quantity=Decimal("100"),
        allocated_quantity=Decimal("0"),
        unit="EA",
        status="active",
    )
    db_session.add(lot2)
    db_session.commit()

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
    db_session.add(forecast)
    db_session.commit()

    # Execute Service
    service = AllocationSuggestionService(db_session)
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


def test_regenerate_with_shortage(db_session):
    # Setup Master Data
    warehouse = Warehouse(
        warehouse_code="WH2", warehouse_name="Main Warehouse 2", warehouse_type="internal"
    )
    db_session.add(warehouse)

    supplier = Supplier(supplier_code="SUP2", supplier_name="Supplier 2")
    db_session.add(supplier)

    customer = Customer(customer_code="CUST2", customer_name="Customer 2")
    db_session.add(customer)

    delivery_place = DeliveryPlace(
        delivery_place_code="DP2", delivery_place_name="Place 2", customer=customer
    )
    db_session.add(delivery_place)

    product = Product(maker_part_code="PROD2", product_name="Product 2", base_unit="EA")
    db_session.add(product)
    db_session.commit()

    # Setup Lots (Shortage test)
    # Lot 1: Qty 50
    lot1 = Lot(
        lot_number="LOT3",
        product_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 1, 1),
        expiry_date=date(2025, 12, 1),
        current_quantity=Decimal("50"),
        allocated_quantity=Decimal("0"),
        unit="EA",
        status="active",
    )
    db_session.add(lot1)
    db_session.commit()

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
    db_session.add(forecast)
    db_session.commit()

    # Execute Service
    service = AllocationSuggestionService(db_session)
    response = service.regenerate_for_periods(["2025-11"])

    # Verify
    assert len(response.suggestions) == 1
    assert response.suggestions[0].quantity == Decimal("50")

    assert response.stats.total_forecast_quantity == Decimal("100")
    assert response.stats.total_allocated_quantity == Decimal("50")
    assert response.stats.total_shortage_quantity == Decimal("50")

    assert len(response.gaps) == 1
    assert response.gaps[0].shortage_quantity == Decimal("50")
