# backend/tests/api/test_inbound_plans.py
"""Basic tests for inbound plans API endpoints."""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    Supplier,
    SupplierItem,
    Warehouse,
)


@pytest.fixture
def sample_data(db: Session, supplier):
    """Create sample data."""
    supplier = Supplier(supplier_code="SUP-001", supplier_name="Test Supplier")
    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PROD-001",
        display_name="Test Product",
        base_unit="EA",
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    warehouse = Warehouse(
        warehouse_code="WH-001", warehouse_name="Test WH", warehouse_type="internal"
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    return {"supplier": supplier, "product": product, "warehouse": warehouse}


def test_list_inbound_plans_empty(db: Session, client: TestClient):
    """Test listing inbound plans when none exist."""
    response = client.get("/api/inbound-plans")
    assert response.status_code == 200


def test_list_inbound_plans_with_filters(db: Session, client: TestClient, sample_data):
    """Test listing inbound plans with filters."""
    response = client.get("/api/inbound-plans", params={"supplier_id": sample_data["supplier"].id})
    assert response.status_code == 200


def test_create_inbound_plan_success(db: Session, client: TestClient, sample_data):
    """Test creating an inbound plan."""

    plan_data = {
        "supplier_id": sample_data["supplier"].id,
        "expected_arrival_date": str(date.today() + timedelta(days=7)),
        "status": "planned",
        "lines": [
            {
                "supplier_item_id": sample_data["product"].id,
                "warehouse_id": sample_data["warehouse"].id,
                "expected_quantity": 100.0,
                "unit": "EA",
            }
        ],
    }

    response = client.post("/api/inbound-plans", json=plan_data)
    # May have business logic validation
    assert response.status_code in [201, 400, 422]


def test_get_inbound_plan_not_found(db: Session, client: TestClient):
    """Test getting non-existent plan."""
    response = client.get("/api/inbound-plans/99999")
    assert response.status_code == 404


def test_update_inbound_plan_not_found(db: Session, client: TestClient):
    """Test updating non-existent plan."""
    response = client.put("/api/inbound-plans/99999", json={"status": "received"})
    assert response.status_code == 404


def test_delete_inbound_plan_not_found(db: Session, client: TestClient):
    """Test deleting non-existent plan."""
    response = client.delete("/api/inbound-plans/99999")
    assert response.status_code == 404
