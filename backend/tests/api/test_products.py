# backend/tests/api/test_products.py
"""Comprehensive tests for products API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import Product


def _truncate_all(db: Session):
    """Clean up test data."""
    db.query(Product).delete()
    db.commit()


@pytest.fixture
def test_db(db: Session):
    """Provide clean database session."""
    _truncate_all(db)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield db
    _truncate_all(db)
    app.dependency_overrides.clear()


def test_list_products_success(test_db: Session):
    """Test listing products."""
    client = TestClient(app)

    p1 = Product(maker_part_code="PROD-001", product_name="Product 1", base_unit="EA")
    p2 = Product(maker_part_code="PROD-002", product_name="Product 2", base_unit="KG")
    test_db.add_all([p1, p2])
    test_db.commit()

    response = client.get("/api/products")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_product_success(test_db: Session):
    """Test getting product by code."""
    client = TestClient(app)

    p = Product(maker_part_code="PROD-TEST", product_name="Test Product", base_unit="EA")
    test_db.add(p)
    test_db.commit()

    response = client.get("/api/products/PROD-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["maker_part_code"] == "PROD-TEST"


def test_get_product_not_found(test_db: Session):
    """Test getting non-existent product returns 404."""
    client = TestClient(app)
    response = client.get("/api/products/NONEXISTENT")
    assert response.status_code == 404


def test_create_product_success(test_db: Session):
    """Test creating a product."""
    client = TestClient(app)

    product_data = {
        "maker_part_code": "PROD-NEW",
        "product_name": "New Product",
        "base_unit": "EA",
    }

    response = client.post("/api/products", json=product_data)
    assert response.status_code == 201
    assert response.json()["maker_part_code"] == "PROD-NEW"


def test_create_product_duplicate_returns_409(test_db: Session):
    """Test creating duplicate product returns 409."""
    client = TestClient(app)

    existing = Product(maker_part_code="PROD-DUP", product_name="Existing", base_unit="EA")
    test_db.add(existing)
    test_db.commit()

    product_data = {
        "maker_part_code": "PROD-DUP",
        "product_name": "Duplicate",
        "base_unit": "EA",
    }

    response = client.post("/api/products", json=product_data)
    assert response.status_code == 409


def test_update_product_success(test_db: Session):
    """Test updating a product."""
    client = TestClient(app)

    p = Product(maker_part_code="PROD-UPD", product_name="Old Name", base_unit="EA")
    test_db.add(p)
    test_db.commit()

    update_data = {"product_name": "Updated Name"}
    response = client.put("/api/products/PROD-UPD", json=update_data)
    assert response.status_code == 200
    assert response.json()["product_name"] == "Updated Name"


def test_update_product_not_found(test_db: Session):
    """Test updating non-existent product returns 404."""
    client = TestClient(app)
    response = client.put("/api/products/NONEXISTENT", json={"product_name": "New"})
    assert response.status_code == 404


def test_delete_product_success(test_db: Session):
    """Test deleting a product."""
    client = TestClient(app)

    p = Product(maker_part_code="PROD-DEL", product_name="Delete Me", base_unit="EA")
    test_db.add(p)
    test_db.commit()

    response = client.delete("/api/products/PROD-DEL")
    assert response.status_code == 204

    deleted = test_db.query(Product).filter(Product.maker_part_code == "PROD-DEL").first()
    assert deleted is None


def test_delete_product_not_found(test_db: Session):
    """Test deleting non-existent product returns 404."""
    client = TestClient(app)
    response = client.delete("/api/products/NONEXISTENT")
    assert response.status_code == 404


def test_bulk_upsert_products_success(test_db: Session):
    """Test bulk upserting products."""
    client = TestClient(app)

    existing = Product(maker_part_code="PROD-EXIST", product_name="Old", base_unit="EA")
    test_db.add(existing)
    test_db.commit()

    bulk_data = {
        "products": [
            {"maker_part_code": "PROD-EXIST", "product_name": "Updated", "base_unit": "EA"},
            {"maker_part_code": "PROD-NEW", "product_name": "New Product", "base_unit": "KG"},
        ]
    }

    response = client.post("/api/products/bulk-upsert", json=bulk_data)
    assert response.status_code == 200
    data = response.json()
    assert data["created"] >= 1
    assert data["updated"] >= 1
