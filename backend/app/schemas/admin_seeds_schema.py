# backend/app/schemas/admin_seeds.py
from __future__ import annotations

from pydantic import BaseModel, Field, conint


class SeedRequest(BaseModel):
    seed: int | None = Field(default=42, description="Random seed for reproducibility")
    dry_run: bool = Field(default=False)
    customers: conint(ge=0) = 10
    suppliers: conint(ge=0) = 5
    delivery_places: conint(ge=0) = 5
    products: conint(ge=0) = 20
    warehouses: conint(ge=0) = 3
    lots: conint(ge=0) = 80
    orders: conint(ge=0) = 25


class SeedSummary(BaseModel):
    """作成しようとした件数（UPSERT前）."""

    customers: int
    suppliers: int
    delivery_places: int
    products: int
    warehouses: int
    lots: int
    orders: int
    order_lines: int
    allocations: int


class ActualCounts(BaseModel):
    """実際のDB件数（投入後）."""

    customers: int
    suppliers: int
    delivery_places: int
    products: int
    warehouses: int
    lots: int
    stock_movements: int
    orders: int
    order_lines: int
    allocations: int


class SeedResponse(BaseModel):
    dry_run: bool
    seed: int
    summary: SeedSummary
    actual_counts: ActualCounts | None = Field(
        default=None, description="投入後の実際のDB件数（dry_run=falseの場合のみ）"
    )
