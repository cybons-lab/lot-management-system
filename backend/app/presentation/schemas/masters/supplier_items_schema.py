"""SupplierItem schemas (仕入先品目マスタ).

旧: product_suppliers_schema.py
"""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.presentation.schemas.common.common_schema import ORMModel


class SupplierItemBase(BaseModel):
    """Shared supplier item fields."""

    product_group_id: int | None = Field(
        None, description="製品ID（Phase2用グルーピング、オプション）"
    )
    supplier_id: int = Field(..., description="仕入先ID（必須）")
    maker_part_no: str = Field(..., max_length=100, description="メーカー品番（必須・SKUキー）")
    is_primary: bool = Field(False, description="主要仕入先フラグ")
    lead_time_days: int | None = Field(None, description="リードタイム（日）")
    display_name: str | None = Field(None, max_length=200, description="表示名")
    notes: str | None = Field(None, description="備考")


class SupplierItemCreate(SupplierItemBase):
    """Payload to create a supplier item."""

    pass


class SupplierItemUpdate(BaseModel):
    """Payload to partially update a supplier item."""

    maker_part_no: str | None = Field(None, max_length=100, description="メーカー品番")
    is_primary: bool | None = Field(None, description="主要仕入先フラグ")
    lead_time_days: int | None = Field(None, description="リードタイム（日）")
    display_name: str | None = Field(None, max_length=200, description="表示名")
    notes: str | None = Field(None, description="備考")


class SupplierItemResponse(ORMModel):
    """Supplier item response model with enriched data."""

    id: int
    product_group_id: int | None  # Phase1: オプション
    supplier_id: int
    maker_part_no: str
    is_primary: bool
    lead_time_days: int | None
    display_name: str | None
    notes: str | None
    # Enriched from relationships
    product_code: str | None = Field(None, description="製品コード")
    product_name: str | None = Field(None, description="製品名")
    supplier_code: str | None = Field(None, description="仕入先コード")
    supplier_name: str | None = Field(None, description="仕入先名")
    created_at: datetime
    updated_at: datetime
    valid_to: date


class SupplierItemListItem(BaseModel):
    """Supplier item list item (for API list response)."""

    id: int
    product_group_id: int | None  # Phase1: オプション
    supplier_id: int
    maker_part_no: str
    is_primary: bool
    lead_time_days: int | None
    display_name: str | None
    notes: str | None
    product_code: str | None = None
    product_name: str | None = None
    supplier_code: str | None = None
    supplier_name: str | None = None
    valid_to: date


# Backward compatibility aliases
ProductSupplierBase = SupplierItemBase
ProductSupplierCreate = SupplierItemCreate
ProductSupplierUpdate = SupplierItemUpdate
ProductSupplierResponse = SupplierItemResponse
