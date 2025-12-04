# backend/tests/api/test_adjustments.py
"""Tests for inventory adjustments API."""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import Lot, Product, Role, StockHistory, User, Warehouse


def _truncate_all(db: Session):
    for table in [StockHistory, Lot, Product, Warehouse, User, Role]:
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
def sample_lot(test_db: Session):
    """Create sample data for testing."""
    # Create user first (for adjusted_by foreign key)
    role = Role(role_code="admin", role_name="Administrator")
    test_db.add(role)
    test_db.flush()

    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="fake_hash",
        display_name="Test User",
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    wh = Warehouse(warehouse_code="WH-001", warehouse_name="Test WH", warehouse_type="internal")
    test_db.add(wh)
    test_db.commit()
    test_db.refresh(wh)

    prod = Product(maker_part_code="PROD-001", product_name="Test Product", base_unit="EA")
    test_db.add(prod)
    test_db.commit()
    test_db.refresh(prod)

    lot = Lot(
        product_id=prod.id,
        warehouse_id=wh.id,
        lot_number="LOT-001",
        current_quantity=Decimal("100.000"),
        allocated_quantity=Decimal("0.000"),
        unit="EA",
        received_date=date.today(),
    )
    test_db.add(lot)
    test_db.commit()
    test_db.refresh(lot)

    # Return both lot and user_id
    lot.test_user_id = user.id
    return lot


def test_create_adjustment_success(test_db: Session, sample_lot: Lot):
    """Test creating an adjustment."""
    client = TestClient(app)

    adjustment_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": 10.0,
        "adjustment_type": "physical_count",
        "reason": "Test adjustment",
        "adjusted_by": sample_lot.test_user_id,
    }

    response = client.post("/api/adjustments", json=adjustment_data)
    assert response.status_code == 201
    data = response.json()
    assert data["lot_id"] == sample_lot.id
    assert float(data["adjusted_quantity"]) == 10.0


def test_create_adjustment_negative_quantity(test_db: Session, sample_lot: Lot):
    """Test creating adjustment with negative quantity."""
    client = TestClient(app)

    adjustment_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": -50.0,
        "adjustment_type": "damage",
        "reason": "Decrease test",
        "adjusted_by": sample_lot.test_user_id,
    }

    response = client.post("/api/adjustments", json=adjustment_data)
    assert response.status_code == 201


def test_create_adjustment_invalid_lot_returns_400(test_db: Session, sample_lot: Lot):
    """Test creating adjustment for non-existent lot."""
    client = TestClient(app)

    adjustment_data = {
        "lot_id": 99999,
        "adjusted_quantity": 10.0,
        "adjustment_type": "other",
        "reason": "Test",
        "adjusted_by": sample_lot.test_user_id,
    }

    response = client.post("/api/adjustments", json=adjustment_data)
    assert response.status_code == 400


def test_list_adjustments_success(test_db: Session, sample_lot: Lot):
    """Test listing adjustments."""
    client = TestClient(app)

    # Create some adjustments
    adj_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": 10.0,
        "adjustment_type": "found",
        "reason": "Test",
        "adjusted_by": sample_lot.test_user_id,
    }
    client.post("/api/adjustments", json=adj_data)

    response = client.get("/api/adjustments")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_list_adjustments_with_lot_filter(test_db: Session, sample_lot: Lot):
    """Test listing adjustments filtered by lot_id."""
    client = TestClient(app)

    adj_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": 10.0,
        "adjustment_type": "loss",
        "reason": "Test",
        "adjusted_by": sample_lot.test_user_id,
    }
    client.post("/api/adjustments", json=adj_data)

    response = client.get("/api/adjustments", params={"lot_id": sample_lot.id})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(adj["lot_id"] == sample_lot.id for adj in data)


def test_list_adjustments_with_type_filter(test_db: Session, sample_lot: Lot):
    """Test listing adjustments filtered by type."""
    client = TestClient(app)

    adj_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": 10.0,
        "adjustment_type": "physical_count",
        "reason": "Test",
        "adjusted_by": sample_lot.test_user_id,
    }
    client.post("/api/adjustments", json=adj_data)

    response = client.get("/api/adjustments", params={"adjustment_type": "physical_count"})
    assert response.status_code == 200
