# backend/app/middleware/logging.py
"""
リクエストロギングミドルウェア.

すべてのAPIリクエスト/レスポンスを自動的にログ記録。
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

        return response

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
