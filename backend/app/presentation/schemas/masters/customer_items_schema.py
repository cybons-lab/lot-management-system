"""Customer items schemas (得意先品番マッピング)."""

from datetime import date, datetime

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class CustomerItemBase(BaseSchema):
    """Base schema for customer items."""

    customer_id: int = Field(..., description="得意先ID")
    customer_part_no: str = Field(..., max_length=100, description="先方品番")
    product_id: int = Field(..., description="製品ID")
    supplier_id: int | None = Field(None, description="仕入先ID")
    supplier_item_id: int | None = Field(None, description="仕入先品目ID")
    is_primary: bool = Field(False, description="仕入先品目ごとの代表フラグ")
    base_unit: str = Field(..., max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")
    shipping_document_template: str | None = Field(None, description="出荷表テンプレート")
    sap_notes: str | None = Field(None, description="SAP備考")
    # OCR→SAP変換用フィールド
    maker_part_no: str | None = Field(None, max_length=100, description="メーカー品番")
    order_category: str | None = Field(None, max_length=50, description="発注区分")
    is_procurement_required: bool = Field(True, description="発注の有無")
    shipping_slip_text: str | None = Field(None, description="出荷票テキスト")
    ocr_conversion_notes: str | None = Field(None, description="OCR変換用備考")
    # SAPキャッシュフィールド
    sap_supplier_code: str | None = Field(None, max_length=50, description="SAP仕入先コード")
    sap_warehouse_code: str | None = Field(None, max_length=50, description="SAP倉庫コード")
    sap_shipping_warehouse: str | None = Field(None, max_length=50, description="SAP出荷倉庫")
    sap_uom: str | None = Field(None, max_length=20, description="SAP単位")


class CustomerItemCreate(CustomerItemBase):
    """Schema for creating a customer item mapping."""

    pass


class CustomerItemUpdate(BaseSchema):
    """Schema for updating a customer item mapping."""

    product_id: int | None = Field(None, description="製品ID")
    supplier_id: int | None = Field(None, description="仕入先ID")
    supplier_item_id: int | None = Field(None, description="仕入先品目ID")
    is_primary: bool | None = Field(None, description="仕入先品目ごとの代表フラグ")
    base_unit: str | None = Field(None, max_length=20, description="基本単位")
    pack_unit: str | None = Field(None, max_length=20, description="梱包単位")
    pack_quantity: int | None = Field(None, description="梱包数量")
    special_instructions: str | None = Field(None, description="特記事項")
    shipping_document_template: str | None = Field(None, description="出荷表テンプレート")
    sap_notes: str | None = Field(None, description="SAP備考")
    # OCR→SAP変換用フィールド
    maker_part_no: str | None = Field(None, max_length=100, description="メーカー品番")
    order_category: str | None = Field(None, max_length=50, description="発注区分")
    is_procurement_required: bool | None = Field(None, description="発注の有無")
    shipping_slip_text: str | None = Field(None, description="出荷票テキスト")
    ocr_conversion_notes: str | None = Field(None, description="OCR変換用備考")
    # SAPキャッシュフィールド
    sap_supplier_code: str | None = Field(None, max_length=50, description="SAP仕入先コード")
    sap_warehouse_code: str | None = Field(None, max_length=50, description="SAP倉庫コード")
    sap_shipping_warehouse: str | None = Field(None, max_length=50, description="SAP出荷倉庫")
    sap_uom: str | None = Field(None, max_length=20, description="SAP単位")


class CustomerItemResponse(CustomerItemBase):
    """Schema for customer item response with enriched data."""

    id: int = Field(..., description="得意先品番ID")
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

    Upsert uses composite key: (customer_code, customer_part_no)
    """

    customer_code: str = Field(..., description="得意先コード")
    customer_part_no: str = Field(..., max_length=100, description="先方品番")
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
