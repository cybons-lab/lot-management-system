"""Tests for report API endpoints."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    DeliveryPlace,
    Supplier,
    Warehouse,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem


@pytest.fixture
def report_api_data(db: Session):
    """Create master and transaction data for report API tests."""
    supplier = Supplier(supplier_code="SUP-RAPI", supplier_name="API Report Supplier")
    db.add(supplier)
    db.flush()

    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="RAPI-PROD-001",
        display_name="API Report Product",
        base_unit="EA",
    )
    db.add(product)
    db.flush()

    warehouse = Warehouse(
        warehouse_code="WH-RAPI",
        warehouse_name="API Report Warehouse",
        warehouse_type="internal",
    )
    db.add(warehouse)

    customer = Customer(customer_code="CUST-RAPI", customer_name="API Customer")
    db.add(customer)
    db.flush()

    dp = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-RAPI-1",
        delivery_place_name="API Destination",
    )
    db.add(dp)
    db.flush()

    lot_master = LotMaster(supplier_item_id=product.id, lot_number="LOT-RAPI-001")
    db.add(lot_master)
    db.flush()

    lot = LotReceipt(
        lot_master_id=lot_master.id,
        supplier_item_id=product.id,
        warehouse_id=warehouse.id,
        received_quantity=Decimal("200"),
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=60),
        status="active",
        unit="EA",
        origin_type="order",
    )
    db.add(lot)
    db.flush()

    suggestion = AllocationSuggestion(
        lot_id=lot.id,
        supplier_item_id=product.id,
        customer_id=customer.id,
        delivery_place_id=dp.id,
        quantity=Decimal("75"),
        allocation_type="soft",
        source="test_api",
        forecast_period="2026-08-10",
    )
    db.add(suggestion)
    db.flush()

    return {
        "product": product,
        "warehouse": warehouse,
        "customer": customer,
        "dp": dp,
        "lot": lot,
    }


class TestGetMonthlyByDestination:
    """Tests for GET /api/reports/monthly-by-destination."""

    def test_success(self, client: TestClient, report_api_data):
        """Returns aggregation data for the given parameters."""
        response = client.get(
            "/api/reports/monthly-by-destination",
            params={
                "product_id": report_api_data["product"].id,
                "warehouse_id": report_api_data["warehouse"].id,
                "year": 2026,
                "month": 8,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["destination_name"] == "API Destination"
        assert data[0]["customer_name"] == "API Customer"
        assert float(data[0]["total_quantity"]) == 75.0
        assert data[0]["lot_count"] == 1

    def test_empty_result(self, client: TestClient, report_api_data):
        """Returns empty array when no data matches."""
        response = client.get(
            "/api/reports/monthly-by-destination",
            params={
                "product_id": report_api_data["product"].id,
                "warehouse_id": report_api_data["warehouse"].id,
                "year": 2025,
                "month": 1,
            },
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_missing_required_params(self, client: TestClient):
        """Returns 422 when required parameters are missing."""
        response = client.get("/api/reports/monthly-by-destination")
        assert response.status_code == 422

    def test_invalid_month(self, client: TestClient, report_api_data):
        """Returns 422 for month > 12."""
        response = client.get(
            "/api/reports/monthly-by-destination",
            params={
                "product_id": report_api_data["product"].id,
                "warehouse_id": report_api_data["warehouse"].id,
                "year": 2026,
                "month": 13,
            },
        )
        assert response.status_code == 422

    def test_invalid_year(self, client: TestClient, report_api_data):
        """Returns 422 for year out of range."""
        response = client.get(
            "/api/reports/monthly-by-destination",
            params={
                "product_id": report_api_data["product"].id,
                "warehouse_id": report_api_data["warehouse"].id,
                "year": 1999,
                "month": 6,
            },
        )
        assert response.status_code == 422
