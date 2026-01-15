from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.infrastructure.persistence.models import Lot, Product, Warehouse
from app.infrastructure.persistence.models.lot_master_model import LotMaster


@pytest.fixture
def setup_lot_data(db_session):
    # Supplier (if needed for Lot)
    from app.infrastructure.persistence.models import Supplier

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
    lot = Lot(
        lot_master_id=lot_master.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        supplier_id=supplier.id,
        lot_number="LOT-V2-001",
        current_quantity=Decimal("100.0"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=90),
    )
    db_session.add(lot)
    db_session.commit()
    db_session.refresh(lot)

    return {"product": product, "warehouse": warehouse, "lot": lot}


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
