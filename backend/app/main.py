# backend/app/main.py
"""FastAPI メインアプリケーション（グローバルハンドラ登録版）."""

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import (
    adjustments_router,
    admin_healthcheck_router,
    admin_router,
    alerts_router,
    allocation_candidates_router,
    allocation_suggestions_router,
    allocations_router,
    batch_jobs_router,
    business_rules_router,
    customer_items_router,
    customers_router,
    forecasts_router,
    health_router,
    inbound_plans_router,
    inventory_items_router,
    lots_router,
    operation_logs_router,
    orders_router,
    # orders_validate_router,  # Disabled: requires OrderValidation* schemas not in DDL v2.2
    products_router,
    roles_router,
    sap_router,
    suppliers_router,
    test_data_router,
    users_router,
    warehouse_alloc_router,
    warehouses_router,
)
from app.api.routes.assignments.assignment_router import router as assignment_router
from app.api.routes.auth_router import router as auth_router
from app.core import errors
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_json_logging
from app.domain.errors import DomainError
from app.middleware.request_id import RequestIdMiddleware
from app.services.auth.auth_service import AuthService


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
# Core endpoints
# Core endpoints
app.include_router(
    lots_router, prefix=settings.API_PREFIX
)
app.include_router(
    orders_router, prefix=settings.API_PREFIX
)
app.include_router(
    confirmed_lines_router, prefix=settings.API_PREFIX
)
app.include_router(
    allocations_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    allocation_candidates_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    allocation_suggestions_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    warehouse_alloc_router,
    prefix=settings.API_PREFIX,
)

# Forecast endpoints
app.include_router(
    forecasts_router,
    prefix=settings.API_PREFIX,
)

# Alert endpoints
app.include_router(
    alerts_router, prefix=settings.API_PREFIX
)

# Inventory endpoints
app.include_router(
    inbound_plans_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    adjustments_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    inventory_items_router,
    prefix=settings.API_PREFIX,
)

# Master data endpoints (direct access)
app.include_router(
    warehouses_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    suppliers_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    customers_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    products_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    customer_items_router,
    prefix=settings.API_PREFIX,
)

# User & Role management
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(
    users_router, prefix=settings.API_PREFIX
)
app.include_router(
    roles_router, prefix=settings.API_PREFIX
)
app.include_router(
    assignment_router,
    prefix=settings.API_PREFIX,
)

# Admin & system endpoints
app.include_router(
    admin_router, prefix=settings.API_PREFIX
)
app.include_router(admin_healthcheck_router, prefix=settings.API_PREFIX)
app.include_router(test_data_router, prefix=settings.API_PREFIX + "/admin/test-data")
app.include_router(health_router, prefix=settings.API_PREFIX)

# Operation logs, business rules, batch jobs
app.include_router(
    operation_logs_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    business_rules_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    batch_jobs_router,
    prefix=settings.API_PREFIX,
)

# Integration endpoints
app.include_router(
    sap_router, prefix=settings.API_PREFIX
)


@app.get("/")
def root():
    """ルートエンドポイント."""
    return {
        "message": "Lot Management API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
    }
