# backend/tests/api/test_suppliers.py
"""Comprehensive tests for suppliers API endpoints."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Supplier


def test_list_suppliers_success(db: Session, client: TestClient):
    """Test listing suppliers."""

    s1 = Supplier(supplier_code="SUP-001", supplier_name="Supplier 1")
    s2 = Supplier(supplier_code="SUP-002", supplier_name="Supplier 2")
    db.add_all([s1, s2])
    db.commit()

    response = client.get("/api/masters/suppliers")
    assert response.status_code == 200
    data = response.json()
    codes = [s["supplier_code"] for s in data]
    assert "SUP-001" in codes
    assert "SUP-002" in codes


def test_list_suppliers_with_pagination(db: Session, client: TestClient):
    """Test listing suppliers with pagination."""

    # Create 5 suppliers
    for i in range(1, 6):
        s = Supplier(
            supplier_code=f"PAGE-{i:03d}",
            supplier_name=f"Supplier {i}",
        )
        db.add(s)
    db.commit()

    # Test pagination
    response = client.get("/api/masters/suppliers", params={"skip": 0, "limit": 3})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3


# ===== GET /api/masters/suppliers/{code} Tests =====


def test_get_supplier_success(db: Session, client: TestClient):
    """Test getting supplier by code."""

    s = Supplier(supplier_code="GET-TEST", supplier_name="Test Supplier")
    db.add(s)
    db.commit()

    response = client.get("/api/masters/suppliers/GET-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_code"] == "GET-TEST"
    assert data["supplier_name"] == "Test Supplier"


def test_get_supplier_not_found(db: Session, client: TestClient):
    """Test getting non-existent supplier returns 404."""
    response = client.get("/api/masters/suppliers/NONEXISTENT-SUP")
    assert response.status_code == 404


# ===== POST /api/masters/suppliers Tests =====


def test_create_supplier_success(db: Session, client: TestClient):
    """Test creating a supplier."""

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
    db_supplier = db.query(Supplier).filter(Supplier.supplier_code == "CREATE-001").first()
    assert db_supplier is not None
    assert db_supplier.supplier_name == "New Supplier"


def test_create_supplier_duplicate_returns_409(db: Session, client: TestClient):
    """Test creating duplicate supplier returns 409."""

    existing = Supplier(supplier_code="DUP-001", supplier_name="Existing")
    db.add(existing)
    db.commit()

    supplier_data = {
        "supplier_code": "DUP-001",
        "supplier_name": "Duplicate",
    }

    response = client.post("/api/masters/suppliers", json=supplier_data)
    assert response.status_code == 409


# ===== PUT /api/masters/suppliers/{code} Tests =====


def test_update_supplier_success(db: Session, client: TestClient):
    """Test updating a supplier."""

    s = Supplier(supplier_code="UPD-001", supplier_name="Old Name")
    db.add(s)
    db.commit()

    # Get current version
    get_response = client.get("/api/masters/suppliers/UPD-001")
    current = get_response.json()

    update_data = {"supplier_name": "Updated Name", "version": current["version"]}
    response = client.put("/api/masters/suppliers/UPD-001", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_name"] == "Updated Name"


def test_update_supplier_not_found(db: Session, client: TestClient):
    """Test updating non-existent supplier returns 404."""
    response = client.put(
        "/api/masters/suppliers/NONEXISTENT-UPD", json={"supplier_name": "New", "version": 1}
    )
    assert response.status_code == 404


def test_update_supplier_code_change_success(db: Session, client: TestClient):
    """Test updating supplier code succeeds."""

    s = Supplier(supplier_code="OLD-SUP-CODE", supplier_name="Test Supplier")
    db.add(s)
    db.commit()

    # Get current version
    get_response = client.get("/api/masters/suppliers/OLD-SUP-CODE")
    current = get_response.json()

    update_data = {
        "supplier_code": "NEW-SUP-CODE",
        "supplier_name": "Updated Supplier",
        "version": current["version"],
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


def test_update_supplier_code_change_duplicate_returns_409(db: Session, client: TestClient):
    """Test updating supplier code to existing code returns 409."""

    s1 = Supplier(supplier_code="EXISTING-SUP", supplier_name="Supplier 1")
    s2 = Supplier(supplier_code="TO-CHANGE-SUP", supplier_name="Supplier 2")
    db.add_all([s1, s2])
    db.commit()

    # Get current version
    get_response = client.get("/api/masters/suppliers/EXISTING-SUP")
    current = get_response.json()

    update_data = {
        "supplier_code": "EXISTING-SUP",  # Duplicate,
        "version": current["version"],
    }

    response = client.put("/api/masters/suppliers/TO-CHANGE-SUP", json=update_data)
    assert response.status_code == 409


# ===== DELETE /api/masters/suppliers/{code} Tests =====


def test_delete_supplier_success(db: Session, client: TestClient):
    """Test soft deleting a supplier.

    Soft delete sets valid_to to today. The supplier still exists in DB
    but is excluded from list by default.
    """

    s = Supplier(supplier_code="DEL-001", supplier_name="Delete Me")
    db.add(s)
    db.commit()

    # Get current version
    get_response = client.get("/api/masters/suppliers/DEL-001")
    current = get_response.json()

    response = client.delete(f"/api/masters/suppliers/DEL-001?version={current['version']}")
    assert response.status_code == 204

    # Verify soft deletion: record still exists in DB
    db.expire_all()
    deleted = db.query(Supplier).filter(Supplier.supplier_code == "DEL-001").first()
    assert deleted is not None  # Soft delete doesn't remove from DB
    # valid_to should be set (not 9999-12-31)
    from datetime import date

    assert deleted.valid_to <= date.today()

    # But supplier is excluded from list API by default
    response = client.get("/api/masters/suppliers")
    supplier_codes = [s["supplier_code"] for s in response.json()]
    assert "DEL-001" not in supplier_codes


def test_delete_supplier_not_found(db: Session, client: TestClient):
    """Test deleting non-existent supplier returns 404."""
    response = client.delete("/api/masters/suppliers/NONEXISTENT-DEL?version=1")
    assert response.status_code == 404


# ===== Bulk Upsert Tests =====


def test_bulk_upsert_suppliers(db: Session, client: TestClient):
    """Test bulk upserting suppliers."""

    # Create one existing supplier
    s = Supplier(supplier_code="BULK-001", supplier_name="Original Name")
    db.add(s)
    db.commit()

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
    db.expire_all()
    s1 = db.query(Supplier).filter(Supplier.supplier_code == "BULK-001").first()
    assert s1.supplier_name == "Updated Bulk Name"

    s2 = db.query(Supplier).filter(Supplier.supplier_code == "BULK-002").first()
    assert s2 is not None
    assert s2.supplier_name == "New Bulk Supplier"
