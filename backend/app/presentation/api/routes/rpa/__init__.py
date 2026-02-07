"""RPA routes."""

from .cloud_flow_router import router as cloud_flow_router
from .layer_code_router import router as layer_code_router
from .material_delivery_note_router import router as material_delivery_note_router
from .material_delivery_simple_router import router as material_delivery_simple_router
from .rpa_router import router as rpa_router
from .sap_orders import router as sap_orders_router
from .smartread_admin_router import router as smartread_admin_router
from .smartread_router import router as smartread_router


__all__ = [
    "cloud_flow_router",
    "layer_code_router",
    "material_delivery_note_router",
    "material_delivery_simple_router",
    "rpa_router",
    "sap_orders_router",
    "smartread_admin_router",
    "smartread_router",
]
