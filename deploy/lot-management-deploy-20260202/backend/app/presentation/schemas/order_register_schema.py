"""受注登録結果スキーマ."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class OrderRegisterRowBase(BaseModel):
    """受注登録結果共通フィールド."""

    task_date: date = Field(..., description="タスク日付")
    # ロット割当
    lot_no_1: str | None = Field(default=None, description="ロット番号1")
    quantity_1: int | None = Field(default=None, description="数量1")
    lot_no_2: str | None = Field(default=None, description="ロット番号2")
    quantity_2: int | None = Field(default=None, description="数量2")
    # OCR由来
    inbound_no: str | None = Field(default=None, description="入庫No")
    shipping_date: date | None = Field(default=None, description="出荷日")
    delivery_date: date | None = Field(default=None, description="納期")
    delivery_quantity: int | None = Field(default=None, description="納入量")
    item_no: str | None = Field(default=None, description="アイテムNo")
    quantity_unit: str | None = Field(default=None, description="数量単位")
    # マスタ/OCR混在
    material_code: str | None = Field(default=None, description="材質コード")
    jiku_code: str | None = Field(default=None, description="次区")
    customer_part_no: str | None = Field(default=None, description="先方品番")
    maker_part_no: str | None = Field(default=None, description="メーカー品番")
    # マスタ由来
    source: str = Field(default="OCR", description="取得元")
    shipping_slip_text: str | None = Field(default=None, description="出荷票テキスト")
    customer_code: str | None = Field(default=None, description="得意先コード")
    customer_name: str | None = Field(default=None, description="得意先名")
    supplier_code: str | None = Field(default=None, description="仕入先コード")
    supplier_name: str | None = Field(default=None, description="仕入先名称")
    shipping_warehouse_code: str | None = Field(default=None, description="出荷倉庫コード")
    shipping_warehouse_name: str | None = Field(default=None, description="出荷倉庫名")
    delivery_place_code: str | None = Field(default=None, description="納入先コード")
    delivery_place_name: str | None = Field(default=None, description="納入先名")
    remarks: str | None = Field(default=None, description="備考")
    # ステータス
    status: str = Field(default="PENDING", description="ステータス")
    error_message: str | None = Field(default=None, description="エラーメッセージ")


class OrderRegisterRowResponse(OrderRegisterRowBase):
    """受注登録結果レスポンス."""

    id: int
    long_data_id: int | None = None
    curated_master_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderRegisterRowListResponse(BaseModel):
    """受注登録結果一覧レスポンス."""

    items: list[OrderRegisterRowResponse]
    total: int


class OrderRegisterGenerateRequest(BaseModel):
    """受注登録結果生成リクエスト."""

    task_date: date = Field(..., description="タスク日付")


class OrderRegisterGenerateResponse(BaseModel):
    """受注登録結果生成レスポンス."""

    success: bool
    generated_count: int
    warnings: list[str] = Field(default_factory=list)


class OrderRegisterLotAssignmentUpdate(BaseModel):
    """ロット割当更新リクエスト."""

    lot_no_1: str | None = None
    quantity_1: int | None = None
    lot_no_2: str | None = None
    quantity_2: int | None = None
