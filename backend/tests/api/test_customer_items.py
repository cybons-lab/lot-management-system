# backend/tests/api/test_customer_items.py
"""Comprehensive tests for customer items API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import CustomerItem, Customer, Product


def _truncate_all(db: Session):
    for table in [CustomerItem, Customer, Product]:
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
def master_data(test_db: Session):
    """Create master data for customer items testing."""
    customer = Customer(
        customer_code="CUST-001",
        customer_name="Test Customer",
    )
    test_db.add(customer)
    test_db.commit()
    test_db.refresh(customer)

    product = Product(
        maker_part_code="PROD-001",
        product_name="Test Product",
        base_unit="EA",
    )
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)

    return {
        "customer": customer,
        "product": product,
    }


def test_list_customer_items_empty(test_db: Session):
    """Test listing customer items when none exist."""
    client = TestClient(app)
    response = client.get("/api/customer-items")
    assert response.status_code == 200
    assert response.json() == []


def test_list_customer_items_with_filters(test_db: Session, master_data):
    """Test listing customer items with filters."""
    client = TestClient(app)

    item = CustomerItem(
        customer_id=master_data["customer"].id,
        product_id=master_data["product"].id,
        external_product_code="CUST-PROD-001",
        external_product_name="Customer Product Name",
    )
    test_db.add(item)
    test_db.commit()

    # Filter by customer_id
    response = client.get(
        "/api/customer-items",
        params={"customer_id": master_data["customer"].id}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

    # Filter by product_id
    response = client.get(
        "/api/customer-items",
        params={"product_id": master_data["product"].id}
    )
    assert response.status_code == 200


def test_list_customer_items_by_customer(test_db: Session, master_data):
    """Test listing customer items by customer ID."""
    client = TestClient(app)

    item = CustomerItem(
        customer_id=master_data["customer"].id,
        product_id=master_data["product"].id,
        external_product_code="CUST-PROD-001",
    )
    test_db.add(item)
    test_db.commit()

    response = client.get(f"/api/customer-items/{master_data['customer'].id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_customer_item_success(test_db: Session, master_data):
    """Test creating customer item."""
    client = TestClient(app)

    item_data = {
        "customer_id": master_data["customer"].id,
        "product_id": master_data["product"].id,
        "external_product_code": "CUST-NEW-001",
        "external_product_name": "New Customer Product",
    }

    response = client.post("/api/customer-items", json=item_data)
    assert response.status_code == 201
    data = response.json()
    assert data["external_product_code"] == "CUST-NEW-001"


def test_create_customer_item_duplicate_returns_409(test_db: Session, master_data):
    """Test creating duplicate customer item returns 409."""
    client = TestClient(app)

    existing = CustomerItem(
        customer_id=master_data["customer"].id,
        product_id=master_data["product"].id,
        external_product_code="CUST-DUP-001",
    )
    test_db.add(existing)
    test_db.commit()

    item_data = {
        "customer_id": master_data["customer"].id,
        "product_id": master_data["product"].id,
        "external_product_code": "CUST-DUP-001",  # Duplicate
    }

    response = client.post("/api/customer-items", json=item_data)
    assert response.status_code == 409


def test_update_customer_item_success(test_db: Session, master_data):
    """Test updating customer item."""
    client = TestClient(app)

    item = CustomerItem(
        customer_id=master_data["customer"].id,
        product_id=master_data["product"].id,
        external_product_code="CUST-UPD-001",
        external_product_name="Old Name",
    )
    test_db.add(item)
    test_db.commit()

    update_data = {
        "external_product_name": "Updated Name",
    }

    response = client.put(
        f"/api/customer-items/{master_data['customer'].id}/CUST-UPD-001",
        json=update_data
    )
    assert response.status_code == 200
    data = response.json()
    assert data["external_product_name"] == "Updated Name"


def test_update_customer_item_not_found(test_db: Session, master_data):
    """Test updating non-existent customer item returns 404."""
    client = TestClient(app)

    update_data = {
        "external_product_name": "New Name",
    }

    response = client.put(
        f"/api/customer-items/{master_data['customer'].id}/NONEXISTENT",
        json=update_data
    )
    assert response.status_code == 404


def test_delete_customer_item_success(test_db: Session, master_data):
    """Test deleting customer item."""
    client = TestClient(app)

    item = CustomerItem(
        customer_id=master_data["customer"].id,
        product_id=master_data["product"].id,
        external_product_code="CUST-DEL-001",
    )
    test_db.add(item)
    test_db.commit()

    response = client.delete(
        f"/api/customer-items/{master_data['customer'].id}/CUST-DEL-001"
    )
    assert response.status_code == 204


def test_delete_customer_item_not_found(test_db: Session, master_data):
    """Test deleting non-existent customer item returns 404."""
    client = TestClient(app)

    response = client.delete(
        f"/api/customer-items/{master_data['customer'].id}/NONEXISTENT"
    )
    assert response.status_code == 404


def test_bulk_upsert_customer_items(test_db: Session, master_data):
    """Test bulk upserting customer items."""
    client = TestClient(app)

    # Create existing item
    existing = CustomerItem(
        customer_id=master_data["customer"].id,
        product_id=master_data["product"].id,
        external_product_code="CUST-EXIST-001",
        external_product_name="Old Name",
    )
    test_db.add(existing)
    test_db.commit()

    bulk_data = {
        "rows": [
            {
                "customer_id": master_data["customer"].id,
                "product_id": master_data["product"].id,
                "external_product_code": "CUST-EXIST-001",  # Update
                "external_product_name": "Updated Name",
            },
            {
                "customer_id": master_data["customer"].id,
                "product_id": master_data["product"].id,
                "external_product_code": "CUST-NEW-002",  # Create
                "external_product_name": "New Item",
            },
        ]
    }

    response = client.post("/api/customer-items/bulk-upsert", json=bulk_data)
    assert response.status_code == 200
    data = response.json()
    assert data["created"] >= 1
    assert data["updated"] >= 1
