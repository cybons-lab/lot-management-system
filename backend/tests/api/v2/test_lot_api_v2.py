from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.infrastructure.persistence.models import LotReceipt, Product, Supplier, Warehouse
from app.infrastructure.persistence.models.lot_master_model import LotMaster


@pytest.fixture
def setup_lot_data(db_session):
    # Supplier
    supplier = Supplier(supplier_code="sup1", supplier_name="Test Supplier")
    db_session.add(supplier)
    db_session.flush()

    # Product
    product = Product(
        maker_part_code="TP-V2-001",
        product_name="Test Product V2",
        base_unit="EA",
    )
    db_session.add(product)

    # Warehouse
    warehouse = Warehouse(
        warehouse_code="WH-V2",
        warehouse_name="Test Warehouse V2",
        warehouse_type="internal",
    )
    db_session.add(warehouse)
    db_session.commit()
    db_session.refresh(product)
    db_session.refresh(warehouse)
    db_session.refresh(supplier)

    # Create LotMaster
    lot_master = LotMaster(
        product_id=product.id,
        supplier_id=supplier.id,
        lot_number="LOT-V2-001",
    )
    db_session.add(lot_master)
    db_session.commit()

    # Lot
    lot = LotReceipt(
        lot_master_id=lot_master.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        received_quantity=Decimal("100.0"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
        origin_type="order",
    )
    db_session.add(lot)
    db_session.commit()
    db_session.refresh(lot)

    return {
        "product": product,
        "warehouse": warehouse,
        "lot": lot,
        "supplier": supplier,
    }


def test_get_available_lots(client, setup_lot_data):
    """Test /api/v2/lot/available endpoint."""
    product = setup_lot_data["product"]

    response = client.get(
        "/api/v2/lot/available", params={"product_id": product.id, "min_quantity": 0}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1

    item = data[0]
    assert item["lot_code"] == "LOT-V2-001"
    assert item["available_qty"] == 100.0
    assert item["product_code"] == "TP-V2-001"
    assert item["warehouse_code"] == "WH-V2"


def test_get_available_lots_insufficient_stock(client, setup_lot_data):
    """Test filtering by min_quantity."""
    product = setup_lot_data["product"]

    response = client.get(
        "/api/v2/lot/available", params={"product_id": product.id, "min_quantity": 200}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


def test_list_lots(client, setup_lot_data):
    """Test /api/v2/lot/ endpoint."""
    response = client.get("/api/v2/lot/")
    assert (
        response.status_code == 200
    ), f"Status code: {response.status_code}, Response: {response.text}"
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


# ==========================================
# POST /api/v2/lot/ (Create Lot) Tests
# ==========================================


def test_create_lot_success(client: TestClient, setup_lot_data):
    """Test successful lot creation."""
    product = setup_lot_data["product"]
    warehouse = setup_lot_data["warehouse"]
    supplier = setup_lot_data["supplier"]

    payload = {
        "product_id": product.id,
        "warehouse_id": warehouse.id,
        "lot_number": "LOT-001",
        "supplier_code": supplier.supplier_code,
        "received_date": "2024-01-01",
        "expiry_date": "2024-12-31",
        "current_quantity": 100.0,
        "unit": "pcs",
        "origin_type": "order",
        "origin_reference": "PO-12345",
        # New Phase 1 fields
        "shipping_date": "2024-02-01",
        "cost_price": 500.0,
        "sales_price": 800.0,
        "tax_rate": 0.10,
    }

    response = client.post("/api/v2/lot/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["lot_number"] == "LOT-001"
    assert data["product_id"] == product.id
    assert float(data["sales_price"]) == 800.0
    assert float(data["tax_rate"]) == 0.10
    assert data["warehouse_id"] == warehouse.id
    assert data["status"] == "active"
    # Ensure current_quantity matches (handle potential string serialization of Decimal)
    assert float(data["current_quantity"]) == 100.0

    # Verify supplier resolution
    assert data["supplier_name"] == supplier.supplier_name


def test_create_lot_with_expiry(client: TestClient, setup_lot_data):
    """Test lot creation with expiry date."""
    product = setup_lot_data["product"]
    warehouse = setup_lot_data["warehouse"]

    expiry = (date.today() + timedelta(days=100)).isoformat()
    payload = {
        "lot_number": "NEW-LOT-EXP",
        "product_id": product.id,
        "warehouse_id": warehouse.id,
        "received_date": date.today().isoformat(),
        "expiry_date": expiry,
        "current_quantity": 10.0,
        "unit": "EA",
        "origin_type": "safety_stock",
    }

    response = client.post("/api/v2/lot/", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["expiry_date"] == expiry
    assert data["origin_type"] == "safety_stock"


def test_create_lot_invalid_ids(client: TestClient, setup_lot_data):
    """Test validation errors for non-existent IDs."""
    product = setup_lot_data["product"]
    warehouse = setup_lot_data["warehouse"]

    # Invalid Product
    payload = {
        "lot_number": "INV-PROD",
        "product_id": 99999,
        "warehouse_id": warehouse.id,
        "received_date": date.today().isoformat(),
        "current_quantity": 10,
        "unit": "EA",
        "origin_type": "adhoc",
    }
    response = client.post("/api/v2/lot/", json=payload)
    # The service raises LotProductNotFoundError, which should translate to 404 or 400
    assert response.status_code in [404, 400], f"Response: {response.text}"

    # Invalid Warehouse
    payload["product_id"] = product.id
    payload["warehouse_id"] = 99999
    response = client.post("/api/v2/lot/", json=payload)
    assert response.status_code in [404, 400], f"Response: {response.text}"


def test_create_lot_validation_error(client: TestClient, setup_lot_data):
    """Test Pydantic validation error (422)."""
    # Missing required 'product_id'
    payload = {
        "lot_number": "MISSING-FIELDS",
        "warehouse_id": setup_lot_data["warehouse"].id,
    }
    response = client.post("/api/v2/lot/", json=payload)
    assert response.status_code == 422


def test_create_lot_duplicate(client: TestClient, setup_lot_data):
    """
    Test duplicate lot creation logic.
    Note: Current logic allows duplicate lot_number (multiple receipts for same lot_number).
    It should NOT error, but create a new Lot entry linked to same LotMaster.
    """
    product = setup_lot_data["product"]
    warehouse = setup_lot_data["warehouse"]

    # First creation
    payload = {
        "lot_number": "DUP-LOT",
        "product_id": product.id,
        "warehouse_id": warehouse.id,
        "received_date": date.today().isoformat(),
        "current_quantity": 10,
        "unit": "EA",
        "origin_type": "adhoc",
    }
    response1 = client.post("/api/v2/lot/", json=payload)
    assert response1.status_code == 201

    # Second creation (same lot_number)
    response2 = client.post("/api/v2/lot/", json=payload)
    assert response2.status_code == 201

    data1 = response1.json()
    data2 = response2.json()

    assert data1["lot_number"] == "DUP-LOT"
    assert data2["lot_number"] == "DUP-LOT"
    # They should have different IDs (Note: LotResponse aliases id to lot_id)
    assert data1["lot_id"] != data2["lot_id"]


# ==========================================
# GET /api/v2/lot/{id} Tests
# ==========================================


def test_get_lot_by_id_success(client: TestClient, setup_lot_data):
    """Test retrieving a specific lot by ID."""
    lot = setup_lot_data["lot"]
    product = setup_lot_data["product"]

    response = client.get(f"/api/v2/lot/{lot.id}")
    assert response.status_code == 200
    data = response.json()

    assert data["lot_id"] == lot.id
    assert data["lot_number"] == "LOT-V2-001"
    assert data["product_id"] == product.id
    assert float(data["current_quantity"]) == 100.0


def test_get_lot_by_id_not_found(client: TestClient):
    """Test retrieving a non-existent lot."""
    response = client.get("/api/v2/lot/999999")
    assert response.status_code == 404
