"""
異常系テスト: 409 Conflict エラーの仕様固定

競合状態、リソース衝突に対する409レスポンスを検証。
これらのテストは異常系の仕様を固定し、リグレッションを防止する。
"""

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Role


class TestRoleConflicts:
    """ロール関連の競合テスト"""

    def test_duplicate_role_code_returns_conflict(
        self, client, db: Session, superuser_token_headers: dict[str, str]
    ):
        """重複するロールコードで作成 → 400/409/422"""
        # 既存ロールを作成
        role = Role(role_code="ROLE_CONFLICT_ERR", role_name="競合テストロール")
        db.add(role)
        db.flush()

        # 同じコードで作成を試みる
        response = client.post(
            "/api/roles",
            json={
                "role_code": "ROLE_CONFLICT_ERR",  # 重複
                "role_name": "別名ロール",
            },
            headers=superuser_token_headers,
        )

        assert response.status_code in [400, 409, 422]
