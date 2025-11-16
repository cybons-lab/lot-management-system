"""Allocations API routes subpackage."""

from app.api.routes.allocations.allocation_candidates_router import (
    router as allocation_candidates_router,
)
from app.api.routes.allocations.allocation_suggestions_router import (
    router as allocation_suggestions_router,
)
from app.api.routes.allocations.allocations_router import router as allocations_router
from app.api.routes.allocations.warehouse_alloc_router import (
    router as warehouse_alloc_router,
)


__all__ = [
    "allocation_candidates_router",
    "allocation_suggestions_router",
    "allocations_router",
    "warehouse_alloc_router",
]
