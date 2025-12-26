# backend/app/main.py
"""FastAPI メインアプリケーション.

責務:
- アプリケーションの初期化とライフサイクル管理
- 例外ハンドラの登録
- ミドルウェアの登録
- ルーターの登録（register_all_routers経由）
- ドメインイベントハンドラの登録
- 本番環境でのフロントエンド静的ファイル配信
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

# ドメインイベントハンドラを登録（インポート時に自動登録）
import app.domain.events.handlers  # noqa: F401
from app.core import errors
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging
from app.domain.errors import DomainError
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.metrics import MetricsMiddleware
from app.middleware.request_id import RequestIdMiddleware
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
    yield
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
# 実行順: CORS → Metrics → RequestLogging → RequestID
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
application.add_middleware(RequestIdMiddleware)

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

    @application.get("/{full_path:path}")
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
    @application.get("/")
    def root():
        """ルートエンドポイント（開発環境用）."""
        return {
            "message": "Lot Management API",
            "version": settings.APP_VERSION,
            "docs": "/api/docs",
        }


# For backward compatibility and testing
app: FastAPI = application  # type: ignore[assignment, no-redef]
