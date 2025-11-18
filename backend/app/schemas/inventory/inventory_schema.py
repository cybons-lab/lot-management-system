"""Inventory-related Pydantic schemas aligned with the current database schema."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import Field

from app.schemas.common.base import BaseSchema, TimestampMixin


class LotStatus(str, Enum):
    """Valid lot lifecycle statuses."""

    ACTIVE = "active"
    DEPLETED = "depleted"
    EXPIRED = "expired"
    QUARANTINE = "quarantine"


class LotBase(BaseSchema):
    """Shared attributes for lot payloads."""

    lot_number: str
    product_id: int
    warehouse_id: int
    supplier_id: int | None = None
    expected_lot_id: int | None = None
    received_date: date
    expiry_date: date | None = None
    current_quantity: Decimal = Decimal("0")
    allocated_quantity: Decimal = Decimal("0")
    unit: str
    status: LotStatus = LotStatus.ACTIVE


class LotCreate(LotBase):
    """Payload for creating lots."""

    pass


class LotUpdate(BaseSchema):
    """Mutable fields for lot updates."""

    supplier_id: int | None = None
    expected_lot_id: int | None = None
    received_date: date | None = None
    expiry_date: date | None = None
    current_quantity: Decimal | None = None
    allocated_quantity: Decimal | None = None
    unit: str | None = None
    status: LotStatus | None = None


class LotResponse(LotBase, TimestampMixin):
    """API response model for lots."""

    id: int = Field(serialization_alias="lot_id")

    # Joined fields from related tables (populated by router)
    product_name: str | None = None
    product_code: str | None = None
    warehouse_name: str | None = None
    warehouse_code: str | None = None
    supplier_name: str | None = None
    supplier_code: str | None = None
    last_updated: datetime | None = None


class StockTransactionType(str, Enum):
    """Transaction types tracked in stock history."""

    INBOUND = "inbound"
    ALLOCATION = "allocation"
    SHIPMENT = "shipment"
    ADJUSTMENT = "adjustment"
    RETURN = "return"


class StockHistoryBase(BaseSchema):
    """Shared attributes for stock history payloads."""

    lot_id: int
    transaction_type: StockTransactionType
    quantity_change: Decimal
    quantity_after: Decimal
    reference_type: str | None = None
    reference_id: int | None = None


class StockHistoryCreate(StockHistoryBase):
    """Payload for creating stock history records."""

    transaction_date: datetime | None = None


class StockHistoryResponse(StockHistoryBase):
    """API response model for stock history entries."""

    id: int = Field(serialization_alias="history_id")
    transaction_date: datetime


class AdjustmentType(str, Enum):
    """Allowed adjustment reason codes."""

    PHYSICAL_COUNT = "physical_count"
    DAMAGE = "damage"
    LOSS = "loss"
    FOUND = "found"
    OTHER = "other"


class AdjustmentBase(BaseSchema):
    """Shared fields for adjustments."""

    lot_id: int
    adjustment_type: AdjustmentType
    adjusted_quantity: Decimal
    reason: str
    adjusted_by: int


class AdjustmentCreate(AdjustmentBase):
    """Payload for recording adjustments."""

    pass


class AdjustmentResponse(AdjustmentBase):
    """API response model for adjustments."""

    id: int = Field(serialization_alias="adjustment_id")
    adjusted_at: datetime


class InventoryItemResponse(BaseSchema):
    """API response model for inventory summary rows (aggregated from lots).

    This schema represents aggregated inventory data from the lots table.
    It is not backed by a database table but computed on-demand.
    """

    id: int = Field(serialization_alias="inventory_item_id")
    product_id: int
    warehouse_id: int
    total_quantity: Decimal
    allocated_quantity: Decimal
    available_quantity: Decimal
    last_updated: datetime


# Backwards compatibility aliases so existing imports continue to work during
# the migration to the new schema naming.
StockMovementBase = StockHistoryBase
StockMovementCreate = StockHistoryCreate
StockMovementResponse = StockHistoryResponse
# LotCurrentStockResponse was an alias for InventoryItemResponse, which previously
# represented the inventory_items table. Now it represents aggregated data from lots.
# This alias is deprecated and will be removed in a future version.
LotCurrentStockResponse = InventoryItemResponse
