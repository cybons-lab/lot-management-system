"""Inventory-related Pydantic schemas aligned with the current database
schema.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import Field, computed_field

from app.presentation.schemas.common.base import BaseSchema, TimestampMixin


class LotStatus(str, Enum):
    """Valid lot lifecycle statuses."""

    ACTIVE = "active"
    DEPLETED = "depleted"
    EXPIRED = "expired"
    QUARANTINE = "quarantine"
    LOCKED = "locked"
    ARCHIVED = "archived"


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


class InventoryState(str, Enum):
    """在庫状態.

    - in_stock: 利用可能在庫あり
    - depleted_only: ロットはあるが利用可能0
    - no_lots: ロット0件
    """

    IN_STOCK = "in_stock"
    DEPLETED_ONLY = "depleted_only"
    NO_LOTS = "no_lots"


class LotLock(BaseSchema):
    """Payload for locking a lot."""

    reason: str | None = None
    quantity: Decimal | None = None


class LotBase(BaseSchema):
    """Shared attributes for lot payloads."""

    lot_number: str | None = None
    supplier_item_id: int = Field(
        ...,
        description="仕入先品目ID",
    )
    warehouse_id: int
    supplier_id: int | None = None
    expected_lot_id: int | None = None
    received_date: date
    expiry_date: date | None = None
    # Backward compatibility: current_quantity maps to received_quantity in input (Create),
    # but maps to remaining_quantity in output (Response).
    current_quantity: Decimal = Decimal("0")
    received_quantity: Decimal = Decimal("0")
    remaining_quantity: Decimal = Decimal("0")
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

    # Financial and Logistical details (Phase 1 Expansion)
    shipping_date: date | None = None
    cost_price: Decimal | None = None
    sales_price: Decimal | None = None
    tax_rate: Decimal | None = None

    # Phase 9: Remarks field
    remarks: str | None = None


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

    IMPORTANT: 数量フィールド(current_quantity, allocated_quantity)は含まない
    - 数量の変更は入出庫操作を通してのみ行う
    - stock_historyとの整合性を保つため
    """

    # Allow updating lot_number (for converting temporary to official)
    lot_number: str | None = None

    supplier_id: int | None = None
    expected_lot_id: int | None = None
    received_date: date | None = None
    expiry_date: date | None = None
    # current_quantity: Removed - use intake/withdrawal operations
    # allocated_quantity: Removed - managed by allocation system
    unit: str | None = None
    status: LotStatus | None = None

    # Inspection certificate fields (optional for updates)
    inspection_status: str | None = None
    inspection_date: date | None = None
    inspection_cert_number: str | None = None

    # Origin tracking fields (optional for updates)
    origin_type: LotOriginType | None = None
    origin_reference: str | None = None

    # Financial and Logistical details (Phase 1 Expansion)
    shipping_date: date | None = None
    cost_price: Decimal | None = None
    sales_price: Decimal | None = None
    tax_rate: Decimal | None = None

    # Phase 9: Remarks field
    remarks: str | None = None


class LotResponse(LotBase, TimestampMixin):
    """API response model for lots."""

    id: int = Field(serialization_alias="lot_id")

    # Joined fields from v_lot_details view (COALESCE ensures non-null for deleted masters)
    product_name: str | None = None
    product_code: str | None = None
    supplier_name: str | None = None
    supplier_code: str | None = None
    warehouse_name: str | None = None
    warehouse_code: str | None = None

    is_assigned_supplier: bool = False

    # Computed fields from view
    available_quantity: Decimal = Decimal("0")
    reserved_quantity_active: Decimal = Decimal("0")

    # Soft delete status
    product_deleted: bool = False
    warehouse_deleted: bool = False
    supplier_deleted: bool = False

    # Phase 2: Mapping fields
    maker_part_no: str | None = Field(None, serialization_alias="supplier_maker_part_no")
    customer_part_no: str | None = None
    supplier_item_id: int = Field(..., validation_alias="supplier_item_id")

    @property
    @computed_field
    def product_group_id(self) -> int:
        return self.supplier_item_id

    mapping_status: str | None = None


class LotListResponse(BaseSchema):
    """API response model for paginated list of lots."""

    items: list[LotResponse]
    total: int
    page: int
    size: int


class LotLabelRequest(BaseSchema):
    """Payload for requesting lot labels."""

    lot_ids: list[int]


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
    """Payload for recording adjustments.

    Inherits all fields from AdjustmentBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class AdjustmentResponse(AdjustmentBase):
    """API response model for adjustments."""

    id: int = Field(serialization_alias="adjustment_id")
    adjusted_at: datetime


class SuppliersSummary(BaseSchema):
    """製品×倉庫ビューで複数サプライヤーをまとめる場合の情報.

    Used when group_by='product_warehouse' and multiple suppliers exist
    for the same product/warehouse combination.
    """

    representative_supplier_id: int
    representative_supplier_code: str
    representative_supplier_name: str
    other_count: int = 0  # Number of additional suppliers


class InventoryItemResponse(BaseSchema):
    """API response model for inventory items (aggregated summary).

    This schema represents a calculated summary of inventory from the
    lots table, aggregated by product and warehouse (or supplier × product × warehouse).
    It does not map to a physical table.
    """

    id: int = Field(serialization_alias="inventory_item_id")
    supplier_item_id: int = Field(..., validation_alias="supplier_item_id")

    @property
    @computed_field
    def product_group_id(self) -> int:
        return self.supplier_item_id

    warehouse_id: int
    total_quantity: Decimal
    allocated_quantity: Decimal
    available_quantity: Decimal
    soft_allocated_quantity: Decimal = Decimal("0")
    hard_allocated_quantity: Decimal = Decimal("0")
    active_lot_count: int = 0
    last_updated: datetime | None = None
    inventory_state: InventoryState = InventoryState.NO_LOTS

    # Joined fields from master tables
    product_name: str | None = None
    product_code: str | None = None
    warehouse_name: str | None = None
    warehouse_code: str | None = None

    # Supplier fields (for supplier_product_warehouse grouping)
    supplier_id: int | None = None
    supplier_name: str | None = None
    supplier_code: str | None = None

    # Aggregated suppliers (for product_warehouse grouping with multiple suppliers)
    suppliers_summary: SuppliersSummary | None = None


# Backwards compatibility aliases so existing imports continue to work during
# the migration to the new schema naming.
StockMovementBase = StockHistoryBase
StockMovementCreate = StockHistoryCreate
StockMovementResponse = StockHistoryResponse
# LotCurrentStockResponse was an alias for InventoryItemResponse.
# This alias is deprecated and will be removed in a future version.
LotCurrentStockResponse = InventoryItemResponse
# This alias is deprecated and will be removed in a future version.


class InventoryListResponse(BaseSchema):
    """API response model for paginated list of inventory items."""

    items: list[InventoryItemResponse]
    total: int
    page: int
    size: int


class InventoryBySupplierResponse(BaseSchema):
    """Inventory aggregated by supplier."""

    supplier_id: int
    supplier_name: str
    supplier_code: str
    is_assigned_supplier: bool = False
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

    supplier_item_id: int = Field(
        ...,
        validation_alias="supplier_item_id",
        description="仕入先品目ID",
    )

    @property
    @computed_field
    def product_group_id(self) -> int:
        return self.supplier_item_id

    product_name: str
    product_code: str
    total_quantity: Decimal
    allocated_quantity: Decimal
    available_quantity: Decimal
    lot_count: int
    warehouse_count: int


class InventoryFilterOption(BaseSchema):
    """Filter option for dropdowns."""

    id: int
    code: str
    name: str


class InventoryFilterOptions(BaseSchema):
    """Available filter options for inventory."""

    products: list[InventoryFilterOption]
    suppliers: list[InventoryFilterOption]
    warehouses: list[InventoryFilterOption]
    effective_tab: str = Field(
        "all",
        description="Resolved tab after applying mode-specific coercion (e.g., stock mode).",
    )


class LotArchiveRequest(BaseSchema):
    """Request body for archiving a lot with confirmation.

    Requires lot_number for confirmation to prevent accidental archiving
    of lots with remaining inventory.
    """

    lot_number: str = Field(..., description="ロット番号（確認用）")
