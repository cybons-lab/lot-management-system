# backend/tests/api/test_adjustments.py
"""Tests for inventory adjustments API."""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import LotReceipt, Product, Role, StockHistory, User, Warehouse
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.main import application
from app.presentation.api.deps import get_db


def _truncate_all(db: Session):
    for table in [StockHistory, LotReceipt, Product, Warehouse, User, Role]:
        try:
            db.query(table).delete()
        except Exception:
            pass
    db.commit()


@pytest.fixture
def test_db(db: Session):
    _truncate_all(db)

    from app.application.services.auth.auth_service import AuthService
    from app.core import database as core_database
    from app.infrastructure.persistence.models import User

    def override_get_db():
        yield db

    def override_get_current_user():
        return User(id=1, username="test_user", is_active=True)

    application.dependency_overrides[get_db] = override_get_db
    application.dependency_overrides[core_database.get_db] = override_get_db
    application.dependency_overrides[AuthService.get_current_user] = override_get_current_user
    yield db
    _truncate_all(db)
    application.dependency_overrides.clear()


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

    test_db.refresh(prod)

    # Create LotMaster
    lot_master = LotMaster(
        product_id=prod.id,
        lot_number="LOT-001",
    )
    test_db.add(lot_master)
    test_db.commit()

    lot = LotReceipt(
        lot_master_id=lot_master.id,
        product_id=prod.id,
        warehouse_id=wh.id,
        lot_number="LOT-001",
        current_quantity=Decimal("100.000"),
        unit="EA",
        received_date=date.today(),
    )
    test_db.add(lot)
    test_db.commit()
    test_db.refresh(lot)

    # Return both lot and user_id
    lot.test_user_id = user.id  # type: ignore[attr-defined]
    return lot


def test_create_adjustment_success(test_db: Session, sample_lot: LotReceipt):
    """Test creating an adjustment."""
    client = TestClient(application)

    adjustment_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": 10.0,
        "adjustment_type": "physical_count",
        "reason": "Test adjustment",
        "adjusted_by": sample_lot.test_user_id,  # type: ignore[attr-defined]
    }

    response = client.post("/api/adjustments", json=adjustment_data)
    assert response.status_code == 201
    data = response.json()
    assert data["lot_id"] == sample_lot.id
    assert float(data["adjusted_quantity"]) == 10.0


def test_create_adjustment_negative_quantity(test_db: Session, sample_lot: LotReceipt):
    """Test creating adjustment with negative quantity."""
    client = TestClient(application)

    adjustment_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": -50.0,
        "adjustment_type": "damage",
        "reason": "Decrease test",
        "adjusted_by": sample_lot.test_user_id,  # type: ignore[attr-defined]
    }

    response = client.post("/api/adjustments", json=adjustment_data)
    assert response.status_code == 201


def test_create_adjustment_invalid_lot_returns_400(test_db: Session, sample_lot: LotReceipt):
    """Test creating adjustment for non-existent lot."""
    client = TestClient(application)

    adjustment_data = {
        "lot_id": 99999,
        "adjusted_quantity": 10.0,
        "adjustment_type": "other",
        "reason": "Test",
        "adjusted_by": sample_lot.test_user_id,  # type: ignore[attr-defined]
    }

    response = client.post("/api/adjustments", json=adjustment_data)
    assert response.status_code == 422


def test_list_adjustments_success(test_db: Session, sample_lot: LotReceipt):
    """Test listing adjustments."""
    client = TestClient(application)

    # Create some adjustments
    adj_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": 10.0,
        "adjustment_type": "found",
        "reason": "Test",
        "adjusted_by": sample_lot.test_user_id,  # type: ignore[attr-defined]
    }
    client.post("/api/adjustments", json=adj_data)

    response = client.get("/api/adjustments")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_list_adjustments_with_lot_filter(test_db: Session, sample_lot: LotReceipt):
    """Test listing adjustments filtered by lot_id."""
    client = TestClient(application)

    adj_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": 10.0,
        "adjustment_type": "loss",
        "reason": "Test",
        "adjusted_by": sample_lot.test_user_id,  # type: ignore[attr-defined]
    }
    client.post("/api/adjustments", json=adj_data)

    response = client.get("/api/adjustments", params={"lot_id": sample_lot.id})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(adj["lot_id"] == sample_lot.id for adj in data)


def test_list_adjustments_with_type_filter(test_db: Session, sample_lot: LotReceipt):
    """Test listing adjustments filtered by type."""
    client = TestClient(application)

    adj_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": 10.0,
        "adjustment_type": "physical_count",
        "reason": "Test",
        "adjusted_by": sample_lot.test_user_id,  # type: ignore[attr-defined]
    }
    client.post("/api/adjustments", json=adj_data)

    response = client.get("/api/adjustments", params={"adjustment_type": "physical_count"})
    assert response.status_code == 200
