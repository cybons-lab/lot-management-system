# backend/app/schemas/inventory.py
"""在庫関連のPydanticスキーマ."""

from datetime import date, datetime

from .base import BaseSchema, TimestampMixin


# --- Lot ---
class LotBase(BaseSchema):
    supplier_code: str
    product_code: str
    lot_number: str
    receipt_date: date
    mfg_date: date | None = None
    expiry_date: date | None = None
    warehouse_code: str | None = None
    warehouse_id: int | None = None
    lot_unit: str | None = None
    kanban_class: str | None = None
    sales_unit: str | None = None
    inventory_unit: str | None = None
    received_by: str | None = None
    source_doc: str | None = None
    qc_certificate_status: str | None = None
    qc_certificate_file: str | None = None


class LotCreate(LotBase):
    pass


class LotUpdate(BaseSchema):
    mfg_date: date | None = None
    expiry_date: date | None = None
    warehouse_code: str | None = None
    warehouse_id: int | None = None
    lot_unit: str | None = None
    qc_certificate_status: str | None = None
    qc_certificate_file: str | None = None


class LotResponse(LotBase, TimestampMixin):
    id: int
    current_quantity: float = 0.0
    last_updated: datetime | None = None
    product_name: str | None = None


# --- StockMovement ---
class StockMovementBase(BaseSchema):
    product_id: str
    warehouse_id: int | None = None
    lot_id: int | None = None
    quantity_delta: float
    reason: str
    source_table: str | None = None
    source_id: int | None = None
    batch_id: str | None = None
    created_by: str = "system"


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementResponse(StockMovementBase, TimestampMixin):
    id: int
    occurred_at: datetime


# --- LotCurrentStock ---
class LotCurrentStockResponse(BaseSchema):
    lot_id: int
    current_quantity: float
    last_updated: datetime | None = None


# --- ExpiryRule ---
class ExpiryRuleBase(BaseSchema):
    product_code: str
    shelf_life_days: int


class ExpiryRuleCreate(ExpiryRuleBase):
    pass


class ExpiryRuleUpdate(BaseSchema):
    shelf_life_days: int


class ExpiryRuleResponse(ExpiryRuleBase, TimestampMixin):
    id: int
