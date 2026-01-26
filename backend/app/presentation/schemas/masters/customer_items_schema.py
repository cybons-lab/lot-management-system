"""Customer items schemas (得意先品番マッピング).

Updated: サロゲートキー（id）ベースに移行
- external_product_code → customer_part_no にリネーム
- id (BIGSERIAL) を主キーに
- supplier_item_id, is_primary を追加
- OCR/SAP関連フィールドを削除（ShippingMasterに移行）
"""

from datetime import date, datetime

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class CustomerItemBase(BaseSchema):
    """Base schema for customer items."""

    customer_id: int = Field(..., description="得意先ID")
    customer_part_no: str = Field(..., max_length=100, description="得意先品番（先方品番）")
    product_id: int = Field(..., description="製品ID")
    supplier_id: int | None = Field(None, description="仕入先ID")
    supplier_item_id: int | None = Field(None, description="仕入先品目ID")
    is_primary: bool = Field(False, description="主要得意先フラグ")
    base_unit: str = Field(..., max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")


class CustomerItemCreate(CustomerItemBase):
    """Schema for creating a customer item mapping."""

    pass


class CustomerItemUpdate(BaseSchema):
    """Schema for updating a customer item mapping."""

    customer_part_no: str | None = Field(None, max_length=100, description="得意先品番")
    product_id: int | None = Field(None, description="製品ID")
    supplier_id: int | None = Field(None, description="仕入先ID")
    supplier_item_id: int | None = Field(None, description="仕入先品目ID")
    is_primary: bool | None = Field(None, description="主要得意先フラグ")
    base_unit: str | None = Field(None, max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")


class CustomerItemResponse(BaseSchema):
    """Schema for customer item response with enriched data."""

    id: int = Field(..., description="得意先品番マッピングID")
    customer_id: int = Field(..., description="得意先ID")
    customer_part_no: str = Field(..., description="得意先品番（先方品番）")
    product_id: int = Field(..., description="製品ID")
    supplier_id: int | None = Field(None, description="仕入先ID")
    supplier_item_id: int | None = Field(None, description="仕入先品目ID")
    is_primary: bool = Field(..., description="主要得意先フラグ")
    base_unit: str = Field(..., description="基本単位")
    pack_unit: str | None = Field(None, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")
    # Enriched from relationships
    customer_code: str = Field(..., description="得意先コード")
    customer_name: str = Field(..., description="得意先名")
    product_code: str = Field(..., description="製品コード(Maker Part Code)")
    product_name: str = Field(..., description="製品名")
    supplier_code: str | None = Field(None, description="仕入先コード")
    supplier_name: str | None = Field(None, description="仕入先名")
    created_at: datetime
    updated_at: datetime
    valid_to: date

    class Config:
        """Pydantic config."""

        from_attributes = True


class CustomerItemBulkRow(BaseSchema):
    """Single row for customer item bulk upsert.

    Upsert uses business key: (customer_code, customer_part_no)
    """

    customer_code: str = Field(..., description="得意先コード")
    customer_part_no: str = Field(..., max_length=100, description="得意先品番")
    product_code: str = Field(..., description="製品コード")
    supplier_code: str | None = Field(None, description="仕入先コード")
    base_unit: str = Field(..., max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")


class CustomerItemBulkUpsertRequest(BaseSchema):
    """Bulk upsert request for customer items."""

    rows: list[CustomerItemBulkRow] = Field(
        ..., min_length=1, description="List of customer item rows to upsert"
    )
