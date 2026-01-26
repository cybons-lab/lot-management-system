from fastapi import Request, status
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.application.services.system_config_service import ConfigKeys, SystemConfigService
from app.core.database import SessionLocal
from app.core.security import decode_access_token


class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        # Allow health checks and static files
        if request.url.path.startswith("/health") or request.url.path.startswith("/static"):
            return await call_next(request)

        # Allow login endpoints
        if "/auth/login" in request.url.path:
            return await call_next(request)

        # Allow admin system settings endpoints (to disable maintenance mode)
        # Note: This is crucial to prevent lockout
        if "/api/admin/system-settings" in request.url.path:
            return await call_next(request)

        # Allow API docs and public settings (Bypass Logic)
        if request.url.path in ["/docs", "/openapi.json", "/redoc"]:
            return await call_next(request)
        if request.url.path.startswith("/api/system/public-settings"):
            return await call_next(request)

        # Check maintenance mode
        # Note: Middleware runs before dependency injection, so we manually create a session
        db = SessionLocal()
        try:
            config_service = SystemConfigService(db)
            # Use run_in_threadpool to avoid blocking the async event loop with sync DB call
            is_maintenance = await run_in_threadpool(
                config_service.get_bool, ConfigKeys.MAINTENANCE_MODE
            )

            if is_maintenance:
                # Check if user is admin
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    try:
                        # Simple verification to get roles
                        payload = decode_access_token(token)
                        if payload:
                            roles = payload.get("roles", [])
                        if "admin" in roles:
                            return await call_next(request)
                    except Exception:
                        pass  # Invalid token, treat as guest

                # If we get here, maintenance mode is on and user is not admin
                return JSONResponse(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    content={"detail": "System is under maintenance. Please try again later."},
                    headers={"Retry-After": "300"},
                )

        finally:
            db.close()

        return await call_next(request)
