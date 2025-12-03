# backend/tests/api/test_warehouses.py
"""Comprehensive tests for warehouses API endpoints.

Tests cover:
- GET /warehouses - List warehouses
- GET /warehouses/{code} - Get warehouse detail
- POST /warehouses - Create warehouse
- PUT /warehouses/{code} - Update warehouse
- DELETE /warehouses/{code} - Delete warehouse
- POST /warehouses/bulk-upsert - Bulk upsert
- Error scenarios (validation, not found, duplicate)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import Warehouse


def _truncate_all(db: Session):
    """Clean up test data."""
    db.query(Warehouse).delete()
    db.commit()


@pytest.fixture
def test_db(db: Session):
    """Provide clean database session for each test."""
    _truncate_all(db)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield db
    _truncate_all(db)
    app.dependency_overrides.clear()


# GET /warehouses
def test_list_warehouses_success(test_db: Session):
    """Test listing warehouses."""
    client = TestClient(app)

    # Create test warehouses
    wh1 = Warehouse(
        warehouse_code="WH-001", warehouse_name="Main Warehouse", warehouse_type="internal"
    )
    wh2 = Warehouse(
        warehouse_code="WH-002", warehouse_name="Sub Warehouse", warehouse_type="external"
    )
    test_db.add_all([wh1, wh2])
    test_db.commit()

    response = client.get("/api/masters/warehouses")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_list_warehouses_empty(test_db: Session):
    """Test listing warehouses when none exist."""
    client = TestClient(app)
    response = client.get("/api/masters/warehouses")
    assert response.status_code == 200
    assert response.json() == []


# GET /warehouses/{code}
def test_get_warehouse_success(test_db: Session):
    """Test getting warehouse by code."""
    client = TestClient(app)

    wh = Warehouse(
        warehouse_code="WH-TEST", warehouse_name="Test Warehouse", warehouse_type="internal"
    )
    test_db.add(wh)
    test_db.commit()

    response = client.get("/api/masters/warehouses/WH-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["warehouse_code"] == "WH-TEST"
    assert data["warehouse_name"] == "Test Warehouse"


def test_get_warehouse_not_found(test_db: Session):
    """Test getting non-existent warehouse returns 404."""
    client = TestClient(app)
    response = client.get("/api/masters/warehouses/NONEXISTENT")
    assert response.status_code == 404


# POST /warehouses
def test_create_warehouse_success(test_db: Session):
    """Test creating a warehouse."""
    client = TestClient(app)

    warehouse_data = {
        "warehouse_code": "WH-NEW",
        "warehouse_name": "New Warehouse",
        "warehouse_type": "internal",
    }

    response = client.post("/api/masters/warehouses", json=warehouse_data)
    assert response.status_code == 201
    data = response.json()
    assert data["warehouse_code"] == "WH-NEW"


def test_create_warehouse_duplicate_returns_409(test_db: Session):
    """Test creating warehouse with duplicate code returns 409."""
    client = TestClient(app)

    # Create existing warehouse
    existing = Warehouse(
        warehouse_code="WH-DUP", warehouse_name="Existing", warehouse_type="internal"
    )
    test_db.add(existing)
    test_db.commit()

    # Try to create duplicate
    warehouse_data = {
        "warehouse_code": "WH-DUP",
        "warehouse_name": "Duplicate",
        "warehouse_type": "internal",
    }

    response = client.post("/api/masters/warehouses", json=warehouse_data)
    assert response.status_code == 409


# PUT /warehouses/{code}
def test_update_warehouse_success(test_db: Session):
    """Test updating a warehouse."""
    client = TestClient(app)

    wh = Warehouse(warehouse_code="WH-UPD", warehouse_name="Old Name", warehouse_type="internal")
    test_db.add(wh)
    test_db.commit()

    update_data = {"warehouse_name": "New Name"}
    response = client.put("/api/masters/warehouses/WH-UPD", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["warehouse_name"] == "New Name"


def test_update_warehouse_not_found(test_db: Session):
    """Test updating non-existent warehouse returns 404."""
    client = TestClient(app)
    update_data = {"warehouse_name": "New Name"}
    response = client.put("/api/masters/warehouses/NONEXISTENT", json=update_data)
    assert response.status_code == 404


# DELETE /warehouses/{code}
def test_delete_warehouse_success(test_db: Session):
    """Test deleting a warehouse."""
    client = TestClient(app)

    wh = Warehouse(warehouse_code="WH-DEL", warehouse_name="Delete Me", warehouse_type="internal")
    test_db.add(wh)
    test_db.commit()

    response = client.delete("/api/masters/warehouses/WH-DEL")
    assert response.status_code == 204

    # Verify deleted
    deleted = test_db.query(Warehouse).filter(Warehouse.warehouse_code == "WH-DEL").first()
    assert deleted is None


def test_delete_warehouse_not_found(test_db: Session):
    """Test deleting non-existent warehouse returns 404."""
    client = TestClient(app)
    response = client.delete("/api/masters/warehouses/NONEXISTENT")
    assert response.status_code == 404


# POST /warehouses/bulk-upsert
def test_bulk_upsert_warehouses_success(test_db: Session):
    """Test bulk upserting warehouses."""
    client = TestClient(app)

    # Create one existing warehouse
    existing = Warehouse(
        warehouse_code="WH-EXIST", warehouse_name="Old Name", warehouse_type="internal"
    )
    test_db.add(existing)
    test_db.commit()

    bulk_data = {
        "warehouses": [
            {
                "warehouse_code": "WH-EXIST",
                "warehouse_name": "Updated Name",
                "warehouse_type": "internal",
            },
            {
                "warehouse_code": "WH-NEW",
                "warehouse_name": "New Warehouse",
                "warehouse_type": "external",
            },
        ]
    }

    response = client.post("/api/masters/warehouses/bulk-upsert", json=bulk_data)
    assert response.status_code == 200
    data = response.json()
    assert data["created"] >= 1
    assert data["updated"] >= 1
