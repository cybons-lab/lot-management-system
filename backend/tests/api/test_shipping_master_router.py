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
