"""Inventory API routes subpackage."""

from app.presentation.api.routes.inventory.adjustments_router import router as adjustments_router
from app.presentation.api.routes.inventory.inbound_plans_router import (
    router as inbound_plans_router,
)
from app.presentation.api.routes.inventory.lots_router import router as lots_router
from app.presentation.api.routes.inventory.withdrawals_router import (
    router as withdrawals_router,
)


__all__ = [
    "adjustments_router",
    "inbound_plans_router",
    "lots_router",
    "withdrawals_router",
]
