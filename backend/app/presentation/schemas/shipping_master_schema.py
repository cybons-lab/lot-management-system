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
    delivery_place_code: str | None = Field(default=None, max_length=50, description="納入先コード")
    delivery_place_name: str | None = Field(default=None, max_length=200, description="納入先")
    shipping_warehouse_code: str | None = Field(
        default=None, max_length=50, description="出荷倉庫コード"
    )
    shipping_warehouse_name: str | None = Field(
        default=None, max_length=100, description="出荷倉庫名"
    )
    shipping_slip_text: str | None = Field(default=None, description="出荷票テキスト")
    transport_lt_days: int | None = Field(default=None, ge=0, description="輸送LT(営業日)")
    has_order: bool = Field(default=False, description="発注の有無")
    remarks: str | None = Field(default=None, description="備考")


class ShippingMasterCuratedCreate(ShippingMasterCuratedBase):
    """出荷用マスタ新規作成リクエスト."""

    pass


class ShippingMasterCuratedUpdate(BaseModel):
    """出荷用マスタ更新リクエスト."""

    warehouse_code: str | None = None
    customer_name: str | None = None
    delivery_note_product_name: str | None = None
    customer_part_no: str | None = None
    maker_part_no: str | None = None
    maker_code: str | None = None
    maker_name: str | None = None
    supplier_code: str | None = None
    supplier_name: str | None = None
    delivery_place_code: str | None = None
    delivery_place_name: str | None = None
    shipping_warehouse_code: str | None = None
    shipping_warehouse_name: str | None = None
    shipping_slip_text: str | None = None
    transport_lt_days: int | None = None
    has_order: bool | None = None
    remarks: str | None = None
    expected_updated_at: datetime | None = Field(
        default=None, description="楽観的ロック用の期待される更新日時"
    )


class ShippingMasterCuratedResponse(ShippingMasterCuratedBase):
    """出荷用マスタレスポンス."""

    id: int
    raw_id: int | None = None
    has_duplicate_warning: bool = False
    created_at: datetime
    updated_at: datetime

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
