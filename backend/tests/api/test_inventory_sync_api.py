"""Tests for SAP Inventory Sync API endpoints."""

from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    BusinessRule,
    Lot,
    Product,
    ProductWarehouse,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.main import app
from app.presentation.api.deps import get_db


# ---- テスト用DBセッションを使う（トランザクションは外側のpytest設定に依存）
@pytest.fixture
def test_db(db: Session):
    """
    Wrap the standard db fixture to set up dependency override.
    Ensures API requests use the same session as the test.
    """

    def override_get_db():
        # Return the same db session instance directly
        # This ensures transaction isolation is maintained
        return db

    app.dependency_overrides[get_db] = override_get_db
    yield db
    app.dependency_overrides.clear()


def _truncate_all(db: Session):
    """テスト用にデータをクリア."""
    try:
        db.query(BusinessRule).filter(BusinessRule.rule_type == "inventory_sync_alert").delete()
        db.query(Lot).delete()
        db.query(LotMaster).delete()
        db.query(Product).delete()
        db.query(Warehouse).delete()
        db.flush()  # Flush instead of commit
    except Exception:
        db.rollback()


def _setup_test_data(db: Session):
    """テストデータをセットアップ."""
    _truncate_all(db)

    # 倉庫と商品を作成
    wh = Warehouse(
        warehouse_code="WH01", warehouse_name="Main Warehouse", warehouse_type="internal"
    )
    db.add(wh)
    db.flush()

    # サプライヤーを作成
    from app.infrastructure.persistence.models import Supplier

    supplier = Supplier(supplier_code="SUP001", supplier_name="Test Supplier")
    db.add(supplier)
    db.flush()

    products = [
        Product(
            maker_part_code=f"P{i:03d}",
            product_name=f"Product {i}",
            internal_unit="EA",
            base_unit="EA",
        )
        for i in range(1, 4)
    ]
    db.add_all(products)
    db.flush()

    # Create ProductWarehouse records
    product_warehouses = [
        ProductWarehouse(
            product_id=p.id,
            warehouse_id=wh.id,
            is_active=True,
        )
        for p in products
    ]
    db.add_all(product_warehouses)
    db.flush()

    # Create LotMasters first
    for i in range(1, 4):
        lm = LotMaster(
            product_id=products[i - 1].id,
            lot_number=f"LOT{i:03d}",
            supplier_id=supplier.id,
        )
        db.add(lm)
    db.flush()

    # Get LotMaster IDs
    lot_masters = db.query(LotMaster).order_by(LotMaster.lot_number).all()

    # ロットを作成
    lots = [
        Lot(
            supplier_id=supplier.id,
            product_id=products[i - 1].id,
            lot_master_id=lot_masters[i - 1].id,
            lot_number=f"LOT{i:03d}",
            warehouse_id=wh.id,
            current_quantity=100.0 * i,  # 100, 200, 300
            unit="EA",
            received_date=date.today(),
            status="active",
        )
        for i in range(1, 4)
    ]
    db.add_all(lots)
    db.flush()  # Flush instead of commit to keep data in the transaction

    return {"warehouse": wh, "products": products, "lots": lots}


def test_inventory_sync_execute_success(test_db: Session):
    """SAP在庫同期サービスの正常実行テスト（サービス直接呼び出し版）."""
    db = test_db

    data = _setup_test_data(db)
    products = data["products"]

    # SAPMockClientのモックを設定
    with patch(
        "app.application.services.batch.inventory_sync_service.SAPMockClient"
    ) as mock_sap_client_class:
        mock_client = MagicMock()
        mock_sap_client_class.return_value = mock_client

        # SAPから返されるデータ（全て一致）
        from datetime import datetime
        from decimal import Decimal

        mock_client.get_total_inventory.return_value = {
            products[0].id: {
                "sap_total": Decimal("100"),
                "timestamp": datetime.now(),
            },
            products[1].id: {
                "sap_total": Decimal("200"),
                "timestamp": datetime.now(),
            },
            products[2].id: {
                "sap_total": Decimal("300"),
                "timestamp": datetime.now(),
            },
        }

        # サービスを直接呼び出し
        from app.application.services.batch.inventory_sync_service import InventorySyncService

        service = InventorySyncService(db)
        result = service.check_inventory_totals()

    # 結果の確認
    assert result["checked_products"] == 3
    assert result["discrepancies_found"] == 0
    assert result["alerts_created"] == 0


def test_inventory_sync_execute_with_discrepancies(test_db: Session):
    """差異がある場合のテスト（サービス直接呼び出し版）."""
    db = test_db

    data = _setup_test_data(db)
    products = data["products"]

    # SAPMockClientのモックを設定
    with patch(
        "app.application.services.batch.inventory_sync_service.SAPMockClient"
    ) as mock_sap_client_class:
        mock_client = MagicMock()
        mock_sap_client_class.return_value = mock_client

        # SAPから返されるデータ（Product 2に差異あり）
        from datetime import datetime
        from decimal import Decimal

        mock_client.get_total_inventory.return_value = {
            products[0].id: {
                "sap_total": Decimal("100"),  # 一致
                "timestamp": datetime.now(),
            },
            products[1].id: {
                "sap_total": Decimal("220"),  # 10%差異
                "timestamp": datetime.now(),
            },
            products[2].id: {
                "sap_total": Decimal("300"),  # 一致
                "timestamp": datetime.now(),
            },
        }

        # サービスを直接呼び出し
        from app.application.services.batch.inventory_sync_service import InventorySyncService

        service = InventorySyncService(db)
        result = service.check_inventory_totals()

    # 結果の確認
    assert result["checked_products"] == 3
    assert result["discrepancies_found"] == 1
    assert result["alerts_created"] == 1

    # 差異詳細の確認
    details = result["details"]
    assert len(details) == 1
    disc = details[0]
    assert disc["product_id"] == products[1].id
    assert disc["local_qty"] == 200.0
    assert disc["sap_qty"] == 220.0
    # 差異率は約10%であることを確認（200→220は10%増加）
    assert 9.0 < disc["diff_pct"] < 11.0

    # BusinessRuleにアラートが記録されているか確認
    alerts = db.query(BusinessRule).filter(BusinessRule.rule_type == "inventory_sync_alert").all()
    assert len(alerts) == 1
    assert alerts[0].rule_code == f"inv_sync_alert_{products[1].id}"
    assert alerts[0].is_active is True


def test_inventory_sync_execute_error_handling(test_db: Session):
    """エラー時の処理テスト（サービス直接呼び出し版）."""
    db = test_db

    _setup_test_data(db)

    # サービスを直接呼び出し（エラー発生）
    # SAPMockClient自体がエラーを投げる場合をテスト
    import pytest

    with patch(
        "app.application.services.batch.inventory_sync_service.SAPMockClient",
        side_effect=Exception("SAP connection failed"),
    ):
        from app.application.services.batch.inventory_sync_service import InventorySyncService

        # サービス初期化時にエラーが発生
        with pytest.raises(Exception) as exc_info:
            InventorySyncService(db)

        assert "SAP connection failed" in str(exc_info.value)


def test_inventory_sync_multiple_executions(test_db: Session):
    """複数回実行時のアラート更新テスト（サービス直接呼び出し版）."""
    db = test_db

    data = _setup_test_data(db)
    products = data["products"]

    from datetime import datetime
    from decimal import Decimal

    from app.application.services.batch.inventory_sync_service import InventorySyncService

    # 1回目の実行（差異あり）
    with patch("app.application.services.batch.inventory_sync_service.SAPMockClient") as mock_class:
        mock_client = MagicMock()
        mock_class.return_value = mock_client
        mock_client.get_total_inventory.return_value = {
            products[0].id: {
                "sap_total": Decimal("110"),  # 10%差異
                "timestamp": datetime.now(),
            },
            products[1].id: {
                "sap_total": Decimal("200"),
                "timestamp": datetime.now(),
            },
            products[2].id: {
                "sap_total": Decimal("300"),
                "timestamp": datetime.now(),
            },
        }

        service = InventorySyncService(db)
        result1 = service.check_inventory_totals()
        assert result1["alerts_created"] == 1

    # 1回目のアラートID を取得
    alert1 = (
        db.query(BusinessRule)
        .filter(
            BusinessRule.rule_type == "inventory_sync_alert",
            BusinessRule.rule_code == f"inv_sync_alert_{products[0].id}",
        )
        .first()
    )
    assert alert1 is not None

    # 2回目の実行（同じ商品に差異あり）
    with patch("app.application.services.batch.inventory_sync_service.SAPMockClient") as mock_class:
        mock_client = MagicMock()
        mock_class.return_value = mock_client
        mock_client.get_total_inventory.return_value = {
            products[0].id: {
                "sap_total": Decimal("115"),  # 15%差異（さらに増加）
                "timestamp": datetime.now(),
            },
            products[1].id: {
                "sap_total": Decimal("200"),
                "timestamp": datetime.now(),
            },
            products[2].id: {
                "sap_total": Decimal("300"),
                "timestamp": datetime.now(),
            },
        }

        service = InventorySyncService(db)
        result2 = service.check_inventory_totals()
        assert result2["alerts_created"] == 1

    # 1回目と同じアラートが更新されて継続していることを確認（新しいアラートは作成されない）
    db.refresh(alert1)
    assert alert1.is_active is True  # 更新されて継続している
    assert alert1.rule_parameters["sap_qty"] == 115.0  # 新しい値に更新されている

    # アラート数は1つのまま（既存のものが更新されただけ）
    total_alerts = (
        db.query(BusinessRule)
        .filter(
            BusinessRule.rule_type == "inventory_sync_alert",
            BusinessRule.rule_code == f"inv_sync_alert_{products[0].id}",
        )
        .count()
    )
    assert total_alerts == 1
