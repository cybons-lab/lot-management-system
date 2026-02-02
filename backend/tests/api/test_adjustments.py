# backend/tests/api/test_adjustments.py
"""Tests for inventory adjustments API."""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    LotReceipt,
    Role,
    SupplierItem,
    User,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster


@pytest.fixture
def sample_lot(db: Session, supplier):
    """Create sample data for testing."""
    # Create user first (for adjusted_by foreign key)
    role = Role(role_code="admin", role_name="Administrator")
    db.add(role)
    db.flush()

    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="fake_hash",
        display_name="Test User",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    wh = Warehouse(warehouse_code="WH-001", warehouse_name="Test WH", warehouse_type="internal")
    db.add(wh)
    db.commit()
    db.refresh(wh)

    prod = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PROD-001",
        display_name="Test Product",
        base_unit="EA",
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

    db.refresh(prod)

    # Create LotMaster
    lot_master = LotMaster(
        supplier_item_id=prod.id,
        lot_number="LOT-001",
    )
    db.add(lot_master)
    db.commit()

    lot = LotReceipt(
        lot_master_id=lot_master.id,
        supplier_item_id=prod.id,
        warehouse_id=wh.id,
        received_quantity=Decimal("100.000"),
        unit="EA",
        received_date=date.today(),
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)

    # Return both lot and user_id
    lot.test_user_id = user.id  # type: ignore[attr-defined]
    return lot


def test_create_adjustment_success(db: Session, client: TestClient, sample_lot: LotReceipt):
    """Test creating an adjustment."""

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


def test_create_adjustment_negative_quantity(
    db: Session, client: TestClient, sample_lot: LotReceipt
):
    """Test creating adjustment with negative quantity."""

    adjustment_data = {
        "lot_id": sample_lot.id,
        "adjusted_quantity": -50.0,
        "adjustment_type": "damage",
        "reason": "Decrease test",
        "adjusted_by": sample_lot.test_user_id,  # type: ignore[attr-defined]
    }

    response = client.post("/api/adjustments", json=adjustment_data)
    assert response.status_code == 201


def test_create_adjustment_invalid_lot_returns_400(
    db: Session, client: TestClient, sample_lot: LotReceipt
):
    """Test creating adjustment for non-existent lot."""

    adjustment_data = {
        "lot_id": 99999,
        "adjusted_quantity": 10.0,
        "adjustment_type": "other",
        "reason": "Test",
        "adjusted_by": sample_lot.test_user_id,  # type: ignore[attr-defined]
    }

    response = client.post("/api/adjustments", json=adjustment_data)
    assert response.status_code == 422


def test_list_adjustments_success(db: Session, client: TestClient, sample_lot: LotReceipt):
    """Test listing adjustments."""

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


def test_list_adjustments_with_lot_filter(db: Session, client: TestClient, sample_lot: LotReceipt):
    """Test listing adjustments filtered by lot_id."""

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


def test_list_adjustments_with_type_filter(db: Session, client: TestClient, sample_lot: LotReceipt):
    """Test listing adjustments filtered by type."""

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
