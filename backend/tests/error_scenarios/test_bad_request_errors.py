"""
異常系テスト: 400 Bad Request / 422 Validation Error の仕様固定

ビジネスルール違反、不正なリクエストに対するエラーレスポンスを検証。
これらのテストは異常系の仕様を固定し、リグレッションを防止する。
"""

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Supplier, SupplierItem


class TestSupplierProductErrors:
    """仕入先製品マスタの異常系テスト"""

    def test_create_pair_then_duplicate(
        self, client, db: Session, superuser_token_headers: dict[str, str]
    ):
        """同じ製品-仕入先ペアで2回作成 → 2回目は400/409/422"""
        # 製品と仕入先を作成
        supplier = Supplier(
            supplier_code="SUP-SP-DUP-ERR",
            supplier_name="仕入先SP重複ERR",
        )
        db.add(supplier)
        db.flush()

        product = SupplierItem(
            supplier_id=supplier.id,
            maker_part_no="PROD-SP-DUP-ERR",
            display_name="製品SP重複ERR",
            base_unit="EA",
        )
        db.add(product)
        db.flush()

        # 最初の作成
        response1 = client.post(
            "/api/masters/supplier-items",
            json={
                "supplier_id": supplier.id,
                "maker_part_no": "SP-ERR-DUP",
                "display_name": "製品SP重複ERR-1",
                "base_unit": "EA",
            },
            headers=superuser_token_headers,
        )
        assert response1.status_code in [200, 201]

        # 同じペアで再度作成
        response2 = client.post(
            "/api/masters/supplier-items",
            json={
                "supplier_id": supplier.id,
                "maker_part_no": "SP-ERR-DUP",  # 重複
                "display_name": "製品SP重複ERR-2",
                "base_unit": "EA",
            },
            headers=superuser_token_headers,
        )
        assert response2.status_code in [400, 409, 422]


class TestSupplierItemErrors:
    """仕入先製品マスタの異常系テスト (Phase 2対応)"""

    def test_create_with_missing_required_fields(
        self, client, db: Session, superuser_token_headers: dict[str, str]
    ):
        """必須フィールドなしで仕入先製品作成 → 422"""
        response = client.post(
            "/api/masters/supplier-items",
            json={
                # maker_part_no missing
                "display_name": "テスト製品",
                "base_unit": "EA",
            },
            headers=superuser_token_headers,
        )
        # Pydantic validation error
        assert response.status_code == 422

    def test_create_with_invalid_data_type(
        self, client, db: Session, superuser_token_headers: dict[str, str]
    ):
        """型が不正なデータで仕入先製品作成 → 422"""
        response = client.post(
            "/api/masters/supplier-items",
            json={
                "maker_part_no": "PROD-TYPE-ERR",
                "display_name": "テスト製品",
                "base_unit": "EA",
                "base_price": "not_a_number",  # 数値フィールドに文字列
            },
            headers=superuser_token_headers,
        )
        # Pydantic validation error
        assert response.status_code == 422
