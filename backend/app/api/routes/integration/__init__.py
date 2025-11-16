"""Integration API routes subpackage."""

from app.api.routes.integration.integration_router import router as integration_router
from app.api.routes.integration.submissions_router import router as submissions_router


__all__ = [
    "integration_router",
    "submissions_router",
]
