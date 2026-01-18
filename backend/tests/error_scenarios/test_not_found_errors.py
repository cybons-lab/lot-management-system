"""
異常系テスト: 404 Not Found エラーの仕様固定

存在しないリソースへのアクセスに対する404レスポンスを検証。
これらのテストは異常系の仕様を固定し、リグレッションを防止する。
"""

from fastapi.testclient import TestClient


class TestOrderNotFound:
    """注文関連の404テスト"""

    def test_get_nonexistent_order(self, client: TestClient):
        """存在しない注文ID → 404"""
        response = client.get("/api/orders/999999")
        assert response.status_code == 404

    def test_cancel_nonexistent_order(self, client: TestClient):
        """存在しない注文のキャンセル → 404"""
        response = client.delete("/api/orders/999999/cancel")
        assert response.status_code == 404


class TestLotNotFound:
    """ロット関連の404テスト"""

    def test_get_nonexistent_lot(self, client: TestClient):
        """存在しないロットID → 404"""
        response = client.get("/api/lots/999999")
        assert response.status_code == 404


class TestInboundPlanNotFound:
    """入荷計画関連の404テスト"""

    def test_get_nonexistent_inbound_plan(self, client: TestClient):
        """存在しない入荷計画ID → 404"""
        response = client.get("/api/inbound-plans/999999")
        assert response.status_code == 404
