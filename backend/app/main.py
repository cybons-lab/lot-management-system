# backend/app/main.py
"""FastAPI メインアプリケーション.

責務:
- アプリケーションの初期化とライフサイクル管理
- 例外ハンドラの登録
- ミドルウェアの登録
- ルーターの登録（register_all_routers経由）
- ドメインイベントハンドラの登録
- 本番環境でのフロントエンド静的ファイル配信

【設計意図】FastAPIアプリケーション構成の設計判断:

1. lifespan() でのライフサイクル管理（L41-50）
   理由: アプリケーション起動・終了時の処理を一元化
   動作:
   - yield 前: 起動時処理（DB初期化、ログ設定等）
   - yield: アプリケーション実行
   - yield 後: 終了時処理（クリーンアップ等）
   メリット:
   - リソースリークを防ぐ
   - 起動・終了ログで運用状況を追跡
   業務的意義:
   - 自動車部品商社の業務時間内のみ起動
   → 起動・終了ログで稼働時間を記録

2. 例外ハンドラの登録順序（L64-71）
   理由: より具体的な例外を先に登録
   登録順:
   1. StarletteHTTPException: HTTP例外（404, 401等）
   2. RequestValidationError: リクエストバリデーションエラー
   3. DomainError: ビジネスロジックエラー
   4. Exception: 汎用例外（キャッチオール）
   設計原則:
   - 具体的な例外 → 汎用的な例外
   → 特定のエラーを優先的に処理
   メリット:
   - DomainError は Problem+JSON形式で返す
   - HTTPExceptionは標準形式で返す
   → エラーの種類に応じた適切なレスポンス

3. ミドルウェアの登録順序（L73-91）
   理由: add_middleware() は逆順で実行される
   登録順: CORS → Metrics → RequestLogging → RequestID
   実行順: RequestID → RequestLogging → Metrics → CORS

   実行順の意味:
   - RequestID: 最初にリクエストIDを生成
   → 全てのログにリクエストIDを付与
   - RequestLogging: リクエスト/レスポンスのログ記録
   → リクエストIDを含むログを出力
   - Metrics: パフォーマンスメトリクスを記録
   → リクエスト処理時間、エラー率等
   - CORS: 最後にCORSヘッダーを追加
   → 他のミドルウェアがレスポンスを変更した後

   業務的意義:
   - 営業部門が顧客対応中にエラー発生
   → リクエストIDでログを検索し、原因を特定

4. ドメインイベントハンドラの自動登録（L24-25）
   理由: インポート時に自動的にハンドラーを登録
   動作:
   - import app.domain.events.handlers
   → handlers モジュール内の @subscribe デコレータが実行
   → イベントディスパッチャーにハンドラーが登録される
   メリット:
   - 明示的な登録コード不要
   - ハンドラー追加時に main.py を変更不要
   → 疎結合、拡張性向上

5. フロントエンド静的ファイル配信の設計（L98-144）
   理由: 本番環境ではバックエンドとフロントエンドを統合配信
   条件分岐:
   - frontend/dist 存在: 静的ファイル配信モード
   - frontend/dist 不在: 開発モード（Vite dev server使用）

   静的ファイル配信モード（L105-133）:
   - /assets: JS/CSS等のアセット
   - /static: その他の静的ファイル
   - /{full_path:path}: SPAフォールバック
   → 未知のパスは index.html を返す

   SPAフォールバックの重要性:
   - React Router等のクライアントサイドルーティングに対応
   - 例: /allocations へのアクセス
   → バックエンドに /allocations エンドポイントがなくても、
   index.html を返し、React Router が処理

   APIパスの除外（L120-121）:
   - /api/* はSPAフォールバックから除外
   → API リクエストは404を返す（正常な動作）

6. openapi_url, docs_url, redoc_url の設計（L55-57）
   理由: APIドキュメントを /api 配下に配置
   URL:
   - /api/openapi.json: OpenAPI仕様書
   - /api/docs: Swagger UI（開発者用）
   - /api/redoc: ReDoc（ドキュメント重視）
   業務的意義:
   - フロントエンド開発者がAPIドキュメントを参照
   - 新規エンドポイント追加時の仕様確認

7. なぜ backward compatibility alias を定義するのか（L148）
   理由: 既存のテストコードとの互換性維持
   設計:
   - app: FastAPI = application
   → 既存コードが app をインポートしていても動作
   将来的な削除計画:
   - 全てのコードを application に統一
   - この行を削除
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

# ドメインイベントハンドラを登録（インポート時に自動登録）
import app.domain.events.handlers  # noqa: F401
from app.application.services.smartread.auto_sync_runner import SmartReadAutoSyncRunner
from app.core import errors
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging
from app.domain.errors import DomainError
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.metrics import MetricsMiddleware
from app.presentation.api.routes import register_all_routers


logger = logging.getLogger(__name__)
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理."""
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} を起動しています...")
    logger.info(f"📦 環境: {settings.ENVIRONMENT}")
    logger.info(f"💾 データベース: {settings.DATABASE_URL}")

    init_db()
    auto_sync_runner = None
    if settings.SMARTREAD_AUTO_SYNC_ENABLED:
        auto_sync_runner = SmartReadAutoSyncRunner()
        auto_sync_runner.start()
        app.state.smartread_auto_sync = auto_sync_runner
    yield
    if auto_sync_runner:
        await auto_sync_runner.stop()
    logger.info("👋 アプリケーションを終了しています...")


application = FastAPI(
    title="Lot Management API",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    version=settings.APP_VERSION,
    description="材料ロット管理システム - バックエンドAPI",
    lifespan=lifespan,
)

# ========================================
# 例外ハンドラ登録
# ========================================
# 登録順序: HTTP例外 → バリデーションエラー → ドメイン例外 → 汎用例外
# Note: type: ignore is needed due to FastAPI/Starlette type signature mismatch
application.add_exception_handler(StarletteHTTPException, errors.http_exception_handler)  # type: ignore[arg-type]
application.add_exception_handler(RequestValidationError, errors.validation_exception_handler)  # type: ignore[arg-type]
application.add_exception_handler(DomainError, errors.domain_exception_handler)  # type: ignore[arg-type]
application.add_exception_handler(Exception, errors.generic_exception_handler)

# ========================================
# ミドルウェア登録
# ========================================
# 注: add_middlewareは逆順で実行される
# 実行順: CORS → Metrics → RequestLogging → CorrelationId
application.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
application.add_middleware(MetricsMiddleware)
application.add_middleware(
    RequestLoggingMiddleware,
    sensitive_headers=settings.LOG_SENSITIVE_FIELDS,
    log_request_body=settings.ENVIRONMENT != "production",
)
application.add_middleware(
    CorrelationIdMiddleware,
    header_name="X-Request-ID",
    update_request_header=True,
)

# ========================================
# ルーター登録
# ========================================
register_all_routers(application)

# ========================================
# フロントエンド静的ファイル配信（本番環境用）
# ========================================
# frontend/dist が存在する場合、静的ファイルを配信
# 開発環境では Vite dev server を使用するため、この設定は無効
FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists() and FRONTEND_DIST.is_dir():
    logger.info(f"📂 フロントエンド静的ファイルを配信: {FRONTEND_DIST}")

    # アセットファイル（JS, CSS, images）を配信
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        application.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # index.html 以外の静的ファイル
    application.mount("/static", StaticFiles(directory=str(FRONTEND_DIST)), name="static")

    @application.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """SPA フォールバック: 未知のパスは index.html を返す."""
        # API パスは除外（既にルーター登録済み）
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}

        # ファイルが存在すればそのまま返す
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # それ以外は index.html を返す（SPA ルーティング対応）
        index_path = FRONTEND_DIST / "index.html"
        if index_path.exists():
            return FileResponse(index_path)

        return {"detail": "Not Found"}

else:
    # 開発環境: シンプルなルートエンドポイント
    @application.get("/", include_in_schema=False)
    def root():
        """ルートエンドポイント（開発環境用）."""
        return {
            "message": "Lot Management API",
            "version": settings.APP_VERSION,
            "docs": "/api/docs",
        }


# For backward compatibility and testing
app: FastAPI = application  # type: ignore[assignment, no-redef]
