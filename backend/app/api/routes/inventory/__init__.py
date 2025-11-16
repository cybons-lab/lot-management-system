"""Inventory API routes subpackage."""

from app.api.routes.inventory.adjustments_router import router as adjustments_router
from app.api.routes.inventory.inbound_plans_router import router as inbound_plans_router
from app.api.routes.inventory.inventory_items_router import router as inventory_items_router
from app.api.routes.inventory.lots_router import router as lots_router


__all__ = [
    "adjustments_router",
    "inbound_plans_router",
    "inventory_items_router",
    "lots_router",
]
