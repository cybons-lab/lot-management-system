# backend/tests/api/test_suppliers.py
"""Comprehensive tests for suppliers API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import Supplier


def _truncate_all(db: Session):
    db.query(Supplier).delete()
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


def test_list_suppliers(test_db: Session):
    client = TestClient(app)
    s1 = Supplier(supplier_code="SUP-001", supplier_name="Supplier 1")
    s2 = Supplier(supplier_code="SUP-002", supplier_name="Supplier 2")
    test_db.add_all([s1, s2])
    test_db.commit()

    response = client.get("/api/suppliers")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_supplier_success(test_db: Session):
    client = TestClient(app)
    s = Supplier(supplier_code="SUP-TEST", supplier_name="Test Supplier")
    test_db.add(s)
    test_db.commit()

    response = client.get("/api/suppliers/SUP-TEST")
    assert response.status_code == 200
    assert response.json()["supplier_code"] == "SUP-TEST"


def test_get_supplier_not_found(test_db: Session):
    client = TestClient(app)
    response = client.get("/api/suppliers/NONEXISTENT")
    assert response.status_code == 404


def test_create_supplier_success(test_db: Session):
    client = TestClient(app)
    data = {"supplier_code": "SUP-NEW", "supplier_name": "New Supplier"}
    response = client.post("/api/suppliers", json=data)
    assert response.status_code == 201
    assert response.json()["supplier_code"] == "SUP-NEW"


def test_create_supplier_duplicate(test_db: Session):
    client = TestClient(app)
    existing = Supplier(supplier_code="SUP-DUP", supplier_name="Existing")
    test_db.add(existing)
    test_db.commit()

    response = client.post(
        "/api/suppliers", json={"supplier_code": "SUP-DUP", "supplier_name": "Dup"}
    )
    assert response.status_code == 409


def test_update_supplier_success(test_db: Session):
    client = TestClient(app)
    s = Supplier(supplier_code="SUP-UPD", supplier_name="Old")
    test_db.add(s)
    test_db.commit()

    response = client.put("/api/suppliers/SUP-UPD", json={"supplier_name": "Updated"})
    assert response.status_code == 200
    assert response.json()["supplier_name"] == "Updated"


def test_update_supplier_not_found(test_db: Session):
    client = TestClient(app)
    response = client.put("/api/suppliers/NONEXISTENT", json={"supplier_name": "New"})
    assert response.status_code == 404


def test_delete_supplier_success(test_db: Session):
    client = TestClient(app)
    s = Supplier(supplier_code="SUP-DEL", supplier_name="Delete")
    test_db.add(s)
    test_db.commit()

    response = client.delete("/api/suppliers/SUP-DEL")
    assert response.status_code == 204


def test_delete_supplier_not_found(test_db: Session):
    client = TestClient(app)
    response = client.delete("/api/suppliers/NONEXISTENT")
    assert response.status_code == 404


def test_bulk_upsert_suppliers(test_db: Session):
    client = TestClient(app)
    existing = Supplier(supplier_code="SUP-EXIST", supplier_name="Old")
    test_db.add(existing)
    test_db.commit()

    bulk_data = {
        "suppliers": [
            {"supplier_code": "SUP-EXIST", "supplier_name": "Updated"},
            {"supplier_code": "SUP-NEW", "supplier_name": "New"},
        ]
    }

    response = client.post("/api/suppliers/bulk-upsert", json=bulk_data)
    assert response.status_code == 200
    assert response.json()["created"] >= 1
