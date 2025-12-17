"""RPA routes."""

from .material_delivery_note_router import router as material_delivery_note_router
from .rpa_router import router


__all__ = ["router", "material_delivery_note_router"]
