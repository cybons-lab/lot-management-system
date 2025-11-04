"""
FastAPI メインアプリケーション
ロット管理システム v2.0
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin_presets_router,
    admin_router,
    allocations_router,
    forecast_router,
    integration_router,
    lots_router,
    masters_router,
    orders_router,
    receipts_router,
    warehouse_alloc_router,
)
from app.core.config import settings
from app.core.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} を起動しています...")
    logger.info(f"📦 環境: {settings.ENVIRONMENT}")
    logger.info(f"💾 データベース: {settings.DATABASE_URL}")

    init_db()
    yield
    logger.info("👋 アプリケーションを終了しています...")


app = FastAPI(
    title="Lot Management API",
    openapi_url="/api/openapi.json",  # ← ここを明示
    docs_url="/api/docs",  # ← Swagger UI のパス
    redoc_url="/api/redoc",  # ← ReDoc のパス
    version=settings.APP_VERSION,
    description="材料ロット管理システム - バックエンドAPI",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(masters_router, prefix=settings.API_PREFIX)
app.include_router(lots_router, prefix=settings.API_PREFIX)
app.include_router(receipts_router, prefix=settings.API_PREFIX)
app.include_router(orders_router, prefix=settings.API_PREFIX)
app.include_router(integration_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)
app.include_router(admin_presets_router, prefix=settings.API_PREFIX)
app.include_router(forecast_router, prefix=settings.API_PREFIX)
app.include_router(warehouse_alloc_router, prefix=settings.API_PREFIX)
app.include_router(allocations_router, prefix=settings.API_PREFIX)


@app.get("/")
def root():
    """ルートエンドポイント"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "api_docs": f"{settings.API_PREFIX}/docs",
        "health": f"{settings.API_PREFIX}/admin/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
    )
