"""Admin API routes subpackage."""

from app.api.routes.admin.admin_healthcheck_router import (
    router as admin_healthcheck_router,
)
from app.api.routes.admin.admin_router import router as admin_router
from app.api.routes.admin.admin_simulate_router import router as admin_simulate_router
from app.api.routes.admin.batch_jobs_router import router as batch_jobs_router
from app.api.routes.admin.business_rules_router import router as business_rules_router
from app.api.routes.admin.health_router import router as health_router
from app.api.routes.admin.operation_logs_router import router as operation_logs_router
from app.api.routes.admin.roles_router import router as roles_router
from app.api.routes.admin.users_router import router as users_router


__all__ = [
    "admin_healthcheck_router",
    "admin_router",
    "admin_simulate_router",
    "batch_jobs_router",
    "business_rules_router",
    "health_router",
    "operation_logs_router",
    "roles_router",
    "users_router",
]
