from sqlalchemy import inspect

from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt


def test_lot_number_column_removed(db_session):
    """Verify lot_number column is removed from lot_receipts table in DB info."""
    # Note: access through SQLAlchemy inspector
    inspector = inspect(db_session.bind)
    columns = [c["name"] for c in inspector.get_columns("lot_receipts")]
    assert "lot_number" not in columns, "lot_number column should be removed from DB"


def test_lot_number_property_access(db_session):
    """Verify accessing lot.lot_number works via property."""
    # Use existing test data fixtures logic if possible, or mock
    # This is a unit-test level check for the model modification
    assert hasattr(LotReceipt, "lot_number"), "LotReceipt should have lot_number property"
    # Verify it is a property, not a column
    assert isinstance(LotReceipt.lot_number, property)


def test_fefo_index_exists(db_session):
    """Verify FEFO index exists."""
    inspector = inspect(db_session.bind)
    indexes = inspector.get_indexes("lot_receipts")
    index_names = [i["name"] for i in indexes]
    assert "idx_lot_receipts_fefo_allocation" in index_names

    # Check columns
    fefo_idx = next(i for i in indexes if i["name"] == "idx_lot_receipts_fefo_allocation")
    col_names = fefo_idx["column_names"]
    assert "expiry_date" in col_names
    assert "received_date" in col_names
