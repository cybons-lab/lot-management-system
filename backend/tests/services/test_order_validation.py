# backend/tests/services/test_order_validation.py
"""Tests for order validation service."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.application.services.orders.validation_service import (
    OrderLineDemand,
    OrderValidationService,
)
from app.domain.errors import InsufficientStockError
from app.infrastructure.persistence.models import (
    LotMaster,
    LotReceipt,
    Product,
    Supplier,
    Warehouse,
)


@pytest.fixture()
def fifo_inventory(db_session):
    supplier = Supplier(supplier_code="SUP1", supplier_name="Supplier One")
    warehouse = Warehouse(
        warehouse_code="W01", warehouse_name="Main Warehouse", warehouse_type="internal"
    )
    product = Product(
        maker_part_code="P001",
        product_name="Sample Product",
        base_unit="EA",
    )

    db_session.add_all([supplier, warehouse, product])
    db_session.flush()

    base_date = date(2024, 1, 1)
    lots: list[LotReceipt] = []
    quantities = [40, 15, 30]
    expiries = [date(2025, 12, 31), date(2024, 12, 31), None]

    for idx, (qty, expiry) in enumerate(zip(quantities, expiries, strict=False), start=1):
        print(f"DEBUG: Creating lot {idx} with number LOT{idx:03d}")

        # Create LotMaster first
        lot_master = LotMaster(
            lot_number=f"LOT{idx:03d}",
            product_id=product.id,
            supplier_id=supplier.id,
        )
        db_session.add(lot_master)
        db_session.flush()

        lot = LotReceipt(
            lot_master_id=lot_master.id,
            supplier_id=supplier.id,
            product_id=product.id,
            expiry_date=expiry,
            warehouse_id=warehouse.id,
            received_date=base_date,
            unit="EA",
            received_quantity=qty,
            origin_type="order",
        )
        # 受入日
        lot.received_date = base_date + timedelta(days=idx - 1)
        db_session.add(lot)
        lots.append(lot)

    db_session.flush()
    return {
        "supplier": supplier,
        "warehouse": warehouse,
        "product": product,
        "lots": lots,
    }


def test_validate_lines_success(db_session, fifo_inventory):
    service = OrderValidationService(db_session)

    demand = OrderLineDemand(
        product_code=fifo_inventory["product"].maker_part_code,
        warehouse_code=fifo_inventory["warehouse"].warehouse_code,
        quantity=70,
    )

    # ship_date filters out the second lot, leaving 40 + 30 = 70 available
    ship_date = date(2025, 1, 15)

    service.validate_lines([demand], ship_date=ship_date, lock=False)


def test_validate_lines_insufficient_stock(db_session, fifo_inventory):
    service = OrderValidationService(db_session)

    demand = OrderLineDemand(
        product_code=fifo_inventory["product"].maker_part_code,
        warehouse_code=fifo_inventory["warehouse"].warehouse_code,
        quantity=90,
    )

    ship_date = date(2025, 1, 15)

    with pytest.raises(InsufficientStockError) as exc_info:
        service.validate_lines([demand], ship_date=ship_date, lock=False)

    error = exc_info.value
    assert error.product_code == fifo_inventory["product"].maker_part_code
    assert error.required == 90
    assert error.available == 70
    assert error.details["warehouse_code"] == fifo_inventory["warehouse"].warehouse_code
    assert error.details["ship_date"] == ship_date.isoformat()

    per_lot = error.details["per_lot"]
    assert [entry["lot_id"] for entry in per_lot] == [
        fifo_inventory["lots"][0].id,
        fifo_inventory["lots"][2].id,
    ]
    assert [entry["available"] for entry in per_lot] == [40, 30]
