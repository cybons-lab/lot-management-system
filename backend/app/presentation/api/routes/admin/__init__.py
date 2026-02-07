"""Admin API routes subpackage."""

from app.presentation.api.routes.admin.admin_healthcheck_router import (
    router as admin_healthcheck_router,
)
from app.presentation.api.routes.admin.admin_router import router as admin_router
from app.presentation.api.routes.admin.batch_jobs_router import router as batch_jobs_router
from app.presentation.api.routes.admin.bulk_export_router import router as bulk_export_router
from app.presentation.api.routes.admin.business_rules_router import router as business_rules_router
from app.presentation.api.routes.admin.data_integrity_router import (
    router as data_integrity_router,
)
from app.presentation.api.routes.admin.demand_router import router as demand_router
from app.presentation.api.routes.admin.deploy_router import router as deploy_router
from app.presentation.api.routes.admin.health_router import router as health_router
from app.presentation.api.routes.admin.master_import_router import router as master_import_router
from app.presentation.api.routes.admin.operation_logs_router import router as operation_logs_router
from app.presentation.api.routes.admin.replenishment_router import router as replenishment_router
from app.presentation.api.routes.admin.roles_router import router as roles_router
from app.presentation.api.routes.admin.test_data import router as test_data_router
from app.presentation.api.routes.admin.users_router import router as users_router


__all__ = [
    "admin_healthcheck_router",
    "admin_router",
    "batch_jobs_router",
    "bulk_export_router",
    "business_rules_router",
    "data_integrity_router",
    "demand_router",
    "deploy_router",
    "health_router",
    "master_import_router",
    "operation_logs_router",
    "replenishment_router",
    "roles_router",
    "test_data_router",
    "users_router",
]
