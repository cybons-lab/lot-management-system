from decimal import Decimal
from unittest.mock import MagicMock

from app.application.services.inventory.lot_service import LotService
from app.infrastructure.persistence.models import VLotDetails


def test_list_lots_maps_computed_fields():
    """Ref: Inventory Inconsistency Fix (2026-01-18)

    Verify that calculated fields from VLotDetails (available_quantity, reserved_quantity_active)
    are correctly mapped to LotResponse, instead of defaulting to 0.
    """
    # 0. Setup Mock DB Session
    db_session = MagicMock()
    mock_lot_view = MagicMock(spec=VLotDetails)
    mock_lot_view.lot_id = 1
    mock_lot_view.lot_number = "TEST-LOT-001"
    mock_lot_view.product_id = 10
    mock_lot_view.maker_part_code = "PRD-001"
    mock_lot_view.product_name = "Test Product"
    mock_lot_view.supplier_id = 20
    mock_lot_view.supplier_code = "SUP-001"
    mock_lot_view.supplier_name = "Test Supplier"
    mock_lot_view.warehouse_id = 30
    mock_lot_view.warehouse_code = "WH-001"
    mock_lot_view.warehouse_name = "Test Warehouse"
    mock_lot_view.received_quantity = Decimal("100.00")
    # Simulate DB view returning these values
    mock_lot_view.remaining_quantity = Decimal("80.00")
    mock_lot_view.allocated_quantity = Decimal("10.00")
    mock_lot_view.locked_quantity = Decimal("0.00")
    # These are the critical fields that were missing in the mapping
    mock_lot_view.reserved_quantity_active = Decimal("5.00")
    mock_lot_view.available_quantity = Decimal(
        "65.00"
    )  # 80 - 10 - 5 = 65 (logic may vary, just testing mapping)

    mock_lot_view.unit = "pcs"
    from datetime import date, datetime

    mock_lot_view.received_date = date(2025, 1, 1)
    mock_lot_view.expiry_date = date(2025, 12, 31)
    mock_lot_view.created_at = datetime(2025, 1, 1, 10, 0, 0)
    mock_lot_view.updated_at = datetime(2025, 1, 1, 10, 0, 0)
    mock_lot_view.status = "active"
    mock_lot_view.origin_type = "order"

    # 2. Mock DB Query
    service = LotService(db_session)
    # Mock the query chain: db.query().filter()...all()
    # We can patch the whole query method or just mock the return of .all()
    # Since LotService.list_lots executes a complex query chain, checking the mapping logic
    # is easier if we mock the result of the query execution.

    # However, LotService uses self.db.query(VLotDetails)...
    # Let's bypass the actual query construction and verify the mapping logic by mocking the result.
    # Note: mocking session.query(VLotDetails) is tricky with filters.

    # Alternative: Subclass or Monkeypatch LotService.list_lots? No, we want to test list_lots logic.
    # We will mock the session query return value.
    query_mock = MagicMock()

    db_session.query.return_value = query_mock
    query_mock.filter.return_value = query_mock  # Chainable
    query_mock.order_by.return_value = query_mock  # Chainable
    query_mock.offset.return_value = query_mock
    query_mock.limit.return_value = query_mock
    query_mock.all.return_value = [mock_lot_view]

    # 3. Execute
    results = service.list_lots(skip=0, limit=10)

    # 4. Verify
    assert len(results) == 1
    lot = results[0]

    # Assertions for critical fields
    assert lot.available_quantity == Decimal("65.00"), "available_quantity failed to map from View"
    assert lot.reserved_quantity_active == Decimal(
        "5.00"
    ), "reserved_quantity_active failed to map from View"

    # Standard fields
    assert lot.current_quantity == Decimal("80.00")
    assert lot.allocated_quantity == Decimal("10.00")
