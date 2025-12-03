# backend/tests/api/test_customers.py
"""Comprehensive tests for customers API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import Customer


def _truncate_all(db: Session):
    db.query(Customer).delete()
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


def test_list_customers(test_db: Session):
    client = TestClient(app)
    c1 = Customer(customer_code="CUST-001", customer_name="Customer 1")
    c2 = Customer(customer_code="CUST-002", customer_name="Customer 2")
    test_db.add_all([c1, c2])
    test_db.commit()

    response = client.get("/api/customers")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_customer_success(test_db: Session):
    client = TestClient(app)
    c = Customer(customer_code="CUST-TEST", customer_name="Test Customer")
    test_db.add(c)
    test_db.commit()

    response = client.get("/api/customers/CUST-TEST")
    assert response.status_code == 200
    assert response.json()["customer_code"] == "CUST-TEST"


def test_get_customer_not_found(test_db: Session):
    client = TestClient(app)
    response = client.get("/api/customers/NONEXISTENT")
    assert response.status_code == 404


def test_create_customer_success(test_db: Session):
    client = TestClient(app)
    data = {"customer_code": "CUST-NEW", "customer_name": "New Customer"}
    response = client.post("/api/customers", json=data)
    assert response.status_code == 201
    assert response.json()["customer_code"] == "CUST-NEW"


def test_create_customer_duplicate(test_db: Session):
    client = TestClient(app)
    existing = Customer(customer_code="CUST-DUP", customer_name="Existing")
    test_db.add(existing)
    test_db.commit()

    response = client.post("/api/customers", json={"customer_code": "CUST-DUP", "customer_name": "Dup"})
    assert response.status_code == 409


def test_update_customer_success(test_db: Session):
    client = TestClient(app)
    c = Customer(customer_code="CUST-UPD", customer_name="Old")
    test_db.add(c)
    test_db.commit()

    response = client.put("/api/customers/CUST-UPD", json={"customer_name": "Updated"})
    assert response.status_code == 200
    assert response.json()["customer_name"] == "Updated"


def test_update_customer_not_found(test_db: Session):
    client = TestClient(app)
    response = client.put("/api/customers/NONEXISTENT", json={"customer_name": "New"})
    assert response.status_code == 404


def test_delete_customer_success(test_db: Session):
    client = TestClient(app)
    c = Customer(customer_code="CUST-DEL", customer_name="Delete")
    test_db.add(c)
    test_db.commit()

    response = client.delete("/api/customers/CUST-DEL")
    assert response.status_code == 204


def test_delete_customer_not_found(test_db: Session):
    client = TestClient(app)
    response = client.delete("/api/customers/NONEXISTENT")
    assert response.status_code == 404


def test_bulk_upsert_customers(test_db: Session):
    client = TestClient(app)
    existing = Customer(customer_code="CUST-EXIST", customer_name="Old")
    test_db.add(existing)
    test_db.commit()

    bulk_data = {
        "customers": [
            {"customer_code": "CUST-EXIST", "customer_name": "Updated"},
            {"customer_code": "CUST-NEW", "customer_name": "New"},
        ]
    }

    response = client.post("/api/customers/bulk-upsert", json=bulk_data)
    assert response.status_code == 200
    assert response.json()["created"] >= 1
