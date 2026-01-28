"""SupplierItem schemas (仕入先品目マスタ).

旧: product_suppliers_schema.py
"""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.presentation.schemas.common.common_schema import ORMModel


class SupplierItemBase(BaseModel):
    """Shared supplier item fields."""

    supplier_id: int = Field(..., description="仕入先ID（必須）")
    maker_part_no: str = Field(..., max_length=100, description="メーカー品番（必須・SKUキー）")
    display_name: str = Field(..., max_length=200, description="製品名（必須）")
    base_unit: str = Field(..., max_length=20, description="基本単位（必須、例: EA, pcs, kg）")
    lead_time_days: int | None = Field(None, description="リードタイム（日）")
    notes: str | None = Field(None, description="備考")


class SupplierItemCreate(SupplierItemBase):
    """Payload to create a supplier item."""

    pass


class SupplierItemUpdate(BaseModel):
    """Payload to partially update a supplier item."""

    maker_part_no: str | None = Field(None, max_length=100, description="メーカー品番")
    display_name: str | None = Field(None, max_length=200, description="製品名")
    base_unit: str | None = Field(None, max_length=20, description="基本単位")
    lead_time_days: int | None = Field(None, description="リードタイム（日）")
    notes: str | None = Field(None, description="備考")


class SupplierItemResponse(ORMModel):
    """Supplier item response model with enriched data."""

    id: int
    supplier_id: int
    maker_part_no: str
    display_name: str
    base_unit: str
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
    lead_time_days: int | None
    notes: str | None
    supplier_code: str | None = None
    supplier_name: str | None = None
    valid_to: date


# Backward compatibility aliases
ProductSupplierBase = SupplierItemBase
ProductSupplierCreate = SupplierItemCreate
ProductSupplierUpdate = SupplierItemUpdate
ProductSupplierResponse = SupplierItemResponse
