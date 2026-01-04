# backend/app/middleware/logging.py
r"""リクエストロギングミドルウェア.

すべてのAPIリクエスト/レスポンスを自動的にログ記録。

【設計意図】リクエストロギングミドルウェアの設計判断:

1. なぜ全リクエストをログに記録するのか
   理由: 監査証跡とトラブルシューティング
   業務的背景:
   - 自動車部品商社: 受注・出荷・在庫調整の全操作を記録
   → 「いつ、誰が、何をしたか」の証跡が必要
   → 顧客からの問い合わせ対応（「注文したはずなのに記録がない」）
   法的要求:
   - 在庫管理の監査ログ（棚卸し時の証拠）
   - 受注処理の履歴（取引先との紛争時の証拠）
   メリット:
   - 全APIリクエストの記録
   → 問題発生時に時系列で操作を追跡可能

2. sensitive_headers のマスキング（L45-50, L161-176）
   理由: セキュリティとプライバシー保護
   マスキング対象:
   - authorization: 認証トークン（JWT等）
   - cookie: セッションID
   - x-api-key: APIキー
   - x-auth-token: 認証トークン
   問題:
   - ログに認証情報を平文で記録
   → ログ漏洩時に認証情報が盗まれる
   解決:
   - \"***MASKED***\" に置き換え
   → ログから認証情報を除外
   業務的意義:
   - GDPR/個人情報保護法への準拠
   - セキュリティ監査での指摘回避

3. log_request_body の条件付き記録（L33, L79-106）
   理由: 開発環境ではデバッグ、本番環境ではセキュリティ
   設計:
   - log_request_body=True（開発環境）:
     → リクエストボディを全て記録（デバッグ用）
   - log_request_body=False（本番環境）:
     → リクエストボディを記録しない（セキュリティ）
   main.py での設定（L190）:
   - log_request_body=settings.ENVIRONMENT != \"production\"
   → 本番環境では False、それ以外では True
   理由:
   - リクエストボディには機密情報が含まれる可能性
   → パスワード、クレジットカード番号等
   トレードオフ:
   - 本番環境: セキュリティ > デバッグ容易性
   - 開発環境: デバッグ容易性 > セキュリティ

4. max_body_length の制限（L34, L90-101）
   理由: ログファイル肥大化防止
   設計:
   - デフォルト: 1000バイト
   - 1000バイト超過: \"<body too large: XXX bytes>\" を記録
   問題:
   - 大量データのPOST（CSV一括登録等）
   → リクエストボディが数MB
   → ログファイルが急激に肥大化
   解決:
   - 最大1000バイトのみ記録
   → ログファイルサイズを一定範囲に制限
   業務的意義:
   - ディスク容量の節約
   - ログ検索の高速化（ファイルサイズが小さい）

5. リクエストボディの再読み取り可能化（L84-87）
   理由: FastAPIハンドラーでもボディを読み取れるようにする
   問題:
   - await request.body() を一度呼ぶと、ストリームが消費される
   → FastAPIハンドラーで再度読み取れない
   → バリデーションエラー発生
   解決:
   - request._receive を上書き
   → 同じボディを返すクロージャーを設定
   → ハンドラーで再度読み取り可能
   実装（L84-87）:
   ```python
   async def receive():
       return {\"type\": \"http.request\", \"body\": body_bytes}
   request._receive = receive
   ```
   重要性:
   - これがないと、ログミドルウェアでボディを読んだ後、
     FastAPIがPydanticバリデーションでエラーを出す

6. set_request_context() の設計（L72）
   理由: 構造化ログへのコンテキスト情報追加
   設定内容:
   - request_id: リクエストID（RequestIdMiddlewareで設定）
   - user_id: ユーザーID（認証後）
   - username: ユーザー名（認証後）
   用途:
   - app.core.logging の set_request_context()
   → スレッドローカル変数にコンテキスト保存
   → 全てのログに自動的にコンテキストを付与
   メリット:
   - 各ログ出力でリクエストIDを明示的に指定不要
   → logger.info(\"...\") だけで自動的にリクエストID付与
   業務的意義:
   - ユーザーごとの操作履歴を追跡
   → 「誰が」という情報が全ログに記録される

7. ログレベルの動的設定（L145, L178-192）
   理由: ステータスコードに応じた適切なログレベル
   ルール:
   - 500番台: ERROR（サーバー内部エラー）
   - 400番台: WARNING（クライアントエラー）
   - 200番台: INFO（正常）
   メリット:
   - エラーログの検索が容易
   → ログレベル ERROR で検索 = 真のサーバーエラーのみ
   - 400番台はクライアント側の問題なので WARNING
   → 開発者が対応すべきエラーと区別
   業務シナリオ:
   - 受注登録で 422 Unprocessable Entity
   → WARNING（入力ミス、ユーザー教育で対応）
   - 在庫更新で 500 Internal Server Error
   → ERROR（システム障害、即座に調査必要）

8. duration_ms の計測（L75, L144, L154）
   理由: レスポンスタイムの記録とパフォーマンス分析
   実装:
   - start_time = time.time() （開始時刻）
   - duration = time.time() - start_time （経過時間）
   - duration_ms = duration * 1000 （ミリ秒変換）
   用途:
   - 遅いエンドポイントの特定
   → duration_ms > 1000 のログを検索
   - パフォーマンス劣化の検出
   → 同じエンドポイントの duration_ms 推移を分析
   業務的意義:
   - 繁忙期のパフォーマンス監視
   - SLA（サービスレベル契約）の検証

9. 例外時のログ記録（L124-138）
   理由: エラー発生時の詳細情報記録
   記録内容:
   - error_type: 例外クラス名（ValueError等）
   - error_message: エラーメッセージ
   - duration_ms: エラー発生までの時間
   - exc_info=True: スタックトレース
   メリット:
   - エラーの根本原因を特定可能
   → スタックトレースで発生箇所を確認
   - エラー発生率の集計（error_type別）
   業務シナリオ:
   - \"InsufficientStockError\" が頻発
   → 在庫不足アラートの強化が必要

10. clear_request_context() の重要性（L141）
    理由: スレッドローカル変数のリーク防止
    問題:
    - set_request_context() でスレッドローカル変数に設定
    → リクエスト処理後にクリアしないと、次のリクエストで古い値が残る
    解決:
    - finally ブロックで clear_request_context()
    → 例外発生時も確実にクリア
    影響:
    - クリアしないと、次のリクエストのログに前のリクエストIDが混ざる
    → ログが不正確、トラブルシューティングが困難
"""

import json
import logging
import time
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.logging import clear_request_context, set_request_context


logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """リクエストロギングミドルウェア.

    すべてのAPIリクエストとレスポンスを構造化ログとして記録。
    """

    def __init__(
        self,
        app: ASGIApp,
        sensitive_headers: list[str] | None = None,
        log_request_body: bool = True,
        max_body_length: int = 1000,
    ):
        """初期化.

        Args:
            app: ASGIアプリケーション
            sensitive_headers: ログに記録しないヘッダー名のリスト
            log_request_body: リクエストボディをログに記録するか
            max_body_length: ログに記録するボディの最大長（バイト）
        """
        super().__init__(app)
        self.sensitive_headers = sensitive_headers or [
            "authorization",
            "cookie",
            "x-api-key",
            "x-auth-token",
        ]
        self.log_request_body = log_request_body
        self.max_body_length = max_body_length

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """リクエストを処理し、ログを記録.

        Args:
            request: HTTPリクエスト
            call_next: 次のミドルウェア/ハンドラ

        Returns:
            HTTPレスポンス
        """
        # リクエストIDを取得（RequestIdMiddlewareで設定済み）
        request_id = getattr(request.state, "request_id", None)

        # ユーザー情報を取得（認証ミドルウェアで設定される場合）
        user_id = getattr(request.state, "user_id", None)
        username = getattr(request.state, "username", None)

        # コンテキストを設定
        set_request_context(request_id=request_id, user_id=user_id, username=username)

        # リクエスト開始時刻
        start_time = time.time()

        # リクエストボディを読み取る（一度だけ）
        request_body = None
        if self.log_request_body and request.method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    # ボディを再度読み取れるようにする
                    async def receive():
                        return {"type": "http.request", "body": body_bytes}

                    request._receive = receive

                    # ボディをデコード（制限付き）
                    if len(body_bytes) <= self.max_body_length:
                        try:
                            request_body = body_bytes.decode("utf-8")
                            # JSONとしてパースを試みる
                            try:
                                request_body = json.loads(request_body)
                            except json.JSONDecodeError:
                                pass  # JSON以外の場合は文字列のまま
                        except UnicodeDecodeError:
                            request_body = "<binary data>"
                    else:
                        request_body = f"<body too large: {len(body_bytes)} bytes>"
            except Exception as e:
                logger.warning(
                    "Failed to read request body",
                    extra={"error": str(e)},
                )

        # リクエスト情報をログに記録
        logger.info(
            "Request started",
            extra={
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "headers": self._filter_headers(dict(request.headers)),
                "client_ip": request.client.host if request.client else None,
                "body": request_body,
            },
        )

        # リクエストを処理
        try:
            response = await call_next(request)
        except Exception as e:
            # エラー発生時のログ
            duration = time.time() - start_time
            logger.error(
                "Request failed with exception",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration * 1000, 2),
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                },
                exc_info=True,
            )
            raise
        finally:
            # コンテキストをクリア
            clear_request_context()

        # レスポンス情報をログに記録
        duration = time.time() - start_time
        log_level = self._get_log_level(response.status_code)

        logger.log(
            log_level,
            "Request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
                "response_headers": dict(response.headers),
            },
        )

        return response  # type: ignore[no-any-return]

    def _filter_headers(self, headers: dict[str, str]) -> dict[str, str]:
        """センシティブなヘッダーをフィルタリング.

        Args:
            headers: ヘッダー辞書

        Returns:
            フィルタリング済みヘッダー辞書
        """
        filtered = {}
        for key, value in headers.items():
            if key.lower() in self.sensitive_headers:
                filtered[key] = "***MASKED***"
            else:
                filtered[key] = value
        return filtered

    def _get_log_level(self, status_code: int) -> int:
        """ステータスコードに応じたログレベルを返す.

        Args:
            status_code: HTTPステータスコード

        Returns:
            ログレベル
        """
        if status_code >= 500:
            return logging.ERROR
        elif status_code >= 400:
            return logging.WARNING
        else:
            return logging.INFO
