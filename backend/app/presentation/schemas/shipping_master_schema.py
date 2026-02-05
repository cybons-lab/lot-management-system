"""出荷用マスタデータ スキーマ."""

from datetime import datetime

from pydantic import BaseModel, Field


# ==================== Curated (整形済み) ====================


class ShippingMasterCuratedBase(BaseModel):
    """出荷用マスタ共通フィールド."""

    customer_code: str = Field(..., max_length=50, description="得意先コード")
    material_code: str = Field(..., max_length=50, description="材質コード")
    jiku_code: str = Field(..., max_length=50, description="次区（出荷先区分）")
    warehouse_code: str | None = Field(default=None, max_length=50, description="倉庫コード")
    customer_name: str | None = Field(default=None, max_length=100, description="得意先名")
    delivery_note_product_name: str | None = Field(default=None, description="素材納品書記載製品名")
    customer_part_no: str | None = Field(default=None, max_length=100, description="先方品番")
    maker_part_no: str | None = Field(default=None, max_length=100, description="メーカー品番")
    maker_code: str | None = Field(default=None, max_length=50, description="メーカーコード")
    maker_name: str | None = Field(default=None, max_length=100, description="メーカー名")
    supplier_code: str | None = Field(default=None, max_length=50, description="仕入先コード")
    supplier_name: str | None = Field(default=None, max_length=100, description="仕入先名称")
    staff_name: str | None = Field(default=None, max_length=100, description="担当者名")
    delivery_place_code: str | None = Field(default=None, max_length=50, description="納入先コード")
    delivery_place_name: str | None = Field(default=None, max_length=200, description="納入先")
    delivery_place_abbr: str | None = Field(default=None, max_length=100, description="納入先略称")
    shipping_warehouse: str | None = Field(default=None, max_length=100, description="出荷倉庫名")
    shipping_slip_text: str | None = Field(default=None, description="出荷票テキスト")
    transport_lt_days: int | None = Field(default=None, ge=0, description="輸送LT(営業日)")
    order_flag: str | None = Field(default=None, max_length=50, description="発注区分")
    order_existence: str | None = Field(default=None, max_length=20, description="発注の有無")
    has_order: bool = Field(default=False, description="アプリ発注対象フラグ")
    remarks: str | None = Field(default=None, description="備考")


class ShippingMasterCuratedCreate(ShippingMasterCuratedBase):
    """出荷用マスタ新規作成リクエスト.

    Inherits all fields from ShippingMasterCuratedBase without additional fields.
    Exists for type distinction and API schema generation.
    """

    pass


class ShippingMasterCuratedUpdate(BaseModel):
    """出荷用マスタ更新リクエスト."""

    version: int = Field(..., description="楽観的ロック用バージョン")
    warehouse_code: str | None = None
    customer_name: str | None = None
    delivery_note_product_name: str | None = None
    customer_part_no: str | None = None
    maker_part_no: str | None = None
    maker_code: str | None = None
    maker_name: str | None = None
    supplier_code: str | None = None
    supplier_name: str | None = None
    staff_name: str | None = None
    delivery_place_code: str | None = None
    delivery_place_name: str | None = None
    delivery_place_abbr: str | None = None
    shipping_warehouse: str | None = None
    shipping_slip_text: str | None = None
    transport_lt_days: int | None = None
    order_flag: str | None = None
    order_existence: str | None = None
    has_order: bool | None = None
    remarks: str | None = None


class ShippingMasterCuratedResponse(ShippingMasterCuratedBase):
    """出荷用マスタレスポンス."""

    id: int
    raw_id: int | None = None
    has_duplicate_warning: bool = False
    created_at: datetime
    updated_at: datetime
    version: int

    model_config = {"from_attributes": True}


class ShippingMasterCuratedListResponse(BaseModel):
    """出荷用マスタ一覧レスポンス."""

    items: list[ShippingMasterCuratedResponse]
    total: int


# ==================== Import ====================


class ShippingMasterImportRequest(BaseModel):
    """Excelインポートリクエスト（JSON形式でデータを受け取る場合）."""

    rows: list[dict] = Field(..., description="インポートするデータ行")


class ShippingMasterImportResponse(BaseModel):
    """インポートレスポンス."""

    success: bool
    imported_count: int
    curated_count: int
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
