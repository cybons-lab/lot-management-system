# backend/tests/api/test_suppliers.py
"""Comprehensive tests for suppliers API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import app
from app.models import Supplier


def _truncate_all(db: Session):
    """Clean up test data."""
    try:
        # Use TRUNCATE CASCADE to ensure cleanup
        db.execute(text("TRUNCATE TABLE suppliers RESTART IDENTITY CASCADE"))
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

    s1 = Supplier(
        supplier_code="LIST-001",
        supplier_name="Supplier 1",
    )
    s2 = Supplier(
        supplier_code="LIST-002",
        supplier_name="Supplier 2",
    )
    test_db.add_all([s1, s2])
    test_db.commit()

    response = client.get("/api/masters/suppliers")
    assert response.status_code == 200
    data = response.json()
    supplier_codes = [s["supplier_code"] for s in data]
    assert "LIST-001" in supplier_codes
    assert "LIST-002" in supplier_codes


def test_list_suppliers_with_pagination(test_db: Session):
    """Test listing suppliers with pagination."""
    client = TestClient(app)

    # Create 15 suppliers
    suppliers = [
        Supplier(
            supplier_code=f"PAGE-{i:03d}",
            supplier_name=f"Supplier {i}",
        )
        for i in range(1, 16)
    ]
    test_db.add_all(suppliers)
    test_db.commit()

    # Get first page (10 items)
    response = client.get("/api/masters/suppliers?skip=0&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10
    assert data[0]["supplier_code"] == "PAGE-001"

    # Get second page (5 items)
    response = client.get("/api/masters/suppliers?skip=10&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    assert data[0]["supplier_code"] == "PAGE-011"


# ===== GET /api/masters/suppliers/{code} Tests =====


def test_get_supplier_success(test_db: Session):
    """Test getting a single supplier."""
    client = TestClient(app)

    s = Supplier(
        supplier_code="GET-TEST",
        supplier_name="Test Supplier",
    )
    test_db.add(s)
    test_db.commit()

    response = client.get("/api/masters/suppliers/GET-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_code"] == "GET-TEST"
    assert data["supplier_name"] == "Test Supplier"


def test_get_supplier_not_found(test_db: Session):
    """Test getting a non-existent supplier."""
    client = TestClient(app)
    response = client.get("/api/masters/suppliers/NON-EXISTENT")
    assert response.status_code == 404


# ===== POST /api/masters/suppliers Tests =====


def test_create_supplier_success(test_db: Session):
    """Test creating a new supplier."""
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
    assert "id" in data


def test_create_supplier_duplicate_returns_409(test_db: Session):
    """Test creating duplicate supplier returns 409."""
    client = TestClient(app)

    existing = Supplier(
        supplier_code="DUP-001",
        supplier_name="Existing",
    )
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

    s = Supplier(
        supplier_code="UPDATE-001",
        supplier_name="Old Name",
    )
    test_db.add(s)
    test_db.commit()

    update_data = {
        "supplier_name": "New Name",
    }

    response = client.put("/api/masters/suppliers/UPDATE-001", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_code"] == "UPDATE-001"
    assert data["supplier_name"] == "New Name"


def test_update_supplier_not_found(test_db: Session):
    """Test updating a non-existent supplier."""
    client = TestClient(app)

    update_data = {"supplier_name": "New Name"}
    response = client.put("/api/masters/suppliers/NON-EXISTENT", json=update_data)
    assert response.status_code == 404


# ===== DELETE /api/masters/suppliers/{code} Tests =====


def test_delete_supplier_success(test_db: Session):
    """Test deleting a supplier."""
    client = TestClient(app)

    s = Supplier(
        supplier_code="DELETE-001",
        supplier_name="To Delete",
    )
    test_db.add(s)
    test_db.commit()

    response = client.delete("/api/masters/suppliers/DELETE-001")
    assert response.status_code == 204

    # Verify deletion
    response = client.get("/api/masters/suppliers/DELETE-001")
    assert response.status_code == 404


def test_delete_supplier_not_found(test_db: Session):
    """Test deleting a non-existent supplier."""
    client = TestClient(app)
    response = client.delete("/api/masters/suppliers/NON-EXISTENT")
    assert response.status_code == 404
