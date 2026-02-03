"""ShippingMasterSyncServiceのテスト."""

import pytest
from sqlalchemy import select

from app.application.services.shipping_master.shipping_master_sync_service import (
    ShippingMasterSyncService,
)
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    DeliveryPlace,
    Supplier,
    Warehouse,
)
from app.infrastructure.persistence.models.shipping_master_models import ShippingMasterCurated
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem


@pytest.fixture
def sync_service(db):
    return ShippingMasterSyncService(db)


def test_sync_batch_create_only(db, sync_service):
    """新規作成のテスト (create-only)."""
    # 準備: 整形済みマスタデータ作成
    curated = ShippingMasterCurated(
        customer_code="C1",
        customer_name="Customer 1",
        material_code="M1",
        jiku_code="J1",
        supplier_code="S1",
        supplier_name="Supplier 1",
        maker_part_no="MPN1",
        delivery_note_product_name="Product 1",
        delivery_place_code="DP1",
        delivery_place_name="Place 1",
        warehouse_code="W1",
        shipping_warehouse="Warehouse 1",
        transport_lt_days=2,
        remarks="Test Remarks",
        has_order=True,
    )
    db.add(curated)
    db.flush()

    # 実行
    summary = sync_service.sync_batch(policy="create-only")

    # 検証: 件数
    assert summary.processed_count == 1
    assert summary.created_count > 0
    assert summary.errors == []

    # 各マスタが作成されているか
    cust = db.execute(select(Customer).where(Customer.customer_code == "C1")).scalar_one()
    assert cust.customer_name == "Customer 1"
    assert cust.display_name == "Customer 1"

    supp = db.execute(select(Supplier).where(Supplier.supplier_code == "S1")).scalar_one()
    assert supp.supplier_name == "Supplier 1"
    assert supp.display_name == "Supplier 1"

    wh = db.execute(select(Warehouse).where(Warehouse.warehouse_code == "W1")).scalar_one()
    assert wh.warehouse_name == "Warehouse 1"
    assert wh.display_name == "Warehouse 1"

    dp = db.execute(
        select(DeliveryPlace).where(DeliveryPlace.delivery_place_code == "DP1")
    ).scalar_one()
    assert dp.jiku_code == "J1"
    assert dp.delivery_place_name == "Place 1"

    si = db.execute(select(SupplierItem).where(SupplierItem.maker_part_no == "MPN1")).scalar_one()
    assert si.display_name == "Product 1"


def test_sync_delivery_place_composite_uniqueness(db, sync_service):
    """納入先コードが同じでも次区が違えば別レコードとして作成されること."""
    # 1件目: J1-DP1
    c1 = ShippingMasterCurated(
        customer_code="C1",
        material_code="M1",
        jiku_code="J1",
        delivery_place_code="DP1",
        delivery_place_name="Place J1",
        supplier_code="S1",
        maker_part_no="P1",
        delivery_note_product_name="N",
    )
    # 2件目: J2-DP1 (コード重複、次区違い)
    c2 = ShippingMasterCurated(
        customer_code="C1",
        material_code="M1",
        jiku_code="J2",
        delivery_place_code="DP1",
        delivery_place_name="Place J2",
        supplier_code="S1",
        maker_part_no="P2",
        delivery_note_product_name="N",
    )
    db.add_all([c1, c2])
    db.flush()

    sync_service.sync_batch()

    # 検証
    dps = (
        db.execute(select(DeliveryPlace).where(DeliveryPlace.delivery_place_code == "DP1"))
        .scalars()
        .all()
    )
    assert len(dps) == 2
    jikus = {dp.jiku_code for dp in dps}
    assert jikus == {"J1", "J2"}


def test_sync_update_if_empty(db, sync_service):
    """update-if-empty ポリシーのテスト."""
    # 準備: 既存マスタ (名称が空)
    cust = Customer(customer_code="C1", customer_name="", display_name=None)
    db.add(cust)
    db.flush()

    curated = ShippingMasterCurated(
        customer_code="C1", customer_name="New Name", material_code="M1", jiku_code="J1"
    )
    db.add(curated)
    db.flush()

    # 実行
    sync_service.sync_batch(policy="update-if-empty")

    # 検証: 更新されていること
    db.refresh(cust)
    assert cust.customer_name == "New Name"
    # display_nameもNULLだったので更新対象（新規と同じ扱いでセットされるかは実装次第だが、apply_updateではセットされる）
    assert cust.display_name == "New Name"


def test_sync_skip_missing_product_name(db, sync_service):
    """品名欠落時は SupplierItem の作成をスキップし、警告を出すこと."""
    curated = ShippingMasterCurated(
        customer_code="C1",
        material_code="M1",
        jiku_code="J1",
        supplier_code="S1",
        maker_part_no="P1",
        delivery_note_product_name=None,  # 欠落
    )
    db.add(curated)
    db.flush()

    summary = sync_service.sync_batch()

    # 検証
    assert any("品名欠落のためスキップ" in w for w in summary.warnings)
    si = db.execute(
        select(SupplierItem).where(SupplierItem.maker_part_no == "P1")
    ).scalar_one_or_none()
    assert si is None
