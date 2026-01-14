# backend/tests/api/test_warehouses.py
"""Comprehensive tests for warehouses API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models import Warehouse
from app.main import app


def _truncate_all(db: Session):
    """Clean up test data."""
    try:
        # Use DELETE instead of TRUNCATE to avoid transaction issues
        # Order matters due to foreign keys
        db.execute(text("DELETE FROM lots"))
        db.execute(text("DELETE FROM warehouses"))
        db.commit()
    except Exception:
        db.rollback()


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


# ===== GET /api/masters/warehouses Tests =====


def test_list_warehouses_success(test_db: Session):
    """Test listing warehouses."""
    client = TestClient(app)

    w1 = Warehouse(warehouse_code="WH-001", warehouse_name="Warehouse 1", warehouse_type="internal")
    w2 = Warehouse(warehouse_code="WH-002", warehouse_name="Warehouse 2", warehouse_type="external")
    test_db.add_all([w1, w2])
    test_db.commit()

    response = client.get("/api/masters/warehouses")
    assert response.status_code == 200
    data = response.json()
    codes = [w["warehouse_code"] for w in data]
    assert "WH-001" in codes
    assert "WH-002" in codes


def test_list_warehouses_with_pagination(test_db: Session):
    """Test listing warehouses with pagination."""
    client = TestClient(app)

    # Create 5 warehouses
    for i in range(1, 6):
        w = Warehouse(
            warehouse_code=f"PAGE-{i:03d}",
            warehouse_name=f"Warehouse {i}",
            warehouse_type="internal",
        )
        test_db.add(w)
    test_db.commit()

    # Test pagination
    response = client.get("/api/masters/warehouses", params={"skip": 0, "limit": 3})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3


# ===== GET /api/masters/warehouses/{code} Tests =====


def test_get_warehouse_success(test_db: Session):
    """Test getting warehouse by code."""
    client = TestClient(app)

    w = Warehouse(
        warehouse_code="GET-TEST", warehouse_name="Test Warehouse", warehouse_type="internal"
    )
    test_db.add(w)
    test_db.commit()

    response = client.get("/api/masters/warehouses/GET-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["warehouse_code"] == "GET-TEST"
    assert data["warehouse_name"] == "Test Warehouse"


def test_get_warehouse_not_found(test_db: Session):
    """Test getting non-existent warehouse returns 404."""
    client = TestClient(app)
    response = client.get("/api/masters/warehouses/NONEXISTENT-WH")
    assert response.status_code == 404


# ===== POST /api/masters/warehouses Tests =====


def test_create_warehouse_success(test_db: Session):
    """Test creating a warehouse."""
    client = TestClient(app)

    warehouse_data = {
        "warehouse_code": "CREATE-001",
        "warehouse_name": "New Warehouse",
        "warehouse_type": "internal",
    }

    response = client.post("/api/masters/warehouses", json=warehouse_data)
    assert response.status_code == 201
    data = response.json()
    assert data["warehouse_code"] == "CREATE-001"
    assert data["warehouse_name"] == "New Warehouse"

    # Verify in DB
    db_warehouse = test_db.query(Warehouse).filter(Warehouse.warehouse_code == "CREATE-001").first()
    assert db_warehouse is not None
    assert db_warehouse.warehouse_name == "New Warehouse"


def test_create_warehouse_duplicate_returns_409(test_db: Session):
    """Test creating duplicate warehouse returns 409."""
    client = TestClient(app)

    existing = Warehouse(
        warehouse_code="DUP-001", warehouse_name="Existing", warehouse_type="internal"
    )
    test_db.add(existing)
    test_db.commit()

    warehouse_data = {
        "warehouse_code": "DUP-001",
        "warehouse_name": "Duplicate",
        "warehouse_type": "external",
    }

    response = client.post("/api/masters/warehouses", json=warehouse_data)
    assert response.status_code == 409


# ===== PUT /api/masters/warehouses/{code} Tests =====


def test_update_warehouse_success(test_db: Session):
    """Test updating a warehouse."""
    client = TestClient(app)

    w = Warehouse(warehouse_code="UPD-001", warehouse_name="Old Name", warehouse_type="internal")
    test_db.add(w)
    test_db.commit()

    update_data = {"warehouse_name": "Updated Name"}
    response = client.put("/api/masters/warehouses/UPD-001", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["warehouse_name"] == "Updated Name"


def test_update_warehouse_not_found(test_db: Session):
    """Test updating non-existent warehouse returns 404."""
    client = TestClient(app)
    response = client.put("/api/masters/warehouses/NONEXISTENT-UPD", json={"warehouse_name": "New"})
    assert response.status_code == 404


def test_update_warehouse_code_change_success(test_db: Session):
    """Test updating warehouse code succeeds."""
    client = TestClient(app)

    w = Warehouse(
        warehouse_code="OLD-WH-CODE",
        warehouse_name="Test Warehouse",
        warehouse_type="internal",
    )
    test_db.add(w)
    test_db.commit()

    update_data = {
        "warehouse_code": "NEW-WH-CODE",
        "warehouse_name": "Updated Warehouse",
        "warehouse_type": "external",
    }

    response = client.put("/api/masters/warehouses/OLD-WH-CODE", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["warehouse_code"] == "NEW-WH-CODE"
    assert data["warehouse_name"] == "Updated Warehouse"
    assert data["warehouse_type"] == "external"

    # Verify old code no longer exists
    response = client.get("/api/masters/warehouses/OLD-WH-CODE")
    assert response.status_code == 404

    # Verify new code exists
    response = client.get("/api/masters/warehouses/NEW-WH-CODE")
    assert response.status_code == 200
    assert response.json()["warehouse_code"] == "NEW-WH-CODE"


def test_update_warehouse_code_change_duplicate_returns_409(test_db: Session):
    """Test updating warehouse code to existing code returns 409."""
    client = TestClient(app)

    w1 = Warehouse(warehouse_code="EXISTING-WH", warehouse_name="Warehouse 1", warehouse_type="internal")
    w2 = Warehouse(warehouse_code="TO-CHANGE-WH", warehouse_name="Warehouse 2", warehouse_type="internal")
    test_db.add_all([w1, w2])
    test_db.commit()

    update_data = {
        "warehouse_code": "EXISTING-WH",  # Duplicate
    }

    response = client.put("/api/masters/warehouses/TO-CHANGE-WH", json=update_data)
    assert response.status_code == 409


# ===== DELETE /api/masters/warehouses/{code} Tests =====


def test_delete_warehouse_success(test_db: Session):
    """Test soft deleting a warehouse.

    Soft delete sets valid_to to today. The warehouse still exists in DB
    but is excluded from list by default.
    """
    client = TestClient(app)

    w = Warehouse(warehouse_code="DEL-001", warehouse_name="Delete Me", warehouse_type="internal")
    test_db.add(w)
    test_db.commit()

    response = client.delete("/api/masters/warehouses/DEL-001")
    assert response.status_code == 204

    # Verify soft deletion: record still exists in DB
    test_db.expire_all()
    deleted = test_db.query(Warehouse).filter(Warehouse.warehouse_code == "DEL-001").first()
    assert deleted is not None  # Soft delete doesn't remove from DB
    # valid_to should be set (not 9999-12-31)
    from datetime import date

    assert deleted.valid_to <= date.today()

    # But warehouse is excluded from list API by default
    response = client.get("/api/masters/warehouses")
    warehouse_codes = [w["warehouse_code"] for w in response.json()]
    assert "DEL-001" not in warehouse_codes


def test_delete_warehouse_not_found(test_db: Session):
    """Test deleting non-existent warehouse returns 404."""
    client = TestClient(app)
    response = client.delete("/api/masters/warehouses/NONEXISTENT-DEL")
    assert response.status_code == 404


# ===== Bulk Upsert Tests =====


def test_bulk_upsert_warehouses(test_db: Session):
    """Test bulk upserting warehouses."""
    client = TestClient(app)

    # Create one existing warehouse
    w = Warehouse(
        warehouse_code="BULK-001", warehouse_name="Original Name", warehouse_type="internal"
    )
    test_db.add(w)
    test_db.commit()

    upsert_data = {
        "rows": [
            {
                "warehouse_code": "BULK-001",  # Update
                "warehouse_name": "Updated Bulk Name",
                "warehouse_type": "external",
            },
            {
                "warehouse_code": "BULK-002",  # Create
                "warehouse_name": "New Bulk Warehouse",
                "warehouse_type": "supplier",
            },
        ]
    }

    response = client.post("/api/masters/warehouses/bulk-upsert", json=upsert_data)
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["created"] == 1
    assert data["summary"]["updated"] == 1
    assert data["summary"]["failed"] == 0

    # Verify updates
    test_db.expire_all()
    w1 = test_db.query(Warehouse).filter(Warehouse.warehouse_code == "BULK-001").first()
    assert w1.warehouse_name == "Updated Bulk Name"
    assert w1.warehouse_type == "external"

    w2 = test_db.query(Warehouse).filter(Warehouse.warehouse_code == "BULK-002").first()
    assert w2 is not None
    assert w2.warehouse_name == "New Bulk Warehouse"
