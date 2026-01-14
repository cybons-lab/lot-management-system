# backend/tests/api/test_suppliers.py
"""Comprehensive tests for suppliers API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models import Supplier
from app.main import app


def _truncate_all(db: Session):
    """Clean up test data."""
    try:
        # Use DELETE instead of TRUNCATE to avoid transaction issues
        # Order matters due to foreign keys
        db.execute(text("DELETE FROM lots"))
        db.execute(text("DELETE FROM customer_items"))
        db.execute(text("DELETE FROM suppliers"))
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


# ===== GET /api/masters/suppliers Tests =====


def test_list_suppliers_success(test_db: Session):
    """Test listing suppliers."""
    client = TestClient(app)

    s1 = Supplier(supplier_code="SUP-001", supplier_name="Supplier 1")
    s2 = Supplier(supplier_code="SUP-002", supplier_name="Supplier 2")
    test_db.add_all([s1, s2])
    test_db.commit()

    response = client.get("/api/masters/suppliers")
    assert response.status_code == 200
    data = response.json()
    codes = [s["supplier_code"] for s in data]
    assert "SUP-001" in codes
    assert "SUP-002" in codes


def test_list_suppliers_with_pagination(test_db: Session):
    """Test listing suppliers with pagination."""
    client = TestClient(app)

    # Create 5 suppliers
    for i in range(1, 6):
        s = Supplier(
            supplier_code=f"PAGE-{i:03d}",
            supplier_name=f"Supplier {i}",
        )
        test_db.add(s)
    test_db.commit()

    # Test pagination
    response = client.get("/api/masters/suppliers", params={"skip": 0, "limit": 3})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3


# ===== GET /api/masters/suppliers/{code} Tests =====


def test_get_supplier_success(test_db: Session):
    """Test getting supplier by code."""
    client = TestClient(app)

    s = Supplier(supplier_code="GET-TEST", supplier_name="Test Supplier")
    test_db.add(s)
    test_db.commit()

    response = client.get("/api/masters/suppliers/GET-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_code"] == "GET-TEST"
    assert data["supplier_name"] == "Test Supplier"


def test_get_supplier_not_found(test_db: Session):
    """Test getting non-existent supplier returns 404."""
    client = TestClient(app)
    response = client.get("/api/masters/suppliers/NONEXISTENT-SUP")
    assert response.status_code == 404


# ===== POST /api/masters/suppliers Tests =====


def test_create_supplier_success(test_db: Session):
    """Test creating a supplier."""
    client = TestClient(app)

    supplier_data = {
        "supplier_code": "CREATE-001",
        "supplier_name": "New Supplier",
    }

    response = client.post("/api/masters/suppliers", json=supplier_data)
    assert response.status_code == 201
    data = response.json()
    assert data["supplier_code"] == "CREATE-001"
    assert data["supplier_name"] == "New Supplier"

    # Verify in DB
    db_supplier = test_db.query(Supplier).filter(Supplier.supplier_code == "CREATE-001").first()
    assert db_supplier is not None
    assert db_supplier.supplier_name == "New Supplier"


def test_create_supplier_duplicate_returns_409(test_db: Session):
    """Test creating duplicate supplier returns 409."""
    client = TestClient(app)

    existing = Supplier(supplier_code="DUP-001", supplier_name="Existing")
    test_db.add(existing)
    test_db.commit()

    supplier_data = {
        "supplier_code": "DUP-001",
        "supplier_name": "Duplicate",
    }

    response = client.post("/api/masters/suppliers", json=supplier_data)
    assert response.status_code == 409


# ===== PUT /api/masters/suppliers/{code} Tests =====


def test_update_supplier_success(test_db: Session):
    """Test updating a supplier."""
    client = TestClient(app)

    s = Supplier(supplier_code="UPD-001", supplier_name="Old Name")
    test_db.add(s)
    test_db.commit()

    update_data = {"supplier_name": "Updated Name"}
    response = client.put("/api/masters/suppliers/UPD-001", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_name"] == "Updated Name"


def test_update_supplier_not_found(test_db: Session):
    """Test updating non-existent supplier returns 404."""
    client = TestClient(app)
    response = client.put("/api/masters/suppliers/NONEXISTENT-UPD", json={"supplier_name": "New"})
    assert response.status_code == 404


def test_update_supplier_code_change_success(test_db: Session):
    """Test updating supplier code succeeds."""
    client = TestClient(app)

    s = Supplier(supplier_code="OLD-SUP-CODE", supplier_name="Test Supplier")
    test_db.add(s)
    test_db.commit()

    update_data = {
        "supplier_code": "NEW-SUP-CODE",
        "supplier_name": "Updated Supplier",
    }

    response = client.put("/api/masters/suppliers/OLD-SUP-CODE", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_code"] == "NEW-SUP-CODE"
    assert data["supplier_name"] == "Updated Supplier"

    # Verify old code no longer exists
    response = client.get("/api/masters/suppliers/OLD-SUP-CODE")
    assert response.status_code == 404

    # Verify new code exists
    response = client.get("/api/masters/suppliers/NEW-SUP-CODE")
    assert response.status_code == 200
    assert response.json()["supplier_code"] == "NEW-SUP-CODE"


def test_update_supplier_code_change_duplicate_returns_409(test_db: Session):
    """Test updating supplier code to existing code returns 409."""
    client = TestClient(app)

    s1 = Supplier(supplier_code="EXISTING-SUP", supplier_name="Supplier 1")
    s2 = Supplier(supplier_code="TO-CHANGE-SUP", supplier_name="Supplier 2")
    test_db.add_all([s1, s2])
    test_db.commit()

    update_data = {
        "supplier_code": "EXISTING-SUP",  # Duplicate
    }

    response = client.put("/api/masters/suppliers/TO-CHANGE-SUP", json=update_data)
    assert response.status_code == 409


# ===== DELETE /api/masters/suppliers/{code} Tests =====


def test_delete_supplier_success(test_db: Session):
    """Test soft deleting a supplier.

    Soft delete sets valid_to to today. The supplier still exists in DB
    but is excluded from list by default.
    """
    client = TestClient(app)

    s = Supplier(supplier_code="DEL-001", supplier_name="Delete Me")
    test_db.add(s)
    test_db.commit()

    response = client.delete("/api/masters/suppliers/DEL-001")
    assert response.status_code == 204

    # Verify soft deletion: record still exists in DB
    test_db.expire_all()
    deleted = test_db.query(Supplier).filter(Supplier.supplier_code == "DEL-001").first()
    assert deleted is not None  # Soft delete doesn't remove from DB
    # valid_to should be set (not 9999-12-31)
    from datetime import date

    assert deleted.valid_to <= date.today()

    # But supplier is excluded from list API by default
    response = client.get("/api/masters/suppliers")
    supplier_codes = [s["supplier_code"] for s in response.json()]
    assert "DEL-001" not in supplier_codes


def test_delete_supplier_not_found(test_db: Session):
    """Test deleting non-existent supplier returns 404."""
    client = TestClient(app)
    response = client.delete("/api/masters/suppliers/NONEXISTENT-DEL")
    assert response.status_code == 404


# ===== Bulk Upsert Tests =====


def test_bulk_upsert_suppliers(test_db: Session):
    """Test bulk upserting suppliers."""
    client = TestClient(app)

    # Create one existing supplier
    s = Supplier(supplier_code="BULK-001", supplier_name="Original Name")
    test_db.add(s)
    test_db.commit()

    upsert_data = {
        "rows": [
            {
                "supplier_code": "BULK-001",  # Update
                "supplier_name": "Updated Bulk Name",
            },
            {
                "supplier_code": "BULK-002",  # Create
                "supplier_name": "New Bulk Supplier",
            },
        ]
    }

    response = client.post("/api/masters/suppliers/bulk-upsert", json=upsert_data)
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["created"] == 1
    assert data["summary"]["updated"] == 1
    assert data["summary"]["failed"] == 0

    # Verify updates
    test_db.expire_all()
    s1 = test_db.query(Supplier).filter(Supplier.supplier_code == "BULK-001").first()
    assert s1.supplier_name == "Updated Bulk Name"

    s2 = test_db.query(Supplier).filter(Supplier.supplier_code == "BULK-002").first()
    assert s2 is not None
    assert s2.supplier_name == "New Bulk Supplier"
