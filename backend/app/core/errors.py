# backend/app/core/errors.py
"""
グローバル例外ハンドラ
ドメイン例外をHTTPレスポンスに変換（Problem+JSON準拠）.
"""

import logging
import traceback

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.domain.errors import DomainError, InsufficientStockError

# Order domain
from app.domain.order import (
    DuplicateOrderError,
    InvalidOrderStatusError,
    OrderDomainError,
    OrderNotFoundError,
    OrderValidationError,
    ProductNotFoundError,
)

# Lot domain
from app.domain.lot import (
    ExpiredLotError,
    InsufficientLotStockError,
    LotDatabaseError,
    LotDomainError,
    LotNotFoundError,
    LotProductNotFoundError,
    LotSupplierNotFoundError,
    LotValidationError,
    LotWarehouseNotFoundError,
)

# Allocation domain
from app.domain.allocation.exceptions import (
    AlreadyAllocatedError,
    ConflictError,
    InvalidTransitionError,
    NotFoundError as AllocationNotFoundError,
    ValidationError as AllocationValidationError,
)

# Warehouse & Forecast domain (combined file)
from app.domain.warehouse_and_forecast import (
    ForecastDomainError,
    ForecastNotFoundError,
    InvalidAllocationError,
    InvalidForecastError,
    WarehouseDomainError,
    WarehouseNotFoundError,
)


logger = logging.getLogger(__name__)


# ドメイン例外 → HTTPステータスコードのマッピング
# Note: より具体的な例外を先に定義（サブクラスが優先されるよう）
DOMAIN_EXCEPTION_MAP: dict[type[DomainError], int] = {
    # === Order Domain ===
    OrderNotFoundError: status.HTTP_404_NOT_FOUND,
    ProductNotFoundError: status.HTTP_404_NOT_FOUND,
    DuplicateOrderError: status.HTTP_409_CONFLICT,
    InvalidOrderStatusError: status.HTTP_400_BAD_REQUEST,
    OrderValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    OrderDomainError: status.HTTP_400_BAD_REQUEST,
    # === Lot Domain ===
    LotNotFoundError: status.HTTP_404_NOT_FOUND,
    LotProductNotFoundError: status.HTTP_404_NOT_FOUND,
    LotSupplierNotFoundError: status.HTTP_404_NOT_FOUND,
    LotWarehouseNotFoundError: status.HTTP_404_NOT_FOUND,
    InsufficientLotStockError: status.HTTP_400_BAD_REQUEST,
    ExpiredLotError: status.HTTP_400_BAD_REQUEST,
    LotValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    LotDatabaseError: status.HTTP_400_BAD_REQUEST,
    LotDomainError: status.HTTP_400_BAD_REQUEST,
    # === Allocation Domain ===
    AllocationNotFoundError: status.HTTP_404_NOT_FOUND,
    AlreadyAllocatedError: status.HTTP_409_CONFLICT,
    ConflictError: status.HTTP_409_CONFLICT,
    InvalidTransitionError: status.HTTP_400_BAD_REQUEST,
    AllocationValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    # === Warehouse Domain ===
    WarehouseNotFoundError: status.HTTP_404_NOT_FOUND,
    InvalidAllocationError: status.HTTP_400_BAD_REQUEST,
    WarehouseDomainError: status.HTTP_400_BAD_REQUEST,
    # === Forecast Domain ===
    ForecastNotFoundError: status.HTTP_404_NOT_FOUND,
    InvalidForecastError: status.HTTP_400_BAD_REQUEST,
    ForecastDomainError: status.HTTP_400_BAD_REQUEST,
    # === Common ===
    InsufficientStockError: status.HTTP_400_BAD_REQUEST,
    # === Base (fallback) ===
    DomainError: status.HTTP_400_BAD_REQUEST,
}


def _problem_json(title: str, status_code: int, detail: str, instance: str, **kwargs) -> dict:
    """
    Problem+JSON形式のレスポンスを生成.

    RFC 7807: https://tools.ietf.org/html/rfc7807
    """
    problem = {
        "type": "about:blank",
        "title": title,
        "status": status_code,
        "detail": detail,
        "instance": instance,
    }
    problem.update(kwargs)
    return problem


async def domain_exception_handler(request: Request, exc: DomainError) -> JSONResponse:
    """
    ドメイン例外をHTTPレスポンスに変換.

    Args:
        request: FastAPIリクエスト
        exc: 発生した例外

    Returns:
        JSONResponse（Problem+JSON形式）
    """
    # ドメイン例外のマッピングをチェック
    status_code = DOMAIN_EXCEPTION_MAP.get(type(exc))
    detail = getattr(exc, "message", str(exc))
    error_code = getattr(exc, "code", type(exc).__name__)

    if status_code is None:
        logger.warning(
            "Unhandled domain exception type; delegating to generic handler",
            extra={
                "exception_type": type(exc).__name__,
                "error_code": error_code,
                "detail": detail,
                "path": request.url.path,
                "method": request.method,
                "query_params": dict(request.query_params),
            },
        )
        return await generic_exception_handler(request, exc)

    # ドメイン例外の詳細ログ
    logger.warning(
        f"Domain exception: {type(exc).__name__}",
        extra={
            "exception_type": type(exc).__name__,
            "error_code": error_code,
            "detail": detail,
            "path": request.url.path,
            "method": request.method,
            "query_params": dict(request.query_params),
            "exception_details": getattr(exc, "details", None),
        },
    )

    # Problem+JSONレスポンスを構築
    problem = _problem_json(
        title=type(exc).__name__,
        status_code=status_code,
        detail=detail,
        instance=str(request.url.path),
    )

    # エラーコードを追加
    problem["error_code"] = error_code

    # 詳細情報がある場合は追加
    if hasattr(exc, "details") and exc.details:
        problem["details"] = exc.details

    return JSONResponse(status_code=status_code, content=problem)


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    HTTPExceptionをProblem+JSON形式に変換.

    Args:
        request: FastAPIリクエスト
        exc: HTTPException

    Returns:
        JSONResponse（Problem+JSON形式）
    """
    # HTTPエラーのログ記録
    log_level = logging.ERROR if exc.status_code >= 500 else logging.WARNING
    logger.log(
        log_level,
        f"HTTP exception: {exc.status_code}",
        extra={
            "status_code": exc.status_code,
            "detail": exc.detail,
            "path": request.url.path,
            "method": request.method,
            "query_params": dict(request.query_params),
        },
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=_problem_json(
            title="HTTP Error",
            status_code=exc.status_code,
            detail=exc.detail,
            instance=str(request.url.path),
        ),
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    バリデーションエラーをProblem+JSON形式に変換.

    Args:
        request: FastAPIリクエスト
        exc: RequestValidationError

    Returns:
        JSONResponse（Problem+JSON形式）
    """
    # exc.errors()をJSON化可能な形式に変換
    # Pydanticのエラーに含まれる例外オブジェクトを文字列化
    errors = []
    for error in exc.errors():
        error_dict = dict(error)
        # ctx内の例外オブジェクトを文字列化
        if "ctx" in error_dict and error_dict["ctx"]:
            ctx = error_dict["ctx"]
            for key, value in ctx.items():
                if isinstance(value, Exception):
                    ctx[key] = str(value)
            error_dict["ctx"] = ctx
        errors.append(error_dict)

    # バリデーションエラーの詳細ログ
    logger.warning(
        "Validation error",
        extra={
            "path": request.url.path,
            "method": request.method,
            "query_params": dict(request.query_params),
            "validation_errors": errors,
        },
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_problem_json(
            title="Validation Error",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="リクエストの検証に失敗しました",
            instance=str(request.url.path),
            errors=errors,
            error_code="VALIDATION_ERROR",
        ),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    予期しない例外をProblem+JSON形式に変換.

    Args:
        request: FastAPIリクエスト
        exc: Exception

    Returns:
        JSONResponse（Problem+JSON形式）
    """
    # リクエストボディを取得（可能な場合）
    request_body = None
    try:
        body_bytes = await request.body()
        if body_bytes:
            try:
                request_body = body_bytes.decode("utf-8")[:1000]  # 最初の1000文字のみ
            except UnicodeDecodeError:
                request_body = "<binary data>"
    except (RuntimeError, ValueError) as e:
        # Body already consumed or stream closed
        logger.debug(f"Failed to read request body: {e}")
        request_body = "<unavailable>"

    # 詳細なエラーログ
    logger.error(
        f"Unhandled exception: {type(exc).__name__}",
        extra={
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "path": request.url.path,
            "method": request.method,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "request_body": request_body,
            "traceback": traceback.format_exc(),
        },
        exc_info=True,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_problem_json(
            title="Internal Server Error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="サーバー内部でエラーが発生しました",
            instance=str(request.url.path),
            error_code="INTERNAL_SERVER_ERROR",
        ),
    )
