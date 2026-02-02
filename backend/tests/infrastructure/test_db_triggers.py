from datetime import date

import pytest
from sqlalchemy import text

from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import Supplier, Warehouse
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem


@pytest.fixture
def db_session_triggers(db_session):
    """
    Session fixture for testing triggers.
    Ensures that changes are flushed to the DB so triggers fire,
    but still wrapped in the test transaction rollback (if supported).
    """
    yield db_session


@pytest.fixture
def apply_trigger(db_session_triggers):
    """
    Apply the trigger manually because test DB setup uses create_all()
    which doesn't include alembic migration-based triggers.
    """
    session = db_session_triggers
    # Define SQL exactly as in the migration
    sql_func = """
    CREATE OR REPLACE FUNCTION update_lot_master_aggregates()
    RETURNS TRIGGER AS $$
    DECLARE
        target_lot_id BIGINT;
    BEGIN
        -- Determine affected lot_master_id
        target_lot_id := COALESCE(NEW.lot_master_id, OLD.lot_master_id);
        
        -- Calculate aggregates
        WITH aggregates AS (
            SELECT
                COALESCE(SUM(received_quantity), 0) as total_qty,
                MIN(received_date) as first_recv,
                MAX(received_date) as last_recv,
                MAX(expiry_date) as max_expiry
            FROM lot_receipts
            WHERE lot_master_id = target_lot_id
        )
        UPDATE lot_master
        SET
            total_quantity = aggregates.total_qty,
            first_receipt_date = aggregates.first_recv,
            latest_expiry_date = aggregates.max_expiry,
            updated_at = CURRENT_TIMESTAMP
        FROM aggregates
        WHERE id = target_lot_id;
        
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """

    sql_trigger = """
    CREATE TRIGGER trg_update_lot_master_aggregates
    AFTER INSERT OR UPDATE OR DELETE ON lot_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_lot_master_aggregates();
    """

    # Check if trigger already exists to avoid error if test reuse DB
    # For simplicity in this test fixture, we drop/create
    session.execute(text("DROP TRIGGER IF EXISTS trg_update_lot_master_aggregates ON lot_receipts"))
    session.execute(text("DROP FUNCTION IF EXISTS update_lot_master_aggregates"))
    session.execute(text(sql_func))
    session.execute(text(sql_trigger))
    session.commit()  # Commit DDL
    return True


def test_lot_master_aggregation_trigger(db_session_triggers, apply_trigger):
    session = db_session_triggers

    warehouse = Warehouse(
        warehouse_code="WH-TRIG-01", warehouse_name="Trigger Test WH", warehouse_type="internal"
    )
    supplier = Supplier(supplier_code="SUP-TRIG-01", supplier_name="Trigger Test Supplier")
    session.add_all([warehouse, supplier])
    session.flush()

    product = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="PART-TRIG-01",
        display_name="Trigger Test Part",
        base_unit="pcs",
    )
    session.add(product)
    session.flush()

    # 2. Create LotMaster
    lot_master = LotMaster(
        lot_number="LOT-TRIG-001",
        supplier_item_id=product.id,
        supplier_id=supplier.id,
        total_quantity=0,  # Initial check (though default is 0)
    )
    session.add(lot_master)
    session.flush()
    session.refresh(lot_master)

    # Note: total_quantity might be 0 by default. Verify initial state.
    assert lot_master.total_quantity == 0
    assert lot_master.first_receipt_date is None

    # 3. Add first LotReceipt (Qty 100)
    receipt1 = LotReceipt(
        lot_master_id=lot_master.id,
        supplier_item_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 1, 10),
        received_quantity=100,
        unit="pcs",
    )
    session.add(receipt1)
    session.flush()
    session.refresh(lot_master)

    # Verify aggregation
    assert lot_master.total_quantity == 100
    assert lot_master.first_receipt_date == date(2025, 1, 10)

    # 4. Add second LotReceipt (Qty 50)
    receipt2 = LotReceipt(
        lot_master_id=lot_master.id,
        supplier_item_id=product.id,
        warehouse_id=warehouse.id,
        received_date=date(2025, 1, 15),
        expiry_date=date(2025, 12, 31),
        received_quantity=50,
        unit="pcs",
    )
    session.add(receipt2)
    session.flush()
    session.refresh(lot_master)

    # Verify aggregation (100 + 50 = 150)
    assert lot_master.total_quantity == 150
    assert lot_master.first_receipt_date == date(2025, 1, 10)  # Min date
    assert lot_master.latest_expiry_date == date(2025, 12, 31)

    # 5. Update first receipt (100 -> 200)
    receipt1.received_quantity = 200
    session.add(receipt1)
    session.flush()
    session.refresh(lot_master)

    # Verify aggregation (200 + 50 = 250)
    assert lot_master.total_quantity == 250

    # 6. Delete second receipt
    session.delete(receipt2)
    session.flush()
    session.refresh(lot_master)

    # Verify aggregation (250 - 50 = 200)
    assert lot_master.total_quantity == 200
    # Dates should update (first date remains, max expiry goes back to null or if receipt1 had none)
    # receipt1 has no expiry, so max_expiry should be null (or None)
    assert lot_master.latest_expiry_date is None
