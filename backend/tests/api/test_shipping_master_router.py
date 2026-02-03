"""Shipping Master Routerのテスト."""

from fastapi.testclient import TestClient

from app.infrastructure.persistence.models.shipping_master_models import ShippingMasterCurated


def test_export_shipping_masters(client: TestClient, db):
    """エクスポートエンドポイントのテスト."""
    # 準備
    db.add(
        ShippingMasterCurated(
            customer_code="C1", material_code="M1", jiku_code="J1", customer_name="Test Customer"
        )
    )
    db.commit()
    # 実行
    response = client.get("/api/shipping-masters/export/download?format=xlsx")

    # 検証
    if response.status_code != 200:
        print(f"DEBUG: export status={response.status_code}, text={response.text}")
    assert response.status_code == 200
    assert "Content-Disposition" in response.headers
    assert response.headers["Content-Disposition"].startswith(
        "attachment; filename=shipping_masters"
    )
    assert (
        response.headers["Content-Type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


def test_import_with_auto_sync(client: TestClient, db):
    """自動同期付きインポートのテスト."""
    import io

    import openpyxl

    # Excelファイル作成
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(
        [
            "得意先コード",
            "材質コード",
            "次区",
            "素材納品書記載製品名",
            "仕入先コード",
            "仕入先名称",
            "メーカー品番",
        ]
    )
    ws.append(
        ["C_IMPORT", "M_IMPORT", "J_IMPORT", "Prod Import", "S_IMPORT", "Supp Import", "MPN_IMPORT"]
    )

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    # 実行 (auto_sync=true)
    files = {
        "file": (
            "test.xlsx",
            stream,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    response = client.post(
        "/api/shipping-masters/import?auto_sync=true&sync_policy=create-only", files=files
    )

    # 検証
    if response.status_code != 200:
        print(f"DEBUG: import status={response.status_code}, text={response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["curated_count"] == 1

    # マスターが実際に作成されているか確認
    from sqlalchemy import select

    from app.infrastructure.persistence.models.masters_models import Customer

    cust = db.execute(
        select(Customer).where(Customer.customer_code == "C_IMPORT")
    ).scalar_one_or_none()
    assert cust is not None
    # 名前は現状curate_from_rawでNoneになるため、同期時に空文字等になる可能性がある
    # ここでは作成されていること自体を重要視する

    from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

    si = db.execute(
        select(SupplierItem).where(SupplierItem.maker_part_no == "MPN_IMPORT")
    ).scalar_one_or_none()
    assert si is not None
    assert si.display_name == "Prod Import"


def test_sync_shipping_masters(client: TestClient, db):
    """マスタ同期エンドポイントのテスト."""
    # 準備: 整形済みマスタデータ作成
    curated = ShippingMasterCurated(
        customer_code="C_SYNC",
        customer_name="Sync Customer",
        material_code="M_SYNC",
        jiku_code="J_SYNC",
        supplier_code="S_SYNC",
        supplier_name="Sync Supplier",
        maker_part_no="MPN_SYNC",
        delivery_note_product_name="Sync Product",
        delivery_place_code="DP_SYNC",
        delivery_place_name="Sync Place",
        warehouse_code="W_SYNC",
        shipping_warehouse="Sync Warehouse",
        has_order=True,
    )
    db.add(curated)
    db.commit()

    # 実行: create-only ポリシーで同期
    response = client.post("/api/shipping-masters/sync?policy=create-only")

    # 検証
    if response.status_code != 200:
        print(f"DEBUG: sync status={response.status_code}, text={response.text}")
    assert response.status_code == 200

    data = response.json()
    assert "processed_count" in data
    assert "created_count" in data
    assert "updated_count" in data
    assert "skipped_count" in data
    assert "errors" in data
    assert "warnings" in data

    # 処理件数が正しいか
    assert data["processed_count"] == 1
    assert data["created_count"] > 0  # 複数のマスタが作成される

    # 実際にマスタが作成されているか確認
    from sqlalchemy import select

    from app.infrastructure.persistence.models.masters_models import Customer, Supplier

    cust = db.execute(
        select(Customer).where(Customer.customer_code == "C_SYNC")
    ).scalar_one_or_none()
    assert cust is not None
    assert cust.customer_name == "Sync Customer"

    supp = db.execute(
        select(Supplier).where(Supplier.supplier_code == "S_SYNC")
    ).scalar_one_or_none()
    assert supp is not None
    assert supp.supplier_name == "Sync Supplier"
