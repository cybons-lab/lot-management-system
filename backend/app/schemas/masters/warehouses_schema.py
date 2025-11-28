# backend/app/schemas/warehouses.py
from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common.base import ListResponse


class WarehouseOut(BaseModel):
    warehouse_id: int
    warehouse_name: str


# Use generic ListResponse instead of custom class
WarehouseListResponse = ListResponse[WarehouseOut]
