# backend/app/main.py
"""
FastAPI メインアプリケーション
ロット管理システム v2.0
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    admin_presets_router,
    admin_router,
    allocations_router,
    forecast_router,
    integration_router,
    lots_router,
    masters_router,
    orders_router,
    receipts_router,
    warehouse_alloc_router,  # 🔽 [追加]
)
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} を起動しています...")
    print(f"📦 環境: {settings.ENVIRONMENT}")
    print(f"💾 データベース: {settings.DATABASE_URL}")

    # データベース初期化
    init_db()

    yield

    # 終了時
    print("👋 アプリケーションを終了しています...")


# FastAPIアプリケーション作成
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="材料ロット管理システム - バックエンドAPI",
    lifespan=lifespan,
)

# CORS設定
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
app.include_router(warehouse_alloc_router, prefix=settings.API_PREFIX)  # 🔽 [追加]
app.include_router(allocations_router, prefix=settings.API_PREFIX)


# ルートエンドポイント
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
