# backend/tests/api/test_customers.py
"""Comprehensive tests for customers API endpoints."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Customer


def test_list_customers_success(db: Session, client: TestClient):
    """Test listing customers."""

    c1 = Customer(
        customer_code="LIST-001",
        customer_name="Customer 1",
    )
    c2 = Customer(
        customer_code="LIST-002",
        customer_name="Customer 2",
    )
    db.add_all([c1, c2])
    db.commit()

    response = client.get("/api/masters/customers")
    assert response.status_code == 200
    data = response.json()
    customer_codes = [c["customer_code"] for c in data]
    assert "LIST-001" in customer_codes
    assert "LIST-002" in customer_codes


def test_list_customers_with_pagination(db: Session, client: TestClient):
    """Test listing customers with pagination."""

    # Create 15 customers
    customers = [
        Customer(
            customer_code=f"PAGE-{i:03d}",
            customer_name=f"Customer {i}",
        )
        for i in range(1, 16)
    ]
    db.add_all(customers)
    db.commit()

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


def test_get_customer_success(db: Session, client: TestClient):
    """Test getting a single customer."""

    c = Customer(
        customer_code="GET-TEST",
        customer_name="Test Customer",
    )
    db.add(c)
    db.commit()

    response = client.get("/api/masters/customers/GET-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["customer_code"] == "GET-TEST"
    assert data["customer_name"] == "Test Customer"


def test_get_customer_not_found(db: Session, client: TestClient):
    """Test getting a non-existent customer."""
    response = client.get("/api/masters/customers/NON-EXISTENT")
    assert response.status_code == 404


# ===== POST /api/masters/customers Tests =====


def test_create_customer_success(db: Session, client: TestClient, superuser_token_headers):
    """Test creating a new customer."""

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


def test_create_customer_duplicate_returns_409(
    db: Session, client: TestClient, superuser_token_headers
):
    """Test creating duplicate customer returns 409."""

    existing = Customer(
        customer_code="DUP-001",
        customer_name="Existing",
    )
    db.add(existing)
    db.commit()

    customer_data = {
        "customer_code": "DUP-001",
        "customer_name": "Duplicate",
    }

    response = client.post(
        "/api/masters/customers", json=customer_data, headers=superuser_token_headers
    )
    assert response.status_code == 409


# ===== PUT /api/masters/customers/{code} Tests =====


def test_update_customer_success(db: Session, client: TestClient, superuser_token_headers):
    """Test updating a customer."""

    c = Customer(
        customer_code="UPDATE-001",
        customer_name="Old Name",
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    update_data = {
        "customer_name": "New Name",
        "version": c.version,
    }

    response = client.put(
        "/api/masters/customers/UPDATE-001", json=update_data, headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["customer_code"] == "UPDATE-001"
    assert data["customer_name"] == "New Name"


def test_update_customer_not_found(db: Session, client: TestClient, superuser_token_headers):
    """Test updating a non-existent customer."""

    update_data = {"customer_name": "New Name", "version": 1}
    response = client.put(
        "/api/masters/customers/NON-EXISTENT", json=update_data, headers=superuser_token_headers
    )
    assert response.status_code == 404


def test_update_customer_code_change_success(
    db: Session, client: TestClient, superuser_token_headers
):
    """Test updating customer code (admin only, no related data)."""

    c = Customer(
        customer_code="OLD-CODE-001",
        customer_name="Test Customer",
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    update_data = {
        "customer_code": "NEW-CODE-001",
        "customer_name": "Updated Name",
        "version": c.version,
    }

    response = client.put(
        "/api/masters/customers/OLD-CODE-001", json=update_data, headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["customer_code"] == "NEW-CODE-001"
    assert data["customer_name"] == "Updated Name"

    # Verify old code no longer exists
    response = client.get("/api/masters/customers/OLD-CODE-001")
    assert response.status_code == 404

    # Verify new code exists
    response = client.get("/api/masters/customers/NEW-CODE-001")
    assert response.status_code == 200
    assert response.json()["customer_code"] == "NEW-CODE-001"


def test_update_customer_code_change_duplicate_returns_409(
    db: Session, client: TestClient, superuser_token_headers
):
    """Test updating customer code to existing code returns 409."""

    c1 = Customer(customer_code="EXISTING-CODE", customer_name="Customer 1")
    c2 = Customer(customer_code="TO-CHANGE", customer_name="Customer 2")
    db.add_all([c1, c2])
    db.commit()
    db.refresh(c2)

    update_data = {
        "customer_code": "EXISTING-CODE",  # Duplicate
        "version": c2.version,
    }

    response = client.put(
        "/api/masters/customers/TO-CHANGE", json=update_data, headers=superuser_token_headers
    )
    assert response.status_code == 409


def test_update_customer_code_change_non_admin_forbidden(
    db: Session, client: TestClient, normal_user_token_headers
):
    """Test non-admin user cannot change customer code."""

    c = Customer(customer_code="ADMIN-ONLY", customer_name="Test Customer")
    db.add(c)
    db.commit()
    db.refresh(c)

    update_data = {"customer_code": "NEW-CODE", "version": c.version}

    response = client.put(
        "/api/masters/customers/ADMIN-ONLY", json=update_data, headers=normal_user_token_headers
    )
    assert response.status_code == 403


# ===== DELETE /api/masters/customers/{code} Tests =====


def test_delete_customer_success(db: Session, client: TestClient, superuser_token_headers):
    """Test soft deleting a customer.

    Soft delete sets valid_to to today. The customer can still be retrieved
    by code but is excluded from list by default.
    """

    c = Customer(
        customer_code="DELETE-001",
        customer_name="To Delete",
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    response = client.delete(
        f"/api/masters/customers/DELETE-001?version={c.version}", headers=superuser_token_headers
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


def test_delete_customer_not_found(db: Session, client: TestClient, superuser_token_headers):
    """Test deleting a non-existent customer."""
    response = client.delete(
        "/api/masters/customers/NON-EXISTENT?version=1", headers=superuser_token_headers
    )
    assert response.status_code == 404
