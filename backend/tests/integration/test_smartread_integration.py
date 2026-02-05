"""
SmartRead Integration Test

目的: SmartRead OCR → 注文生成の統合フローをテスト
実行時間: ~5秒

テスト範囲:
- OCR画像アップロード → SmartRead API呼び出し
- OCR結果 → 注文データへの変換
- エラーハンドリング（不正な画像、API失敗）
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.models.customer import Customer
from app.infrastructure.database.session import get_db
from app.main import app


@pytest.fixture
def client(db: Session):
    """テストクライアント"""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


@pytest.fixture
def sample_customer(db: Session):
    """テスト用得意先"""
    customer = Customer(
        customer_code="CUST001",
        customer_name="テスト得意先",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


class TestSmartReadIntegration:
    """SmartRead統合テスト"""

    @patch("app.application.services.smartread.smartread_service.SmartReadAPIClient")
    def test_ocr_upload_success(self, mock_api_client, client, sample_customer):
        """正常系: OCR画像アップロード → 注文生成"""
        # Mock SmartRead API response
        mock_api_client.return_value.extract_order_data.return_value = {
            "customer_code": "CUST001",
            "items": [
                {
                    "customer_part_no": "PART001",
                    "quantity": 10,
                    "unit": "個",
                }
            ],
        }

        # 画像ファイルをアップロード
        files = {"file": ("test_order.png", b"fake_image_data", "image/png")}
        response = client.post("/api/smartread/upload", files=files)

        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data

        # 注文が作成されているか確認
        order_id = data["order_id"]
        response = client.get(f"/api/orders/{order_id}")
        assert response.status_code == 200
        order_data = response.json()
        assert order_data["customer_id"] == sample_customer.id

    def test_ocr_upload_invalid_file(self, client):
        """異常系: 不正なファイル形式"""
        files = {"file": ("test.txt", b"not_an_image", "text/plain")}
        response = client.post("/api/smartread/upload", files=files)

        assert response.status_code == 400
        assert "サポートされていないファイル形式" in response.json()["detail"]

    @patch("app.application.services.smartread.smartread_service.SmartReadAPIClient")
    def test_ocr_api_failure(self, mock_api_client, client):
        """異常系: SmartRead API失敗"""
        mock_api_client.return_value.extract_order_data.side_effect = Exception("API Error")

        files = {"file": ("test_order.png", b"fake_image_data", "image/png")}
        response = client.post("/api/smartread/upload", files=files)

        assert response.status_code == 500
        assert "OCR処理に失敗しました" in response.json()["detail"]

    @patch("app.application.services.smartread.smartread_service.SmartReadAPIClient")
    def test_ocr_missing_customer(self, mock_api_client, client):
        """異常系: 得意先コードが存在しない"""
        mock_api_client.return_value.extract_order_data.return_value = {
            "customer_code": "NONEXISTENT",
            "items": [],
        }

        files = {"file": ("test_order.png", b"fake_image_data", "image/png")}
        response = client.post("/api/smartread/upload", files=files)

        assert response.status_code == 404
        assert "得意先が見つかりません" in response.json()["detail"]
