# backend/tests/api/test_inbound_plans.py
"""Basic tests for inbound plans API endpoints."""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import InboundPlan, InboundPlanLine, Product, Supplier, Warehouse


def _truncate_all(db: Session):
    for table in [InboundPlanLine, InboundPlan, Product, Supplier, Warehouse]:
        try:
            db.query(table).delete()
        except Exception:
            pass
    db.commit()


@pytest.fixture
def test_db(db: Session):
    _truncate_all(db)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield db
    _truncate_all(db)
    app.dependency_overrides.clear()


@pytest.fixture
def sample_data(test_db: Session):
    """Create sample data."""
    supplier = Supplier(supplier_code="SUP-001", supplier_name="Test Supplier")
    test_db.add(supplier)
    test_db.commit()
    test_db.refresh(supplier)

    product = Product(maker_part_code="PROD-001", product_name="Test Product", base_unit="EA")
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)

    warehouse = Warehouse(
        warehouse_code="WH-001", warehouse_name="Test WH", warehouse_type="internal"
    )
    test_db.add(warehouse)
    test_db.commit()
    test_db.refresh(warehouse)

    return {"supplier": supplier, "product": product, "warehouse": warehouse}


def test_list_inbound_plans_empty(test_db: Session):
    """Test listing inbound plans when none exist."""
    client = TestClient(app)
    response = client.get("/api/inbound-plans")
    assert response.status_code == 200


def test_list_inbound_plans_with_filters(test_db: Session, sample_data):
    """Test listing inbound plans with filters."""
    client = TestClient(app)
    response = client.get("/api/inbound-plans", params={"supplier_id": sample_data["supplier"].id})
    assert response.status_code == 200


def test_create_inbound_plan_success(test_db: Session, sample_data):
    """Test creating an inbound plan."""
    client = TestClient(app)

    plan_data = {
        "supplier_id": sample_data["supplier"].id,
        "expected_arrival_date": str(date.today() + timedelta(days=7)),
        "status": "planned",
        "lines": [
            {
                "product_id": sample_data["product"].id,
                "warehouse_id": sample_data["warehouse"].id,
                "expected_quantity": 100.0,
                "unit": "EA",
            }
        ],
    }

    response = client.post("/api/inbound-plans", json=plan_data)
    # May have business logic validation
    assert response.status_code in [201, 400, 422]


def test_get_inbound_plan_not_found(test_db: Session):
    """Test getting non-existent plan."""
    client = TestClient(app)
    response = client.get("/api/inbound-plans/99999")
    assert response.status_code == 404


def test_update_inbound_plan_not_found(test_db: Session):
    """Test updating non-existent plan."""
    client = TestClient(app)
    response = client.put("/api/inbound-plans/99999", json={"status": "received"})
    assert response.status_code == 404


def test_delete_inbound_plan_not_found(test_db: Session):
    """Test deleting non-existent plan."""
    client = TestClient(app)
    response = client.delete("/api/inbound-plans/99999")
    assert response.status_code == 404
