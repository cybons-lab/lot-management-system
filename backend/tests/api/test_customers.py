# backend/tests/api/test_customers.py
"""Comprehensive tests for customers API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models import Customer
from app.main import app


def _truncate_all(db: Session):
    """Clean up test data."""
    try:
        # Use TRUNCATE CASCADE to ensure cleanup
        db.execute(text("TRUNCATE TABLE customers RESTART IDENTITY CASCADE"))
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


# ===== GET /api/masters/customers Tests =====


def test_list_customers_success(test_db: Session):
    """Test listing customers."""
    client = TestClient(app)

    c1 = Customer(
        customer_code="LIST-001",
        customer_name="Customer 1",
    )
    c2 = Customer(
        customer_code="LIST-002",
        customer_name="Customer 2",
    )
    test_db.add_all([c1, c2])
    test_db.commit()

    response = client.get("/api/masters/customers")
    assert response.status_code == 200
    data = response.json()
    customer_codes = [c["customer_code"] for c in data]
    assert "LIST-001" in customer_codes
    assert "LIST-002" in customer_codes


def test_list_customers_with_pagination(test_db: Session):
    """Test listing customers with pagination."""
    client = TestClient(app)

    # Create 15 customers
    customers = [
        Customer(
            customer_code=f"PAGE-{i:03d}",
            customer_name=f"Customer {i}",
        )
        for i in range(1, 16)
    ]
    test_db.add_all(customers)
    test_db.commit()

    # Get first page (10 items)
    response = client.get("/api/masters/customers?skip=0&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10
    assert data[0]["customer_code"] == "PAGE-001"

    # Get second page (5 items)
    response = client.get("/api/masters/customers?skip=10&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    assert data[0]["customer_code"] == "PAGE-011"


# ===== GET /api/masters/customers/{code} Tests =====


def test_get_customer_success(test_db: Session):
    """Test getting a single customer."""
    client = TestClient(app)

    c = Customer(
        customer_code="GET-TEST",
        customer_name="Test Customer",
    )
    test_db.add(c)
    test_db.commit()

    response = client.get("/api/masters/customers/GET-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["customer_code"] == "GET-TEST"
    assert data["customer_name"] == "Test Customer"


def test_get_customer_not_found(test_db: Session):
    """Test getting a non-existent customer."""
    client = TestClient(app)
    response = client.get("/api/masters/customers/NON-EXISTENT")
    assert response.status_code == 404


# ===== POST /api/masters/customers Tests =====


def test_create_customer_success(test_db: Session, superuser_token_headers):
    """Test creating a new customer."""
    client = TestClient(app)

    customer_data = {
        "customer_code": "CREATE-001",
        "customer_name": "New Customer",
    }

    response = client.post(
        "/api/masters/customers", json=customer_data, headers=superuser_token_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["customer_code"] == "CREATE-001"
    assert data["customer_name"] == "New Customer"
    assert "id" in data


def test_create_customer_duplicate_returns_409(test_db: Session, superuser_token_headers):
    """Test creating duplicate customer returns 409."""
    client = TestClient(app)

    existing = Customer(
        customer_code="DUP-001",
        customer_name="Existing",
    )
    test_db.add(existing)
    test_db.commit()

    customer_data = {
        "customer_code": "DUP-001",
        "customer_name": "Duplicate",
    }

    response = client.post(
        "/api/masters/customers", json=customer_data, headers=superuser_token_headers
    )
    assert response.status_code == 409


# ===== PUT /api/masters/customers/{code} Tests =====


def test_update_customer_success(test_db: Session, superuser_token_headers):
    """Test updating a customer."""
    client = TestClient(app)

    c = Customer(
        customer_code="UPDATE-001",
        customer_name="Old Name",
    )
    test_db.add(c)
    test_db.commit()

    update_data = {
        "customer_name": "New Name",
    }

    response = client.put(
        "/api/masters/customers/UPDATE-001", json=update_data, headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["customer_code"] == "UPDATE-001"
    assert data["customer_name"] == "New Name"


def test_update_customer_not_found(test_db: Session, superuser_token_headers):
    """Test updating a non-existent customer."""
    client = TestClient(app)

    update_data = {"customer_name": "New Name"}
    response = client.put(
        "/api/masters/customers/NON-EXISTENT", json=update_data, headers=superuser_token_headers
    )
    assert response.status_code == 404


# ===== DELETE /api/masters/customers/{code} Tests =====


def test_delete_customer_success(test_db: Session, superuser_token_headers):
    """Test soft deleting a customer.

    Soft delete sets valid_to to today. The customer can still be retrieved
    by code but is excluded from list by default.
    """
    client = TestClient(app)

    c = Customer(
        customer_code="DELETE-001",
        customer_name="To Delete",
    )
    test_db.add(c)
    test_db.commit()

    response = client.delete(
        "/api/masters/customers/DELETE-001", headers=superuser_token_headers
    )
    assert response.status_code == 204

    # Verify soft deletion: customer still exists when fetched by code
    response = client.get("/api/masters/customers/DELETE-001")
    assert response.status_code == 200
    data = response.json()
    assert data["customer_code"] == "DELETE-001"

    # But customer is excluded from list by default
    response = client.get("/api/masters/customers")
    assert response.status_code == 200
    customer_codes = [c["customer_code"] for c in response.json()]
    assert "DELETE-001" not in customer_codes

    # Customer is included if we set include_inactive=true
    response = client.get("/api/masters/customers?include_inactive=true")
    assert response.status_code == 200
    customer_codes = [c["customer_code"] for c in response.json()]
    assert "DELETE-001" in customer_codes


def test_delete_customer_not_found(test_db: Session, superuser_token_headers):
    """Test deleting a non-existent customer."""
    client = TestClient(app)
    response = client.delete(
        "/api/masters/customers/NON-EXISTENT", headers=superuser_token_headers
    )
    assert response.status_code == 404
