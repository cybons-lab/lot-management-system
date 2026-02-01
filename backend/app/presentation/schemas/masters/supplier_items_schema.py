"""SupplierItem schemas (メーカー品番マスタ).

2コード体系における「メーカー品番」の実体。
仕入先から仕入れる品目の情報（品番、単位、リードタイムなど）を管理。
"""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.presentation.schemas.common.common_schema import ORMModel


class SupplierItemBase(BaseModel):
    """Shared supplier item fields."""

    supplier_id: int = Field(..., description="仕入先ID（必須）")
    maker_part_no: str = Field(..., max_length=100, description="メーカー品番（必須・SKUキー）")
    display_name: str = Field(..., max_length=200, description="製品名（必須）")
    base_unit: str = Field(..., max_length=20, description="基本単位（必須、例: EA, pcs, kg）")
    # Unit conversion fields
    internal_unit: str | None = Field(
        None, max_length=20, description="社内単位/引当単位（例: CAN）"
    )
    external_unit: str | None = Field(
        None, max_length=20, description="外部単位/表示単位（例: KG）"
    )
    qty_per_internal_unit: Decimal | None = Field(
        None, description="内部単位あたりの数量（例: 1 CAN = 20.0 KG）"
    )
    # Product attributes
    consumption_limit_days: int | None = Field(None, description="消費期限日数")
    requires_lot_number: bool = Field(True, description="ロット番号管理が必要")
    lead_time_days: int | None = Field(None, description="リードタイム（日）")
    notes: str | None = Field(None, description="備考")


class SupplierItemCreate(SupplierItemBase):
    """Payload to create a supplier item.

    Inherits all fields from SupplierItemBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class SupplierItemUpdate(BaseModel):
    """Payload to partially update a supplier item."""

    maker_part_no: str | None = Field(None, max_length=100, description="メーカー品番")
    display_name: str | None = Field(None, max_length=200, description="製品名")
    base_unit: str | None = Field(None, max_length=20, description="基本単位")
    internal_unit: str | None = Field(None, max_length=20, description="社内単位/引当単位")
    external_unit: str | None = Field(None, max_length=20, description="外部単位/表示単位")
    qty_per_internal_unit: Decimal | None = Field(None, description="内部単位あたりの数量")
    consumption_limit_days: int | None = Field(None, description="消費期限日数")
    requires_lot_number: bool | None = Field(None, description="ロット番号管理が必要")
    lead_time_days: int | None = Field(None, description="リードタイム（日）")
    notes: str | None = Field(None, description="備考")


class SupplierItemResponse(ORMModel):
    """Supplier item response model with enriched data."""

    id: int
    supplier_id: int
    maker_part_no: str
    display_name: str
    base_unit: str
    internal_unit: str | None
    external_unit: str | None
    qty_per_internal_unit: Decimal | None
    consumption_limit_days: int | None
    requires_lot_number: bool
    lead_time_days: int | None
    notes: str | None
    # Enriched from relationships
    supplier_code: str | None = Field(None, description="仕入先コード")
    supplier_name: str | None = Field(None, description="仕入先名")
    created_at: datetime
    updated_at: datetime
    valid_to: date


class SupplierItemListItem(BaseModel):
    """Supplier item list item (for API list response)."""

    id: int
    supplier_id: int
    maker_part_no: str
    display_name: str
    base_unit: str
    internal_unit: str | None = None
    external_unit: str | None = None
    qty_per_internal_unit: Decimal | None = None
    consumption_limit_days: int | None = None
    requires_lot_number: bool = True
    lead_time_days: int | None = None
    notes: str | None = None
    supplier_code: str | None = None
    supplier_name: str | None = None
    valid_to: date


# Backward compatibility aliases
ProductSupplierBase = SupplierItemBase
ProductSupplierCreate = SupplierItemCreate
ProductSupplierUpdate = SupplierItemUpdate
ProductSupplierResponse = SupplierItemResponse
