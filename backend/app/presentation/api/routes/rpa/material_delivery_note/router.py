"""Material Delivery Note router registration."""

from importlib import import_module

from fastapi import APIRouter


router = APIRouter(prefix="/rpa/material-delivery-note", tags=["rpa-material-delivery-note"])

for module_name in ("event_routes", "execute_routes", "item_routes", "run_routes", "step_routes"):
    import_module(f"{__package__}.{module_name}")
