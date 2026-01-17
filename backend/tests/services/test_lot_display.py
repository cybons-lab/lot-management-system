from decimal import Decimal
from unittest.mock import MagicMock

from app.application.services.inventory.lot_service import LotService
from app.infrastructure.persistence.models import VLotDetails


def test_list_lots_maps_computed_fields():
    """参照: 在庫不整合の修正 (2026-01-18)

    DBビュー (VLotDetails) で計算されたフィールド (available_quantity, reserved_quantity_active) が、
    デフォルト値の0ではなく、LotResponseに正しくマッピングされることを検証します。
    """
    # 0. Mock DBセッションのセットアップ
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
    # DBビューが返す値をシミュレート
    mock_lot_view.remaining_quantity = Decimal("80.00")
    mock_lot_view.allocated_quantity = Decimal("10.00")
    mock_lot_view.locked_quantity = Decimal("0.00")
    # マッピング漏れが発生していた重要なフィールド
    mock_lot_view.reserved_quantity_active = Decimal("5.00")
    mock_lot_view.available_quantity = Decimal(
        "65.00"
    )  # 80 - 10 - 5 = 65 (ロジックは異なる可能性がありますが、ここではマッピングのみをテスト)

    mock_lot_view.unit = "pcs"
    from datetime import date, datetime

    mock_lot_view.received_date = date(2025, 1, 1)
    mock_lot_view.expiry_date = date(2025, 12, 31)
    mock_lot_view.created_at = datetime(2025, 1, 1, 10, 0, 0)
    mock_lot_view.updated_at = datetime(2025, 1, 1, 10, 0, 0)
    mock_lot_view.status = "active"
    mock_lot_view.origin_type = "order"

    # 2. DBクエリのMock
    service = LotService(db_session)
    # クエリチェーンをMock: db.query().filter()...all()
    # LotService.list_lots は複雑なクエリチェーンを実行するため、
    # クエリ実行結果をMockすることでマッピングロジックの検証を容易にします。

    # 実際には self.db.query(VLotDetails)... を使用します。
    # 実際のクエリ構築をバイパスし、結果をMockすることでマッピングロジックを検証します。
    # 注意: session.query(VLotDetails) のMockはフィルタなどがあるため複雑です。

    # クエリの戻り値をMock
    query_mock = MagicMock()

    db_session.query.return_value = query_mock
    query_mock.filter.return_value = query_mock  # Chainable
    query_mock.order_by.return_value = query_mock  # Chainable
    query_mock.offset.return_value = query_mock
    query_mock.limit.return_value = query_mock
    query_mock.all.return_value = [mock_lot_view]

    # 3. 実行
    results = service.list_lots(skip=0, limit=10)

    # 4. 検証
    assert len(results) == 1
    lot = results[0]

    # 重要なフィールドのアサーション
    assert lot.available_quantity == Decimal(
        "65.00"
    ), "available_quantity がViewから正しくマッピングされていません"
    assert lot.reserved_quantity_active == Decimal(
        "5.00"
    ), "reserved_quantity_active がViewから正しくマッピングされていません"

    # Standard fields
    assert lot.current_quantity == Decimal("80.00")
    assert lot.allocated_quantity == Decimal("10.00")
