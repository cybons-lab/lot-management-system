"""Customer Item Delivery Setting schema."""

from datetime import date, datetime

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class CustomerItemDeliverySettingBase(BaseSchema):
    """Base schema for CustomerItemDeliverySetting."""

    customer_item_id: int = Field(..., description="得意先品番マッピングID")
    delivery_place_id: int | None = Field(
        default=None, description="納入先ID（NULLの場合はデフォルト設定）"
    )
    jiku_code: str | None = Field(default=None, description="次区コード（NULLの場合は全次区共通）")
    shipment_text: str | None = Field(default=None, description="出荷表テキスト（SAP連携用）")
    packing_note: str | None = Field(default=None, description="梱包・注意書き")
    lead_time_days: int | None = Field(default=None, description="リードタイム（日）")
    is_default: bool = Field(default=False, description="デフォルト設定フラグ")
    notes: str | None = Field(default=None, description="Excel View ページ全体のメモ")
    valid_from: date | None = Field(default=None, description="有効開始日")
    valid_to: date | None = Field(default=None, description="有効終了日")


class CustomerItemDeliverySettingCreate(CustomerItemDeliverySettingBase):
    """Schema for creating a CustomerItemDeliverySetting."""

    # customer_id/customer_part_no are removed as inputs
    pass


class CustomerItemDeliverySettingUpdate(BaseSchema):
    """Schema for updating a CustomerItemDeliverySetting."""

    delivery_place_id: int | None = None
    jiku_code: str | None = None
    shipment_text: str | None = None
    packing_note: str | None = None
    lead_time_days: int | None = None
    is_default: bool | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    notes: str | None = None


class CustomerItemDeliverySettingResponse(CustomerItemDeliverySettingBase):
    """Response schema for CustomerItemDeliverySetting."""

    id: int
    created_at: datetime
    updated_at: datetime
    delivery_place_name: str | None = None

    class Config:
        """Pydantic config."""

        from_attributes = True


class ShipmentTextRequest(BaseSchema):
    """Request schema for getting shipment text."""

    # This might still use customer_id/supplier_item_id logic or need update?
    # Logic uses find_customer_part_no(customer_id, supplier_item_id)
    # Keeping as is for now as it seems to be a different look-up case (from OrderLine context?)
    customer_id: int
    supplier_item_id: int
    delivery_place_id: int | None = None
    jiku_code: str | None = None


class ShipmentTextResponse(BaseSchema):
    """Response schema for shipment text lookup."""

    shipment_text: str | None
    packing_note: str | None
    lead_time_days: int | None
    source: str = Field(description="データソース: 'delivery_setting' | 'customer_item' | 'none'")
