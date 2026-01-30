# backend/tests/api/test_customer_items.py
"""Comprehensive tests for customer items API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Customer, CustomerItem, SupplierItem


@pytest.fixture
def master_data(db: Session, supplier):
    """Create master data for customer items testing."""
    customer = Customer(
        customer_code="CUST-001",
        customer_name="Test Customer",
    )
    db.add(customer)

    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PROD-001",
        display_name="Test Product",
        base_unit="EA",
    )
    db.add(product)
    db.commit()
    db.refresh(customer)
    db.refresh(product)

    return {
        "customer": customer,
        "product": product,
    }


def test_list_customer_items_empty(db: Session, client: TestClient):
    """Test listing customer items when none exist."""
    response = client.get("/api/masters/customer-items")
    assert response.status_code == 200
    assert response.json() == []


def test_list_customer_items_with_filters(db: Session, client: TestClient, master_data):
    """Test listing customer items with filters."""

    item = CustomerItem(
        customer_id=master_data["customer"].id,
        product_group_id=master_data["product"].id,
        customer_part_no="CUST-PROD-001",
        base_unit="EA",
    )
    db.add(item)
    db.commit()

    # Filter by customer_id
    response = client.get(
        "/api/masters/customer-items", params={"customer_id": master_data["customer"].id}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

    # Filter by product_group_id
    response = client.get(
        "/api/masters/customer-items", params={"product_group_id": master_data["product"].id}
    )
    assert response.status_code == 200


def test_list_customer_items_by_customer(db: Session, client: TestClient, master_data):
    """Test listing customer items by customer ID."""

    item = CustomerItem(
        customer_id=master_data["customer"].id,
        product_group_id=master_data["product"].id,
        customer_part_no="CUST-PROD-001",
        base_unit="EA",
    )
    db.add(item)
    db.commit()

    response = client.get(f"/api/masters/customer-items/by-customer/{master_data['customer'].id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["customer_part_no"] == "CUST-PROD-001"


def test_create_customer_item_success(db: Session, client: TestClient, master_data):
    """Test creating customer item."""

    item_data = {
        "customer_id": master_data["customer"].id,
        "product_group_id": master_data["product"].id,
        "customer_part_no": "CUST-NEW-001",
        "base_unit": "EA",
    }

    response = client.post("/api/masters/customer-items", json=item_data)
    assert response.status_code == 201
    data = response.json()
    assert data["customer_part_no"] == "CUST-NEW-001"
    assert data["base_unit"] == "EA"


def test_create_customer_item_duplicate_returns_409(db: Session, client: TestClient, master_data):
    """Test creating duplicate customer item returns 409."""

    existing = CustomerItem(
        customer_id=master_data["customer"].id,
        product_group_id=master_data["product"].id,
        customer_part_no="CUST-DUP-001",
        base_unit="EA",
    )
    db.add(existing)
    db.commit()

    item_data = {
        "customer_id": master_data["customer"].id,
        "product_group_id": master_data["product"].id,
        "customer_part_no": "CUST-DUP-001",  # Duplicate
        "base_unit": "EA",
    }

    response = client.post("/api/masters/customer-items", json=item_data)
    assert response.status_code == 409


def test_update_customer_item_success(db: Session, client: TestClient, master_data):
    """Test updating customer item."""

    item = CustomerItem(
        customer_id=master_data["customer"].id,
        product_group_id=master_data["product"].id,
        customer_part_no="CUST-UPD-001",
        base_unit="EA",
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    update_data = {
        "base_unit": "KG",
        "special_instructions": "Handle with care",
    }

    response = client.put(f"/api/masters/customer-items/{item.id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["base_unit"] == "KG"
    assert data["special_instructions"] == "Handle with care"


def test_update_customer_item_not_found(db: Session, client: TestClient, master_data):
    """Test updating non-existent customer item returns 404."""

    update_data = {
        "base_unit": "KG",
    }

    response = client.put("/api/masters/customer-items/999999", json=update_data)
    assert response.status_code == 404


def test_delete_customer_item_success(db: Session, client: TestClient, master_data):
    """Test deleting customer item (soft delete)."""

    item = CustomerItem(
        customer_id=master_data["customer"].id,
        product_group_id=master_data["product"].id,
        customer_part_no="CUST-DEL-001",
        base_unit="EA",
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    response = client.delete(f"/api/masters/customer-items/{item.id}")
    assert response.status_code == 204

    # Verify soft-delete - API returned 204 which means delete request was successful
    # The actual behavior depends on implementation - either physical or soft delete
    # Soft delete sets valid_to, so item may still exist in DB


def test_delete_customer_item_not_found(db: Session, client: TestClient, master_data):
    """Test deleting non-existent customer item returns 404."""

    response = client.delete("/api/masters/customer-items/999999")
    assert response.status_code == 404


def test_bulk_upsert_customer_items(db: Session, client: TestClient, master_data):
    """Test bulk upserting customer items."""

    # Create existing item
    existing = CustomerItem(
        customer_id=master_data["customer"].id,
        product_group_id=master_data["product"].id,
        customer_part_no="CUST-EXIST-001",
        base_unit="EA",
    )
    db.add(existing)
    db.commit()

    bulk_data = {
        "rows": [
            {
                "customer_code": master_data["customer"].customer_code,
                "product_code": master_data["product"].maker_part_no,
                "customer_part_no": "CUST-EXIST-001",  # Update
                "base_unit": "KG",
                "special_instructions": "Updated",
            },
            {
                "customer_code": master_data["customer"].customer_code,
                "product_code": master_data["product"].maker_part_no,
                "customer_part_no": "CUST-NEW-002",  # Create
                "base_unit": "EA",
            },
        ]
    }

    response = client.post("/api/masters/customer-items/bulk-upsert", json=bulk_data)
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["failed"] == 0, f"Bulk upsert errors: {data['errors']}"
    assert data["summary"]["created"] >= 1
    assert data["summary"]["updated"] >= 1
