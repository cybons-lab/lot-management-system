# backend/app/main.py
"""FastAPI メインアプリケーション（グローバルハンドラ登録版）."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import (
    adjustments_router,
    admin_healthcheck_router,
    admin_router,
    admin_simulate_router,
    allocations_router,
    customer_items_router,
    customers_router,
    forecast_router,
    forecasts_router,
    health_router,
    inbound_plans_router,
    integration_router,
    inventory_items_router,
    lots_router,
    masters_router,
    orders_router,
    orders_validate_router,
    products_router,
    roles_router,
    suppliers_router,
    users_router,
    warehouse_alloc_router,
    warehouses_router,
)
from app.core import errors
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_json_logging
from app.domain.errors import DomainError
from app.middleware.request_id import RequestIdMiddleware


logger = logging.getLogger(__name__)
setup_json_logging()


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

# 【修正#1】グローバル例外ハンドラの登録（重要: 登録順序に注意）
# HTTP例外 → バリデーションエラー → ドメイン例外 → 汎用例外の順
app.add_exception_handler(StarletteHTTPException, errors.http_exception_handler)
app.add_exception_handler(RequestValidationError, errors.validation_exception_handler)
app.add_exception_handler(DomainError, errors.domain_exception_handler)
app.add_exception_handler(Exception, errors.generic_exception_handler)

# ミドルウェア登録
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(masters_router, prefix=settings.API_PREFIX)  # Legacy: /api/masters/*
app.include_router(lots_router, prefix=settings.API_PREFIX)
app.include_router(orders_router, prefix=settings.API_PREFIX)
app.include_router(allocations_router, prefix=settings.API_PREFIX)
app.include_router(integration_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)
app.include_router(admin_healthcheck_router, prefix=settings.API_PREFIX)
app.include_router(forecast_router, prefix=settings.API_PREFIX)  # Legacy
app.include_router(forecasts_router, prefix=settings.API_PREFIX)  # NEW: Phase 2-1
app.include_router(inbound_plans_router, prefix=settings.API_PREFIX)  # NEW: Phase 2-2
app.include_router(adjustments_router, prefix=settings.API_PREFIX)  # NEW: Phase 2-3
app.include_router(inventory_items_router, prefix=settings.API_PREFIX)  # NEW: Phase 2-3
app.include_router(customer_items_router, prefix=settings.API_PREFIX)  # NEW: Phase 3-1
app.include_router(users_router, prefix=settings.API_PREFIX)  # NEW: Phase 3-2
app.include_router(roles_router, prefix=settings.API_PREFIX)  # NEW: Phase 3-2
# Phase 3-3: Standalone master routers (simplified paths)
app.include_router(warehouses_router, prefix=settings.API_PREFIX)  # NEW: /api/warehouses
app.include_router(suppliers_router, prefix=settings.API_PREFIX)  # NEW: /api/suppliers
app.include_router(customers_router, prefix=settings.API_PREFIX)  # NEW: /api/customers
app.include_router(products_router, prefix=settings.API_PREFIX)  # NEW: /api/products
app.include_router(warehouse_alloc_router, prefix=settings.API_PREFIX)
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(orders_validate_router, prefix=settings.API_PREFIX)
app.include_router(
    admin_simulate_router, prefix=settings.API_PREFIX
)  # NEW: Simulation API with YAML profiles


@app.get("/")
def root():
    """ルートエンドポイント."""
    return {
        "message": "Lot Management API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
    }
