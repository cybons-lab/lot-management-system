"""RPA routes."""

from .cloud_flow_router import router as cloud_flow_router
from .layer_code_router import router as layer_code_router
from .material_delivery_note_router import router as material_delivery_note_router
from .material_delivery_simple_router import router as material_delivery_simple_router
from .rpa_router import router as rpa_router
from .smartread_router import router as smartread_router


__all__ = [
    "rpa_router",
    "material_delivery_note_router",
    "material_delivery_simple_router",
    "cloud_flow_router",
    "layer_code_router",
    "smartread_router",
]
