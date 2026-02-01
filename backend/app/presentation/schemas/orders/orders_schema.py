"""Order management Pydantic schemas (DDL v2.2 compliant).

All schemas strictly follow the DDL as the single source of truth.

Updated 2025-12-08: Added business key columns for order management:
- order_group_id: Reference to order_groups
- customer_order_no: Customer's 6-digit order number
- sap_order_no, sap_order_item_no: SAP business keys

Updated 2025-12-14: Changed allocations to reservations (P3 migration)
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


# ============================================================
# Order (受注ヘッダ)
# ============================================================


class OrderBase(BaseSchema):
    """Base order schema (DDL: orders)."""

    customer_id: int = Field(..., gt=0)
    order_date: date


class OrderCreate(OrderBase):
    """Create order request."""

    lines: list[OrderLineCreate] = Field(default_factory=list)


class OrderUpdate(BaseSchema):
    """Update order request."""


class OrderResponse(OrderBase):
    """Order response (DDL: orders)."""

    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    # OCR取込情報
    ocr_source_filename: str | None = Field(None, description="OCR取込元ファイル名")
    cancel_reason: str | None = Field(None, description="キャンセル・保留理由")

    # Optimistic Locking
    locked_by_user_id: int | None = Field(None, description="編集中のユーザーID")
    locked_by_user_name: str | None = Field(None, description="編集中のユーザー名")
    locked_at: datetime | None = Field(None, description="ロック取得日時")
    lock_expires_at: datetime | None = Field(None, description="ロック有効期限")


class OrderWithLinesResponse(OrderResponse):
    """Order with lines response."""

    lines: list[OrderLineResponse] = Field(
        default_factory=list, validation_alias="order_lines", serialization_alias="lines"
    )


# ============================================================
# Reservation (予約実績) - P3: Replaces Allocation
# ============================================================


class ReservationDetail(BaseSchema):
    """Reservation detail (DDL: lot_reservations)."""

    id: int
    lot_id: int
    source_type: str = Field(..., description="forecast | order | manual")
    source_id: int | None = None
    reserved_qty: Decimal = Field(..., decimal_places=3, description="予約数量")
    status: str = Field(..., description="temporary | active | confirmed | released")
    created_at: datetime | None = None
    updated_at: datetime | None = None
    confirmed_at: datetime | None = None

    # Flattened Lot Info (optional, populated by service)
    lot_number: str | None = None

    model_config = {"from_attributes": True}


# ============================================================
# OrderLine (受注明細)
# ============================================================


class OrderLineBase(BaseSchema):
    """Base order line schema (DDL: order_lines)."""

    product_group_id: int | None = Field(None, gt=0, description="製品ID（OCR取込時はNULL可）")
    delivery_date: date
    order_quantity: Decimal = Field(..., gt=0, decimal_places=3, description="受注数量")
    unit: str = Field(..., min_length=1, max_length=20)
    converted_quantity: Decimal | None = Field(
        None, decimal_places=3, description="社内基準単位換算数量"
    )
    delivery_place_id: int = Field(..., gt=0)
    order_type: str = Field(
        default="ORDER",
        pattern="^(FORECAST_LINKED|KANBAN|SPOT|ORDER)$",
        description="需要種別",
    )
    forecast_id: int | None = Field(None, gt=0, description="紐づく予測ID")
    status: str = Field(
        default="pending",
        pattern="^(pending|allocated|shipped|completed|cancelled|on_hold)$",
    )

    # OCR取込情報
    customer_part_no: str | None = Field(
        None, max_length=100, description="OCR元の先方品番（変換前の生データ）"
    )

    # 出荷表テキスト
    shipping_document_text: str | None = Field(None, description="出荷表用テキスト")
    forecast_reference: str | None = Field(None, max_length=100, description="予測参照情報")

    # 業務キー列
    order_group_id: int | None = Field(None, gt=0, description="受注グループID")
    customer_order_no: str | None = Field(
        None, max_length=6, description="得意先6桁受注番号（業務キー）"
    )
    customer_order_line_no: str | None = Field(None, max_length=10, description="得意先側行番号")
    sap_order_no: str | None = Field(None, max_length=20, description="SAP受注番号（業務キー）")
    sap_order_item_no: str | None = Field(None, max_length=6, description="SAP明細番号（業務キー）")


class OrderLineCreate(OrderLineBase):
    """Create order line request.

    Inherits all fields from OrderLineBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class OrderLineUpdate(BaseSchema):
    """Update order line request."""

    delivery_date: date | None = None
    order_quantity: Decimal | None = Field(None, gt=0, decimal_places=3)
    unit: str | None = Field(None, min_length=1, max_length=20)
    delivery_place_id: int | None = Field(None, gt=0)
    order_type: str | None = Field(None, pattern="^(FORECAST_LINKED|KANBAN|SPOT|ORDER)$")
    forecast_id: int | None = Field(None, gt=0)
    status: str | None = Field(
        None, pattern="^(pending|allocated|shipped|completed|cancelled|on_hold)$"
    )


class OrderLineResponse(OrderLineBase):
    """Order line response (DDL: order_lines)."""

    id: int
    order_id: int
    version: int = Field(1, description="楽観的ロック用バージョン")
    created_at: datetime
    updated_at: datetime

    # Flattened Order Info
    customer_id: int | None = None
    customer_name: str | None = None
    customer_code: str | None = None
    customer_valid_to: date | None = None
    order_date: date | None = None

    # Product Unit Info (flattened from product relationship)
    supplier_name: str | None = None
    product_internal_unit: str | None = None
    product_external_unit: str | None = None
    product_qty_per_internal_unit: float | None = None

    # Display Info (Populated by Service)
    product_code: str | None = None
    product_name: str | None = None
    delivery_place_name: str | None = None
    forecast_period: str | None = Field(None, description="予測期間（YYYY-MM）")

    # P3: Reservation Info (replaces allocations)
    # Note: reservations are populated separately due to property-based access
    reservations: list[ReservationDetail] = Field(default_factory=list)
    allocated_quantity: Decimal = Field(default=Decimal("0"), description="引当済数量")

    model_config = {"from_attributes": True}


# ============================================================
# Backward Compatibility Helpers
# ============================================================


class OrderLineOut(OrderLineResponse):
    """Deprecated: Use OrderLineResponse instead."""

    # For backward compatibility with existing code
    product_name: str | None = None
    allocated_qty: Decimal | None = Field(None, description="Deprecated: use allocated_quantity")


# Pydantic v2のforward reference解決
OrderCreate.model_rebuild()
OrderWithLinesResponse.model_rebuild()
