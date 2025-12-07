"""Tests for SAP Inventory Synchronization Service."""

from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.models import BusinessRule, Lot, Product, Supplier, Warehouse
from app.services.batch.inventory_sync_service import InventorySyncService


@pytest.fixture
def setup_inventory_sync_test_data(db_session: Session):
    """SAP在庫同期テスト用の基本データをセットアップ."""
    # 既存データをクリア
    db_session.query(BusinessRule).filter(BusinessRule.rule_type == "inventory_sync_alert").delete()
    db_session.query(Lot).delete()
    db_session.query(Product).delete()
    db_session.query(Warehouse).delete()
    db_session.commit()

    # テストデータを作成
    wh = Warehouse(
        warehouse_code="WH01", warehouse_name="Main Warehouse", warehouse_type="internal"
    )
    db_session.add(wh)
    db_session.flush()

    # 3つの商品を作成
    products = [
        Product(
            maker_part_code=f"P{i:03d}",
            product_name=f"Product {i}",
            internal_unit="EA",
            base_unit="EA",
        )
        for i in range(1, 4)
    ]
    db_session.add_all(products)
    db_session.flush()

    # サプライヤーを作成
    supplier = Supplier(supplier_code="SUP001", supplier_name="Test Supplier")
    db_session.add(supplier)
    db_session.flush()

    # 商品ごとにロットを作成
    # Product 1: 100個 (差異なし想定)
    lot1 = Lot(
        supplier_id=supplier.id,
        product_id=products[0].id,
        lot_number="LOT001",
        warehouse_id=wh.id,
        current_quantity=Decimal("100"),
        received_date=datetime.now().date(),
        unit="EA",
    )
    # Product 2: 200個 (差異あり想定)
    lot2 = Lot(
        supplier_id=supplier.id,
        product_id=products[1].id,
        lot_number="LOT002",
        warehouse_id=wh.id,
        current_quantity=Decimal("200"),
        received_date=datetime.now().date(),
        unit="EA",
    )
    # Product 3: 50個 (差異なし想定)
    lot3 = Lot(
        supplier_id=supplier.id,
        product_id=products[2].id,
        lot_number="LOT003",
        warehouse_id=wh.id,
        current_quantity=Decimal("50"),
        received_date=datetime.now().date(),
        unit="EA",
    )

    db_session.add_all([lot1, lot2, lot3])
    db_session.commit()

    return {
        "warehouse": wh,
        "products": products,
        "lots": [lot1, lot2, lot3],
    }


def test_get_local_totals(db_session: Session, setup_inventory_sync_test_data):
    """ローカルDB在庫集計のテスト."""
    data = setup_inventory_sync_test_data
    products = data["products"]

    service = InventorySyncService(db_session)
    local_totals = service._get_local_totals()

    # 3つの商品の在庫が正しく集計されているか
    assert len(local_totals) == 3
    assert local_totals[products[0].id] == Decimal("100")
    assert local_totals[products[1].id] == Decimal("200")
    assert local_totals[products[2].id] == Decimal("50")


def test_find_discrepancies_no_diff(db_session: Session, setup_inventory_sync_test_data):
    """差異なしのケースのテスト."""
    data = setup_inventory_sync_test_data
    products = data["products"]

    service = InventorySyncService(db_session)

    # ローカルとSAPが完全一致
    local = {
        products[0].id: Decimal("100"),
        products[1].id: Decimal("200"),
    }
    sap = {
        products[0].id: {"sap_total": Decimal("100"), "timestamp": datetime.now()},
        products[1].id: {"sap_total": Decimal("200"), "timestamp": datetime.now()},
    }

    discrepancies = service._find_discrepancies(local, sap)

    # 差異なし
    assert len(discrepancies) == 0


def test_find_discrepancies_within_tolerance(db_session: Session, setup_inventory_sync_test_data):
    """許容差異率内のケースのテスト."""
    data = setup_inventory_sync_test_data
    products = data["products"]

    service = InventorySyncService(db_session)

    # 0.5%の差異（許容差異率1%未満）
    local = {products[0].id: Decimal("100")}
    sap = {
        products[0].id: {
            "sap_total": Decimal("100.5"),  # 0.5%差異
            "timestamp": datetime.now(),
        }
    }

    discrepancies = service._find_discrepancies(local, sap)

    # 許容範囲内なので差異なし
    assert len(discrepancies) == 0


def test_find_discrepancies_exceeds_tolerance(db_session: Session, setup_inventory_sync_test_data):
    """許容差異率を超えるケースのテスト."""
    data = setup_inventory_sync_test_data
    products = data["products"]

    service = InventorySyncService(db_session)

    # 5%の差異（許容差異率1%を超える）
    local = {products[0].id: Decimal("100")}
    sap = {
        products[0].id: {
            "sap_total": Decimal("105"),  # 5%差異
            "timestamp": datetime.now(),
        }
    }

    discrepancies = service._find_discrepancies(local, sap)

    # 差異あり
    assert len(discrepancies) == 1
    assert discrepancies[0]["product_id"] == products[0].id
    assert discrepancies[0]["local_qty"] == 100.0
    assert discrepancies[0]["sap_qty"] == 105.0
    assert abs(discrepancies[0]["diff_pct"] - 4.76) < 0.01


def test_create_alerts(db_session: Session, setup_inventory_sync_test_data):
    """アラート作成のテスト."""
    data = setup_inventory_sync_test_data
    products = data["products"]

    service = InventorySyncService(db_session)

    discrepancies = [
        {
            "product_id": products[0].id,
            "local_qty": 100.0,
            "sap_qty": 110.0,
            "diff_pct": 10.0,
            "diff_amount": 10.0,
        },
        {
            "product_id": products[1].id,
            "local_qty": 200.0,
            "sap_qty": 180.0,
            "diff_pct": 10.0,
            "diff_amount": -20.0,
        },
    ]

    alerts = service._create_alerts(discrepancies)

    # 2件のアラートが作成される
    assert len(alerts) == 2

    # データベースに記録されているか確認
    db_alerts = (
        db_session.query(BusinessRule)
        .filter(BusinessRule.rule_type == "inventory_sync_alert")
        .all()
    )
    assert len(db_alerts) == 2

    # アラートの内容を確認
    alert1 = db_alerts[0]
    assert alert1.rule_code == f"inv_sync_alert_{products[0].id}"
    assert alert1.is_active is True
    assert alert1.rule_parameters["product_id"] == products[0].id
    assert alert1.rule_parameters["local_qty"] == 100.0
    assert alert1.rule_parameters["sap_qty"] == 110.0


def test_create_alerts_deactivates_old_alerts(db_session: Session, setup_inventory_sync_test_data):
    """既存アラートが無効化されるテスト."""
    data = setup_inventory_sync_test_data
    products = data["products"]

    # 既存のアラートを作成
    old_alert = BusinessRule(
        rule_code=f"inv_sync_alert_{products[0].id}",
        rule_name="Old Alert",
        rule_type="inventory_sync_alert",
        rule_parameters={"old": "data"},
        is_active=True,
    )
    db_session.add(old_alert)
    db_session.commit()

    service = InventorySyncService(db_session)

    discrepancies = [
        {
            "product_id": products[0].id,
            "local_qty": 100.0,
            "sap_qty": 110.0,
            "diff_pct": 10.0,
            "diff_amount": 10.0,
        }
    ]

    service._create_alerts(discrepancies)

    # 新しいロジックでは既存アラートを更新して再利用する
    db_session.refresh(old_alert)
    assert old_alert.is_active is True
    assert old_alert.rule_parameters["diff_pct"] > 0

    # 既存アラートが更新されたので、アラートは1件のまま
    active_alerts = (
        db_session.query(BusinessRule)
        .filter(
            BusinessRule.rule_type == "inventory_sync_alert",
            BusinessRule.rule_code == f"inv_sync_alert_{products[0].id}",
            BusinessRule.is_active.is_(True),
        )
        .all()
    )
    assert len(active_alerts) == 1
    # 既存アラートが更新されて再利用されている（同じID）
    assert active_alerts[0].id == old_alert.id


@patch("app.services.batch.inventory_sync_service.SAPMockClient")
def test_check_inventory_totals_integration(
    mock_sap_client_class, db_session: Session, setup_inventory_sync_test_data
):
    """check_inventory_totals統合テスト."""
    data = setup_inventory_sync_test_data
    products = data["products"]

    # SAPMockClientのモックを設定
    mock_client = MagicMock()
    mock_sap_client_class.return_value = mock_client

    # SAPから返されるデータ（Product 2のみ差異あり）
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
            "sap_total": Decimal("50"),  # 一致
            "timestamp": datetime.now(),
        },
    }

    service = InventorySyncService(db_session)
    result = service.check_inventory_totals()

    # 結果の確認
    assert result["checked_products"] == 3
    assert result["discrepancies_found"] == 1  # Product 2のみ
    assert result["alerts_created"] == 1

    # 差異詳細の確認
    assert len(result["details"]) == 1
    disc = result["details"][0]
    assert disc["product_id"] == products[1].id
    assert disc["local_qty"] == 200.0
    assert disc["sap_qty"] == 220.0

    # アラートがDBに記録されているか
    alerts = (
        db_session.query(BusinessRule)
        .filter(BusinessRule.rule_type == "inventory_sync_alert")
        .all()
    )
    assert len(alerts) == 1
