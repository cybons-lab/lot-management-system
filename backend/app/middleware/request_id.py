import uuid
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class RequestIdMiddleware(BaseHTTPMiddleware):
    """リクエストID管理ミドルウェア.

    各リクエストに一意のIDを割り当て、レスポンスヘッダーとリクエスト状態に保存。
    """

    def __init__(self, app: ASGIApp, header_name: str = "X-Request-ID"):
        """初期化.

        Args:
            app: ASGIアプリケーション
            header_name: リクエストIDを格納するヘッダー名
        """
        super().__init__(app)
        self.header_name = header_name

    async def dispatch(self, request, call_next: Callable):
        """リクエストIDを生成/取得し、レスポンスに付与.

        Args:
            request: HTTPリクエスト
            call_next: 次のミドルウェア/ハンドラ

        Returns:
            HTTPレスポンス
        """
        # リクエストIDを取得または生成
        req_id = request.headers.get(self.header_name) or str(uuid.uuid4())

        # リクエスト状態に保存（他のミドルウェアやハンドラで使用可能）
        request.state.request_id = req_id

        # リクエストを処理
        response = await call_next(request)

        # レスポンスヘッダーにリクエストIDを追加
        response.headers[self.header_name] = req_id

        return response
