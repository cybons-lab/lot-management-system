# backend/tests/api/test_supplier_items.py
"""Comprehensive tests for supplier items API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Supplier, SupplierItem


@pytest.fixture
def test_supplier(db: Session, client: TestClient):
    """Create a default supplier for products."""
    supplier = Supplier(supplier_code="TEST-SUPP", supplier_name="Test Supplier")
    db.add(supplier)
    db.flush()  # Use flush so ID is available but transaction is not committed
    return supplier


# ===== GET /api/masters/supplier-items Tests =====


def test_list_supplier_items_success(db: Session, client: TestClient, test_supplier: Supplier):
    """Test listing supplier items."""

    p1 = SupplierItem(
        supplier_id=test_supplier.id,
        maker_part_no="LIST-001",
        display_name="Product 1",
        base_unit="EA",
    )
    p2 = SupplierItem(
        supplier_id=test_supplier.id,
        maker_part_no="LIST-002",
        display_name="Product 2",
        base_unit="KG",
    )
    db.add_all([p1, p2])
    db.flush()

    response = client.get("/api/masters/supplier-items")
    assert response.status_code == 200
    data = response.json()
    product_codes = [p["maker_part_no"] for p in data]
    assert "LIST-001" in product_codes
    assert "LIST-002" in product_codes


def test_list_supplier_items_with_pagination(
    db: Session, client: TestClient, test_supplier: Supplier
):
    """Test listing supplier items with pagination."""

    # Create 5 products
    for i in range(1, 6):
        p = SupplierItem(
            supplier_id=test_supplier.id,
            maker_part_no=f"PAGE-{i:03d}",
            display_name=f"Product {i}",
            base_unit="EA",
        )
        db.add(p)
    db.flush()

    # Test pagination
    response = client.get("/api/masters/supplier-items", params={"skip": 0, "limit": 3})
    assert response.status_code == 200
    data = response.json()
    # At least 3 items should be returned
    assert len(data) == 3


# ===== GET /api/masters/supplier-items/{id} Tests =====


def test_get_supplier_item_success(db: Session, client: TestClient, test_supplier: Supplier):
    """Test getting supplier item by ID."""

    p = SupplierItem(
        supplier_id=test_supplier.id,
        maker_part_no="GET-TEST",
        display_name="Test Product",
        base_unit="EA",
    )
    db.add(p)
    db.flush()

    response = client.get(f"/api/masters/supplier-items/{p.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["maker_part_no"] == "GET-TEST"
    assert data["display_name"] == "Test Product"


# ===== POST /api/masters/supplier-items Tests =====


def test_create_supplier_item_success(db: Session, client: TestClient, test_supplier: Supplier):
    """Test creating a supplier item."""

    item_data = {
        "supplier_id": test_supplier.id,
        "maker_part_no": "CREATE-001",
        "display_name": "New Product",
        "base_unit": "EA",
        "internal_unit": "CAN",
        "external_unit": "KG",
        "qty_per_internal_unit": 20.0,
    }

    response = client.post("/api/masters/supplier-items", json=item_data)
    assert response.status_code == 201
    data = response.json()
    assert data["maker_part_no"] == "CREATE-001"
    assert data["display_name"] == "New Product"

    # Verify in DB
    db_product = db.query(SupplierItem).filter(SupplierItem.maker_part_no == "CREATE-001").first()
    assert db_product is not None
    assert db_product.display_name == "New Product"


# ===== PUT /api/masters/supplier-items/{id} Tests =====


def test_update_supplier_item_success(db: Session, client: TestClient, test_supplier: Supplier):
    """Test updating a supplier item."""

    p = SupplierItem(
        supplier_id=test_supplier.id,
        maker_part_no="UPD-001",
        display_name="Old Name",
        base_unit="EA",
    )
    db.add(p)
    db.flush()

    update_data = {"display_name": "Updated Name"}
    # Get current version
    get_response = client.get(f"/api/masters/supplier-items/{p.id}")
    current = get_response.json()
    update_data["version"] = current["version"]
    
    response = client.put(f"/api/masters/supplier-items/{p.id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Updated Name"


# ===== DELETE /api/masters/supplier-items/{id} Tests =====


def test_delete_supplier_item_success(db: Session, client: TestClient, test_supplier: Supplier):
    """Test soft deleting a supplier item."""

    p = SupplierItem(
        supplier_id=test_supplier.id,
        maker_part_no="DEL-001",
        display_name="Delete Me",
        base_unit="EA",
    )
    db.add(p)
    db.flush()

    # Get current version
    get_response = client.get(f"/api/masters/supplier-items/{p.id}")
    current = get_response.json()
    
    response = client.delete(f"/api/masters/supplier-items/{p.id}?version={current['version']}")
    assert response.status_code == 204

    # Verify soft deletion
    db.expire_all()
    deleted = db.query(SupplierItem).filter(SupplierItem.id == p.id).first()
    assert deleted is not None
    from datetime import date

    assert deleted.valid_to <= date.today()
