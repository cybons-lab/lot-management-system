"""Customer items schemas (得意先品番マッピング).

Updated: サロゲートキー（id）ベースに移行
- external_product_code → customer_part_no にリネーム
- id (BIGSERIAL) を主キーに
- supplier_item_id, is_primary を追加
- OCR/SAP関連フィールドを削除（ShippingMasterに移行）
"""

from datetime import date, datetime

from pydantic import Field, computed_field

from app.presentation.schemas.common.base import BaseSchema


class CustomerItemBase(BaseSchema):
    """Base schema for customer items.

    Phase1 update: supplier_item_id is now required (NOT NULL in DB).
    supplier_item_id is removed as customer_items now directly link to supplier_items.
    """

    customer_id: int = Field(..., description="得意先ID")
    customer_part_no: str = Field(..., max_length=100, description="得意先品番（先方品番）")
    supplier_item_id: int = Field(
        ...,
        validation_alias="supplier_item_id",
        description="仕入先品目ID (Phase1: required)",
    )
    base_unit: str = Field(..., max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")


class CustomerItemCreate(CustomerItemBase):
    """Schema for creating a customer item mapping.

    Inherits all fields from CustomerItemBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class CustomerItemUpdate(BaseSchema):
    """Schema for updating a customer item mapping."""

    customer_part_no: str | None = Field(None, max_length=100, description="得意先品番")
    supplier_item_id: int | None = Field(
        None,
        validation_alias="supplier_item_id",
        description="仕入先品目ID",
    )
    base_unit: str | None = Field(None, max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")


class CustomerItemResponse(BaseSchema):
    """Schema for customer item response with enriched data.

    Phase1: supplier_item_id is required, supplier_item_id removed.
    Enriched fields (maker_part_no, display_name) come from supplier_items.
    """

    id: int = Field(..., description="得意先品番マッピングID")
    customer_id: int = Field(..., description="得意先ID")
    customer_part_no: str = Field(..., description="得意先品番（先方品番）")
    supplier_item_id: int = Field(
        ...,
        validation_alias="supplier_item_id",
        description="仕入先品目ID (Phase1: required)",
    )

    @property
    @computed_field
    def product_group_id(self) -> int:
        return self.supplier_item_id

    base_unit: str = Field(..., description="基本単位")
    pack_unit: str | None = Field(None, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")
    # Enriched from relationships
    customer_code: str = Field(..., description="得意先コード")
    customer_name: str = Field(..., description="得意先名")
    maker_part_no: str = Field(..., description="メーカー品番 (from supplier_items)")
    display_name: str = Field(..., description="表示名 (from supplier_items)")
    supplier_id: int | None = Field(None, description="仕入先ID")
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
