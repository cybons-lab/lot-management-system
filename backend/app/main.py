# backend/app/main.py
"""FastAPI メインアプリケーション.

責務:
- アプリケーションの初期化とライフサイクル管理
- 例外ハンドラの登録
- ミドルウェアの登録
- ルーターの登録（register_all_routers経由）
- ドメインイベントハンドラの登録
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
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


app = FastAPI(
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
app.add_exception_handler(StarletteHTTPException, errors.http_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, errors.validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(DomainError, errors.domain_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, errors.generic_exception_handler)

# ========================================
# ミドルウェア登録
# ========================================
# 注: add_middlewareは逆順で実行される
# 実行順: CORS → Metrics → RequestLogging → RequestID
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(MetricsMiddleware)
app.add_middleware(
    RequestLoggingMiddleware,
    sensitive_headers=settings.LOG_SENSITIVE_FIELDS,
    log_request_body=settings.ENVIRONMENT != "production",
)
app.add_middleware(RequestIdMiddleware)

# ========================================
# ルーター登録
# ========================================
register_all_routers(app)


@app.get("/")
def root():
    """ルートエンドポイント."""
    return {
        "message": "Lot Management API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
    }
