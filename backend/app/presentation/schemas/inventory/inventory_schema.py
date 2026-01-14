"""Inventory-related Pydantic schemas aligned with the current database
schema.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema, TimestampMixin


class LotStatus(str, Enum):
    """Valid lot lifecycle statuses."""

    ACTIVE = "active"
    DEPLETED = "depleted"
    EXPIRED = "expired"
    QUARANTINE = "quarantine"
    LOCKED = "locked"


class LotOriginType(str, Enum):
    """Valid lot origin types.

    - order: Inbound plan / order-linked lots (existing path)
    - forecast: Forecast-based production lots (future)
    - sample: Sample lots (adhoc UI)
    - safety_stock: Safety stock lots (adhoc UI)
    - adhoc: Other adhoc lots (adhoc UI)
    """

    ORDER = "order"
    FORECAST = "forecast"
    SAMPLE = "sample"
    SAFETY_STOCK = "safety_stock"
    ADHOC = "adhoc"


class LotLock(BaseSchema):
    """Payload for locking a lot."""

    reason: str | None = None
    quantity: Decimal | None = None


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
    locked_quantity: Decimal = Decimal("0")
    unit: str
    status: LotStatus = LotStatus.ACTIVE
    lock_reason: str | None = None

    # Inspection certificate fields
    inspection_status: str = "not_required"
    inspection_date: date | None = None
    inspection_cert_number: str | None = None

    # Origin tracking fields for non-order lots
    origin_type: LotOriginType = LotOriginType.ORDER
    origin_reference: str | None = None

    # Temporary lot registration support
    # 仮入庫時に付与されるUUID。正式ロット番号確定後も識別子として残る
    temporary_lot_key: str | None = None


class LotCreate(LotBase):
    """Payload for creating lots.

    仮入庫対応:
    - lot_number を空 or None で送信すると、サーバー側で TMP-YYYYMMDD-XXXX 形式の
      暫定ロット番号と temporary_lot_key (UUID) が自動採番される
    - 正式ロット番号が判明次第、update_lot で lot_number を更新可能
    """

    # lot_number is optional for temporary lot registration
    lot_number: str = ""  # Empty string triggers temporary lot generation

    # Optional fields for looking up IDs
    product_code: str | None = None
    supplier_code: str | None = None
    warehouse_code: str | None = None


class LotUpdate(BaseSchema):
    """Mutable fields for lot updates.

    仮入庫対応:
    - lot_number を更新して TMP-... から正式ロット番号に変更可能
    """

    # Allow updating lot_number (for converting temporary to official)
    lot_number: str | None = None

    supplier_id: int | None = None
    expected_lot_id: int | None = None
    received_date: date | None = None
    expiry_date: date | None = None
    current_quantity: Decimal | None = None
    allocated_quantity: Decimal | None = None
    unit: str | None = None
    status: LotStatus | None = None

    # Inspection certificate fields (optional for updates)
    inspection_status: str | None = None
    inspection_date: date | None = None
    inspection_cert_number: str | None = None

    # Origin tracking fields (optional for updates)
    origin_type: LotOriginType | None = None
    origin_reference: str | None = None


class LotResponse(LotBase, TimestampMixin):
    """API response model for lots."""

    id: int = Field(serialization_alias="lot_id")

    # Joined fields from v_lot_details view (COALESCE ensures non-null for deleted masters)
    product_name: str
    product_code: str
    supplier_name: str
    is_primary_supplier: bool = False

    # Optional joined fields
    warehouse_name: str | None = None
    warehouse_code: str | None = None
    supplier_code: str | None = None
    last_updated: datetime | None = None

    # User assignment fields
    primary_user_id: int | None = None
    primary_username: str | None = None
    primary_user_display_name: str | None = None

    # Soft-delete status flags for related masters
    product_deleted: bool = False
    warehouse_deleted: bool = False
    supplier_deleted: bool = False


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
    """API response model for inventory items (aggregated summary).

    This schema represents a calculated summary of inventory from the
    lots table, aggregated by product and warehouse. It does not map to
    a physical table.
    """

    id: int = Field(serialization_alias="inventory_item_id")
    product_id: int
    warehouse_id: int
    total_quantity: Decimal
    allocated_quantity: Decimal
    available_quantity: Decimal
    soft_allocated_quantity: Decimal = Decimal("0")
    hard_allocated_quantity: Decimal = Decimal("0")
    lot_count: int = 0
    last_updated: datetime

    # Joined fields from master tables
    product_name: str | None = None
    product_code: str | None = None
    warehouse_name: str | None = None
    warehouse_code: str | None = None


# Backwards compatibility aliases so existing imports continue to work during
# the migration to the new schema naming.
StockMovementBase = StockHistoryBase
StockMovementCreate = StockHistoryCreate
StockMovementResponse = StockHistoryResponse
# LotCurrentStockResponse was an alias for InventoryItemResponse.
# This alias is deprecated and will be removed in a future version.
LotCurrentStockResponse = InventoryItemResponse


class InventoryBySupplierResponse(BaseSchema):
    """Inventory aggregated by supplier."""

    supplier_id: int
    supplier_name: str
    supplier_code: str
    is_primary_supplier: bool = False
    total_quantity: Decimal
    lot_count: int
    product_count: int


class InventoryByWarehouseResponse(BaseSchema):
    """Inventory aggregated by warehouse."""

    warehouse_id: int
    warehouse_name: str
    warehouse_code: str
    total_quantity: Decimal
    lot_count: int
    product_count: int


class InventoryByProductResponse(BaseSchema):
    """Inventory aggregated by product (across all warehouses)."""

    product_id: int
    product_name: str
    product_code: str
    total_quantity: Decimal
    allocated_quantity: Decimal
    available_quantity: Decimal
    lot_count: int
    warehouse_count: int
