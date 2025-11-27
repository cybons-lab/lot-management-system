"""Tests for SAP Inventory Sync API endpoints."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import BusinessRule, Lot, Product, Warehouse


# ---- テスト用DBセッションを使う（トランザクションは外側のpytest設定に依存）
def override_get_db():
    from app.db.session import SessionLocal

    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def _truncate_all(db: Session):
    """テスト用にデータをクリア."""
    db.query(BusinessRule).filter(
        BusinessRule.rule_type == "inventory_sync_alert"
    ).delete()
    db.query(Lot).delete()
    db.query(Product).delete()
    db.query(Warehouse).delete()
    db.commit()


def _setup_test_data(db: Session):
    """テストデータをセットアップ."""
    _truncate_all(db)

    # 倉庫と商品を作成
    wh = Warehouse(warehouse_code="WH01", warehouse_name="Main Warehouse")
    db.add(wh)
    db.flush()

    products = [
        Product(
            product_code=f"P{i:03d}",
            product_name=f"Product {i}",
            packaging_qty=1.0,
            packaging_unit="EA",
            internal_unit="EA",
            base_unit="EA",
        )
        for i in range(1, 4)
    ]
    db.add_all(products)
    db.flush()

    # ロットを作成
    lots = [
        Lot(
            supplier_code="SUP001",
            product_code=f"P{i:03d}",
            lot_number=f"LOT{i:03d}",
            warehouse_id=wh.id,
            quantity=100.0 * i,  # 100, 200, 300
        )
        for i in range(1, 4)
    ]
    db.add_all(lots)
    db.commit()

    return {"warehouse": wh, "products": products, "lots": lots}


@patch("app.services.batch.inventory_sync_service.SAPMockClient")
def test_inventory_sync_execute_success(mock_sap_client_class):
    """SAP在庫同期APIエンドポイントの正常実行テスト."""
    client = TestClient(app)
    db: Session = next(override_get_db())

    data = _setup_test_data(db)
    products = data["products"]

    # SAPMockClientのモックを設定
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

    # APIエンドポイントを呼び出し
    response = client.post("/admin/batch-jobs/inventory-sync/execute")

    # レスポンスの確認
    assert response.status_code == 200
    body = response.json()

    assert body["success"] is True
    assert "SAP在庫チェック完了" in body["message"]
    assert body["data"]["checked_products"] == 3
    assert body["data"]["discrepancies_found"] == 0
    assert body["data"]["alerts_created"] == 0


@patch("app.services.batch.inventory_sync_service.SAPMockClient")
def test_inventory_sync_execute_with_discrepancies(mock_sap_client_class):
    """差異がある場合のテスト."""
    client = TestClient(app)
    db: Session = next(override_get_db())

    data = _setup_test_data(db)
    products = data["products"]

    # SAPMockClientのモックを設定
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

    # APIエンドポイントを呼び出し
    response = client.post("/admin/batch-jobs/inventory-sync/execute")

    # レスポンスの確認
    assert response.status_code == 200
    body = response.json()

    assert body["success"] is True
    assert body["data"]["checked_products"] == 3
    assert body["data"]["discrepancies_found"] == 1
    assert body["data"]["alerts_created"] == 1

    # 差異詳細の確認
    details = body["data"]["details"]
    assert len(details) == 1
    disc = details[0]
    assert disc["product_id"] == products[1].id
    assert disc["local_qty"] == 200.0
    assert disc["sap_qty"] == 220.0
    assert abs(disc["diff_pct"] - 10.0) < 0.01

    # BusinessRuleにアラートが記録されているか確認
    alerts = (
        db.query(BusinessRule)
        .filter(BusinessRule.rule_type == "inventory_sync_alert")
        .all()
    )
    assert len(alerts) == 1
    assert alerts[0].rule_code == f"inv_sync_alert_{products[1].id}"
    assert alerts[0].is_active is True


@patch(
    "app.services.batch.inventory_sync_service.SAPMockClient",
    side_effect=Exception("SAP connection failed"),
)
def test_inventory_sync_execute_error_handling(mock_sap_client_class):
    """エラー時の処理テスト."""
    client = TestClient(app)
    db: Session = next(override_get_db())

    _setup_test_data(db)

    # APIエンドポイントを呼び出し
    response = client.post("/admin/batch-jobs/inventory-sync/execute")

    # エラーレスポンスの確認
    assert response.status_code == 500
    body = response.json()
    assert "SAP在庫チェック実行中にエラーが発生しました" in body["detail"]


def test_inventory_sync_multiple_executions():
    """複数回実行時のアラート更新テスト."""
    client = TestClient(app)
    db: Session = next(override_get_db())

    data = _setup_test_data(db)
    products = data["products"]

    from datetime import datetime
    from decimal import Decimal

    # 1回目の実行（差異あり）
    with patch("app.services.batch.inventory_sync_service.SAPMockClient") as mock_class:
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

        response1 = client.post("/admin/batch-jobs/inventory-sync/execute")
        assert response1.status_code == 200
        assert response1.json()["data"]["alerts_created"] == 1

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
    alert1_id = alert1.id

    # 2回目の実行（同じ商品に差異あり）
    with patch("app.services.batch.inventory_sync_service.SAPMockClient") as mock_class:
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

        response2 = client.post("/admin/batch-jobs/inventory-sync/execute")
        assert response2.status_code == 200
        assert response2.json()["data"]["alerts_created"] == 1

    # 1回目のアラートが無効化されているか確認
    db.refresh(alert1)
    assert alert1.is_active is False

    # 新しいアラートが作成されているか確認
    active_alerts = (
        db.query(BusinessRule)
        .filter(
            BusinessRule.rule_type == "inventory_sync_alert",
            BusinessRule.rule_code == f"inv_sync_alert_{products[0].id}",
            BusinessRule.is_active == True,  # noqa: E712
        )
        .all()
    )
    assert len(active_alerts) == 1
    assert active_alerts[0].id != alert1_id
    assert active_alerts[0].rule_parameters["sap_qty"] == 115.0
