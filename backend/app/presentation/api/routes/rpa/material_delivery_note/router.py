"""Material Delivery Note router registration."""

from fastapi import APIRouter

router = APIRouter(prefix="/rpa/material-delivery-note", tags=["rpa-material-delivery-note"])

from . import event_routes, execute_routes, item_routes, run_routes, step_routes  # noqa: E402,F401
