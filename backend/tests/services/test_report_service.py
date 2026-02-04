"""Tests for ReportService."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.services.reports.report_service import ReportService
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    DeliveryPlace,
    Supplier,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.infrastructure.persistence.models.warehouse_model import Warehouse


@pytest.fixture
def report_data(db: Session):
    """Create master and transaction data for report tests."""
    # Supplier
    supplier = Supplier(supplier_code="SUP-RPT", supplier_name="Report Supplier")
    db.add(supplier)
    db.flush()

    # Product
    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="RPT-PROD-001",
        display_name="Report Product",
        base_unit="EA",
    )
    db.add(product)
    db.flush()

    # Warehouse
    warehouse = Warehouse(
        warehouse_code="WH-RPT",
        warehouse_name="Report Warehouse",
        warehouse_type="internal",
    )
    db.add(warehouse)

    # Customer
    customer = Customer(customer_code="CUST-RPT", customer_name="Report Customer")
    db.add(customer)
    db.flush()

    # Delivery places
    dp1 = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-RPT-1",
        delivery_place_name="Destination A",
    )
    dp2 = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-RPT-2",
        delivery_place_name="Destination B",
    )
    db.add(dp1)
    db.add(dp2)
    db.flush()

    # Lot master + receipt
    lot_master = LotMaster(
        supplier_item_id=product.id,
        lot_number="LOT-RPT-001",
    )
    db.add(lot_master)
    db.flush()

    lot = LotReceipt(
        lot_master_id=lot_master.id,
        supplier_item_id=product.id,
        warehouse_id=warehouse.id,
        received_quantity=Decimal("500"),
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
        status="active",
        unit="EA",
        origin_type="order",
    )
    db.add(lot)
    db.flush()

    return {
        "product": product,
        "warehouse": warehouse,
        "customer": customer,
        "dp1": dp1,
        "dp2": dp2,
        "lot": lot,
    }


class TestGetMonthlyAggregationByDestination:
    """Tests for get_monthly_aggregation_by_destination."""

    def test_returns_empty_when_no_data(self, db: Session, report_data):
        """No suggestions → empty list."""
        service = ReportService(db)
        result = service.get_monthly_aggregation_by_destination(
            product_id=report_data["product"].id,
            warehouse_id=report_data["warehouse"].id,
            year=2026,
            month=1,
        )
        assert result == []

    def test_single_destination(self, db: Session, report_data):
        """Single destination with one suggestion."""
        suggestion = AllocationSuggestion(
            lot_id=report_data["lot"].id,
            supplier_item_id=report_data["product"].id,
            customer_id=report_data["customer"].id,
            delivery_place_id=report_data["dp1"].id,
            quantity=Decimal("50"),
            allocation_type="soft",
            source="test",
            forecast_period="2026-03-15",
        )
        db.add(suggestion)
        db.flush()

        service = ReportService(db)
        result = service.get_monthly_aggregation_by_destination(
            product_id=report_data["product"].id,
            warehouse_id=report_data["warehouse"].id,
            year=2026,
            month=3,
        )

        assert len(result) == 1
        assert result[0]["destination_name"] == "Destination A"
        assert result[0]["customer_name"] == "Report Customer"
        assert result[0]["total_quantity"] == Decimal("50")
        assert result[0]["lot_count"] == 1

    def test_multiple_destinations_sorted_by_quantity(self, db: Session, report_data):
        """Multiple destinations sorted descending by total quantity."""
        # Destination A: 30
        db.add(
            AllocationSuggestion(
                lot_id=report_data["lot"].id,
                supplier_item_id=report_data["product"].id,
                customer_id=report_data["customer"].id,
                delivery_place_id=report_data["dp1"].id,
                quantity=Decimal("30"),
                allocation_type="soft",
                source="test",
                forecast_period="2026-06",
            )
        )
        # Destination B: 80
        db.add(
            AllocationSuggestion(
                lot_id=report_data["lot"].id,
                supplier_item_id=report_data["product"].id,
                customer_id=report_data["customer"].id,
                delivery_place_id=report_data["dp2"].id,
                quantity=Decimal("80"),
                allocation_type="soft",
                source="test",
                forecast_period="2026-06-10",
            )
        )
        db.flush()

        service = ReportService(db)
        result = service.get_monthly_aggregation_by_destination(
            product_id=report_data["product"].id,
            warehouse_id=report_data["warehouse"].id,
            year=2026,
            month=6,
        )

        assert len(result) == 2
        # Sorted by quantity DESC: B (80) > A (30)
        assert result[0]["destination_name"] == "Destination B"
        assert result[0]["total_quantity"] == Decimal("80")
        assert result[1]["destination_name"] == "Destination A"
        assert result[1]["total_quantity"] == Decimal("30")

    def test_aggregates_multiple_suggestions_for_same_destination(self, db: Session, report_data):
        """Multiple suggestions for the same destination are summed."""
        for qty in [Decimal("20"), Decimal("30"), Decimal("50")]:
            db.add(
                AllocationSuggestion(
                    lot_id=report_data["lot"].id,
                    supplier_item_id=report_data["product"].id,
                    customer_id=report_data["customer"].id,
                    delivery_place_id=report_data["dp1"].id,
                    quantity=qty,
                    allocation_type="soft",
                    source="test",
                    forecast_period="2026-04",
                )
            )
        db.flush()

        service = ReportService(db)
        result = service.get_monthly_aggregation_by_destination(
            product_id=report_data["product"].id,
            warehouse_id=report_data["warehouse"].id,
            year=2026,
            month=4,
        )

        assert len(result) == 1
        assert result[0]["total_quantity"] == Decimal("100")
        # All suggestions reference same lot, so lot_count = 1
        assert result[0]["lot_count"] == 1

    def test_filters_by_product_id(self, db: Session, report_data):
        """Only suggestions for the given product_id are included."""
        db.add(
            AllocationSuggestion(
                lot_id=report_data["lot"].id,
                supplier_item_id=report_data["product"].id,
                customer_id=report_data["customer"].id,
                delivery_place_id=report_data["dp1"].id,
                quantity=Decimal("10"),
                allocation_type="soft",
                source="test",
                forecast_period="2026-05",
            )
        )
        db.flush()

        service = ReportService(db)
        # Query with non-existent product_id
        result = service.get_monthly_aggregation_by_destination(
            product_id=99999,
            warehouse_id=report_data["warehouse"].id,
            year=2026,
            month=5,
        )
        assert result == []

    def test_filters_by_warehouse_id(self, db: Session, report_data):
        """Only lots in the given warehouse are included."""
        db.add(
            AllocationSuggestion(
                lot_id=report_data["lot"].id,
                supplier_item_id=report_data["product"].id,
                customer_id=report_data["customer"].id,
                delivery_place_id=report_data["dp1"].id,
                quantity=Decimal("10"),
                allocation_type="soft",
                source="test",
                forecast_period="2026-05",
            )
        )
        db.flush()

        service = ReportService(db)
        # Query with non-existent warehouse_id
        result = service.get_monthly_aggregation_by_destination(
            product_id=report_data["product"].id,
            warehouse_id=99999,
            year=2026,
            month=5,
        )
        assert result == []

    def test_filters_by_month(self, db: Session, report_data):
        """Only suggestions matching the month prefix are included."""
        # Jan data
        db.add(
            AllocationSuggestion(
                lot_id=report_data["lot"].id,
                supplier_item_id=report_data["product"].id,
                customer_id=report_data["customer"].id,
                delivery_place_id=report_data["dp1"].id,
                quantity=Decimal("10"),
                allocation_type="soft",
                source="test",
                forecast_period="2026-01-15",
            )
        )
        # Feb data
        db.add(
            AllocationSuggestion(
                lot_id=report_data["lot"].id,
                supplier_item_id=report_data["product"].id,
                customer_id=report_data["customer"].id,
                delivery_place_id=report_data["dp1"].id,
                quantity=Decimal("20"),
                allocation_type="soft",
                source="test",
                forecast_period="2026-02",
            )
        )
        db.flush()

        service = ReportService(db)
        result = service.get_monthly_aggregation_by_destination(
            product_id=report_data["product"].id,
            warehouse_id=report_data["warehouse"].id,
            year=2026,
            month=2,
        )

        assert len(result) == 1
        assert result[0]["total_quantity"] == Decimal("20")

    def test_excludes_zero_quantity(self, db: Session, report_data):
        """Suggestions with quantity <= 0 are excluded."""
        db.add(
            AllocationSuggestion(
                lot_id=report_data["lot"].id,
                supplier_item_id=report_data["product"].id,
                customer_id=report_data["customer"].id,
                delivery_place_id=report_data["dp1"].id,
                quantity=Decimal("0"),
                allocation_type="soft",
                source="test",
                forecast_period="2026-07",
            )
        )
        db.flush()

        service = ReportService(db)
        result = service.get_monthly_aggregation_by_destination(
            product_id=report_data["product"].id,
            warehouse_id=report_data["warehouse"].id,
            year=2026,
            month=7,
        )
        assert result == []
