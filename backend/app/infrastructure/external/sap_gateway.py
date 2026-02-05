"""SAP Gateway interface for allocation registration.

This module defines the interface for SAP integration.
CONFIRMED status requires successful SAP registration.

Design:
- SapGateway is a Protocol (interface)
- MockSapGateway is used for development/testing
- Real implementation will integrate with SAP system

【設計意図】SAP Gateway の設計判断:

1. なぜ Protocol を使うのか（L40-55）
   理由: インターフェースと実装を分離
   設計パターン: Dependency Inversion Principle（DIP）
   メリット:
   - 実装の差し替えが容易
   → 開発時: MockSapGateway
   → 本番環境: RealSapGateway（将来実装）
   - テストが容易
   → テスト時に FailingSapGateway で失敗ケースを検証
   代替案との比較:
   - 抽象基底クラス（ABC）: 継承が必要、柔軟性が低い
   - Protocol: Duck Typing、継承不要、柔軟性が高い

2. SapRegistrationResult dataclass の設計（L23-38）
   理由: 成功/失敗の両方の情報を構造化
   フィールド:
   - success: bool → 成功/失敗の判定
   - document_no: SAP伝票番号（成功時のみ）
   - registered_at: 登録日時（成功時のみ）
   - error_message: エラーメッセージ（失敗時のみ）
   業務的意義:
   - document_no: SAP側の伝票番号を保存
   → 後からSAPで検索可能
   - registered_at: 登録タイミングの記録
   → 監査ログ、トラブルシューティング用

3. MockSapGateway の設計（L58-81）
   理由: 開発環境でSAP連携なしで動作確認
   動作:
   - 常に成功を返す
   - document_no を自動生成: "SAP-20241201-000123"
   → 日付 + reservation.id
   メリット:
   - SAPサーバーが不要で開発可能
   - レスポンスが即座（ネットワーク遅延なし）
   - 開発効率向上

4. FailingSapGateway の設計（L84-101）
   理由: エラーハンドリングのテスト
   用途:
   - SAP登録失敗時の動作を検証
   - リトライロジックのテスト
   - エラーメッセージの表示確認
   使用例:
   ```python
   # テストコード
   set_sap_gateway(FailingSapGateway())
   result = sap_service.register_allocation(reservation)
   assert not result.success
   assert result.error_message == "SAP system unavailable (mock failure)"
   ```

5. get_sap_gateway() の設計（L108-117）
   理由: シングルトンパターンでゲートウェイを管理
   動作:
   - _default_gateway が None → MockSapGateway を生成
   - 2回目以降は同じインスタンスを返す
   メリット:
   - グローバルに同じゲートウェイを使用
   - 設定を1箇所で管理
   使用例:
   ```python
   gateway = get_sap_gateway()
   result = gateway.register_allocation(reservation)
   ```

6. set_sap_gateway() の設計（L120-127）
   理由: 依存性注入（DI）のサポート
   用途:
   - テスト時にモックを注入
   - 本番環境で RealSapGateway を設定
   使用例:
   ```python
   # 本番環境の初期化コード
   real_gateway = RealSapGateway(sap_url="https://sap.example.com")
   set_sap_gateway(real_gateway)
   ```

7. グローバル変数 _default_gateway の使用（L105）
   理由: シンプルなDIメカニズム
   代替案:
   - DIコンテナ（dependency-injector 等）: 重厚、学習コスト高
   - グローバル変数: シンプル、プロジェクトの規模に適合
   トレードオフ:
   - 利点: シンプル、理解しやすい
   - 欠点: グローバル状態、マルチスレッドで注意が必要
   → このプロジェクトでは問題なし（FastAPI は各リクエストで独立）

8. TYPE_CHECKING の使用（L14, L19-20）
   理由: 循環インポートの回避
   問題:
   - sap_gateway.py → lot_reservations_model.py → sap_gateway.py（循環）
   解決:
   - TYPE_CHECKING: 型チェック時のみインポート
   → 実行時はインポートされない
   → 循環回避

9. document_no のフォーマット（L74）
   理由: 一意性と可読性の確保
   フォーマット: "SAP-{日付}-{ID}"
   例: "SAP-20241201-000123"
   メリット:
   - 日付部分で登録日を特定可能
   - ID部分で一意性を保証
   - 6桁ゼロパディング: ソートが容易

10. 将来の本番実装の設計方針
    理由: 段階的な実装計画
    Phase 1（現在）: MockSapGateway
    - 開発環境で動作確認
    Phase 2（将来）: RealSapGateway
    - SAP RFC/OData API と連携
    - エラーリトライロジック実装
    - タイムアウト処理
    実装例:
    ```python
    class RealSapGateway:
        def __init__(self, sap_url: str, credentials: dict):
            self.sap_url = sap_url
            self.credentials = credentials

        def register_allocation(self, reservation):
            try:
                response = sap_client.post(
                    f"{self.sap_url}/allocations",
                    json=reservation.to_sap_format()
                )
                return SapRegistrationResult(
                    success=True,
                    document_no=response["document_no"],
                    registered_at=utcnow()
                )
            except Exception as e:
                return SapRegistrationResult(
                    success=False,
                    error_message=str(e)
                )
    ```
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Protocol

from app.core.time_utils import utcnow


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.lot_reservations_model import LotReservation


logger = logging.getLogger(__name__)


@dataclass
class SapRegistrationResult:
    """Result of SAP registration attempt.

    Attributes:
        success: Whether registration succeeded
        document_no: SAP document number (if success)
        registered_at: Registration timestamp (if success)
        error_message: Error message (if failure)
    """

    success: bool
    document_no: str | None = None
    registered_at: datetime | None = None
    error_message: str | None = None


class SapGateway(Protocol):
    """Protocol for SAP gateway implementations.

    Any class implementing this protocol can be used for SAP integration.
    """

    def register_allocation(self, reservation: "LotReservation") -> SapRegistrationResult:
        """Register allocation in SAP system.

        Args:
            reservation: LotReservation to register

        Returns:
            SapRegistrationResult with success/failure and document info
        """
        ...


class MockSapGateway:
    """TODO: [MOCK] Mock SAP gateway for development and testing.

    Always returns success with a generated document number.
    """

    def register_allocation(self, reservation: "LotReservation") -> SapRegistrationResult:
        """Mock SAP registration - always succeeds.

        Args:
            reservation: LotReservation to register

        Returns:
            Successful SapRegistrationResult with mock document number
        """
        now = utcnow()
        document_no = f"SAP-{now.strftime('%Y%m%d')}-{reservation.id:06d}"

        logger.info(
            "Mock SAP allocation registration",
            extra={
                "reservation_id": reservation.id,
                "lot_id": reservation.lot_id,
                "reserved_qty": float(reservation.reserved_qty),
                "source_type": reservation.source_type,
                "source_id": reservation.source_id,
                "mock_document_no": document_no,
            },
        )

        return SapRegistrationResult(
            success=True,
            document_no=document_no,
            registered_at=now,
            error_message=None,
        )


class FailingSapGateway:
    """SAP gateway that always fails (for testing error handling)."""

    def register_allocation(self, reservation: "LotReservation") -> SapRegistrationResult:
        """Always fails SAP registration.

        Args:
            reservation: LotReservation to register

        Returns:
            Failed SapRegistrationResult
        """
        return SapRegistrationResult(
            success=False,
            document_no=None,
            registered_at=None,
            error_message="SAP system unavailable (mock failure)",
        )


# Default gateway instance (can be overridden in DI container)
_default_gateway: SapGateway | None = None


def get_sap_gateway() -> SapGateway:
    """Get the configured SAP gateway instance.

    Returns:
        SapGateway instance (MockSapGateway by default)
    """
    global _default_gateway
    if _default_gateway is None:
        _default_gateway = MockSapGateway()
    return _default_gateway


def set_sap_gateway(gateway: SapGateway) -> None:
    """Set the SAP gateway instance (for testing/configuration).

    Args:
        gateway: SapGateway implementation to use
    """
    global _default_gateway
    _default_gateway = gateway
