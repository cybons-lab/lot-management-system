# backend/app/schemas/warehouses.py
from __future__ import annotations

from pydantic import BaseModel


class WarehouseOut(BaseModel):
    warehouse_id: int
    warehouse_name: str


class WarehouseListResponse(BaseModel):
    items: list[WarehouseOut]
