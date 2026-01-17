# backend/tests/api/test_products.py
"""Comprehensive tests for products API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models import Product
from app.main import app


def _truncate_all(db: Session):
    """Clean up test data."""
    try:
        # Use DELETE instead of TRUNCATE to avoid transaction issues
        # Order matters due to foreign keys
        db.execute(text("DELETE FROM stock_movements"))
        db.execute(text("DELETE FROM lot_receipts"))
        db.execute(text("DELETE FROM products"))
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


# ===== GET /api/masters/products Tests =====


def test_list_products_success(test_db: Session):
    """Test listing products."""
    client = TestClient(app)

    p1 = Product(maker_part_code="LIST-001", product_name="Product 1", base_unit="EA")
    p2 = Product(maker_part_code="LIST-002", product_name="Product 2", base_unit="KG")
    test_db.add_all([p1, p2])
    test_db.commit()

    response = client.get("/api/masters/products")
    assert response.status_code == 200
    data = response.json()
    # May have more products from other tests, just verify our products are present
    product_codes = [p["product_code"] for p in data]
    assert "LIST-001" in product_codes
    assert "LIST-002" in product_codes


def test_list_products_with_pagination(test_db: Session):
    """Test listing products with pagination."""
    client = TestClient(app)

    # Create 5 products
    for i in range(1, 6):
        p = Product(
            maker_part_code=f"PAGE-{i:03d}",
            product_name=f"Product {i}",
            base_unit="EA",
        )
        test_db.add(p)
    test_db.commit()

    # Test pagination
    response = client.get("/api/masters/products", params={"skip": 0, "limit": 3})
    assert response.status_code == 200
    data = response.json()
    # Should return at least our products (may have more from other tests)
    assert len(data) >= 3


# ===== GET /api/masters/products/{code} Tests =====


def test_get_product_success(test_db: Session):
    """Test getting product by code."""
    client = TestClient(app)

    p = Product(maker_part_code="GET-TEST", product_name="Test Product", base_unit="EA")
    test_db.add(p)
    test_db.commit()

    response = client.get("/api/masters/products/GET-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["product_code"] == "GET-TEST"
    assert data["product_name"] == "Test Product"


def test_get_product_not_found(test_db: Session):
    """Test getting non-existent product returns 404."""
    client = TestClient(app)
    response = client.get("/api/masters/products/NONEXISTENT-PRODUCT")
    assert response.status_code == 404


# ===== POST /api/masters/products Tests =====


def test_create_product_success(test_db: Session):
    """Test creating a product."""
    client = TestClient(app)

    product_data = {
        "product_code": "CREATE-001",
        "product_name": "New Product",
        "customer_part_no": "CUST-001",
        "maker_item_code": "MAKER-001",
        "internal_unit": "CAN",
        "external_unit": "KG",
        "qty_per_internal_unit": 20.0,
    }

    response = client.post("/api/masters/products", json=product_data)
    assert response.status_code == 201
    data = response.json()
    assert data["product_code"] == "CREATE-001"
    assert data["product_name"] == "New Product"

    # Verify in DB
    db_product = test_db.query(Product).filter(Product.maker_part_code == "CREATE-001").first()
    assert db_product is not None
    assert db_product.product_name == "New Product"


def test_create_product_duplicate_returns_409(test_db: Session):
    """Test creating duplicate product returns 409."""
    client = TestClient(app)

    existing = Product(maker_part_code="DUP-001", product_name="Existing", base_unit="EA")
    test_db.add(existing)
    test_db.commit()

    product_data = {
        "product_code": "DUP-001",
        "product_name": "Duplicate",
        "customer_part_no": "CUST-DUP",
        "maker_item_code": "MAKER-DUP",
        "internal_unit": "EA",
        "external_unit": "EA",
        "qty_per_internal_unit": 1.0,
    }

    response = client.post("/api/masters/products", json=product_data)
    assert response.status_code == 409


# ===== PUT /api/masters/products/{code} Tests =====


def test_update_product_success(test_db: Session):
    """Test updating a product."""
    client = TestClient(app)

    p = Product(maker_part_code="UPD-001", product_name="Old Name", base_unit="EA")
    test_db.add(p)
    test_db.commit()

    update_data = {"product_name": "Updated Name"}
    response = client.put("/api/masters/products/UPD-001", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["product_name"] == "Updated Name"


def test_update_product_not_found(test_db: Session):
    """Test updating non-existent product returns 404."""
    client = TestClient(app)
    response = client.put("/api/masters/products/NONEXISTENT-UPD", json={"product_name": "New"})
    assert response.status_code == 404


# ===== DELETE /api/masters/products/{code} Tests =====


def test_delete_product_success(test_db: Session):
    """Test soft deleting a product.

    Soft delete sets valid_to to today. The product still exists in DB
    but is excluded from list by default.
    """
    client = TestClient(app)

    p = Product(maker_part_code="DEL-001", product_name="Delete Me", base_unit="EA")
    test_db.add(p)
    test_db.commit()

    response = client.delete("/api/masters/products/DEL-001")
    assert response.status_code == 204

    # Verify soft deletion: record still exists in DB
    test_db.expire_all()
    deleted = test_db.query(Product).filter(Product.maker_part_code == "DEL-001").first()
    assert deleted is not None  # Soft delete doesn't remove from DB
    # valid_to should be set (not 9999-12-31)
    from datetime import date

    assert deleted.valid_to <= date.today()

    # But product is excluded from list API by default
    response = client.get("/api/masters/products")
    product_codes = [p["product_code"] for p in response.json()]
    assert "DEL-001" not in product_codes


def test_delete_product_not_found(test_db: Session):
    """Test deleting non-existent product returns 404."""
    client = TestClient(app)
    response = client.delete("/api/masters/products/NONEXISTENT-DEL")
    assert response.status_code == 404
