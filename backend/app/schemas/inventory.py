# backend/app/schemas/inventory.py
"""
在庫関連のPydanticスキーマ
"""

from datetime import date, datetime
from typing import Optional

from pydantic import model_validator

from .base import BaseSchema, TimestampMixin


# --- Lot ---
class LotBase(BaseSchema):
    supplier_code: str
    product_code: str
    lot_number: str
    receipt_date: date
    mfg_date: Optional[date] = None
    expiry_date: Optional[date] = None
    warehouse_code: Optional[str] = None
    warehouse_id: Optional[int] = None
    lot_unit: Optional[str] = None
    kanban_class: Optional[str] = None
    sales_unit: Optional[str] = None
    inventory_unit: Optional[str] = None
    received_by: Optional[str] = None
    source_doc: Optional[str] = None
    qc_certificate_status: Optional[str] = None
    qc_certificate_file: Optional[str] = None


class LotCreate(LotBase):
    pass


class LotUpdate(BaseSchema):
    mfg_date: Optional[date] = None
    expiry_date: Optional[date] = None
    warehouse_code: Optional[str] = None
    warehouse_id: Optional[int] = None
    lot_unit: Optional[str] = None
    qc_certificate_status: Optional[str] = None
    qc_certificate_file: Optional[str] = None


class LotResponse(LotBase, TimestampMixin):
    id: int
    current_quantity: float = 0.0
    last_updated: Optional[datetime] = None
    product_name: Optional[str] = None


# --- StockMovement ---
class StockMovementBase(BaseSchema):
    product_id: str
    warehouse_id: Optional[int] = None
    lot_id: Optional[int] = None
    quantity_delta: float
    reason: str
    source_table: Optional[str] = None
    source_id: Optional[int] = None
    batch_id: Optional[str] = None
    created_by: str = "system"


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementResponse(StockMovementBase, TimestampMixin):
    id: int
    occurred_at: datetime


# --- LotCurrentStock ---
class LotCurrentStockResponse(BaseSchema):
    lot_id: int
    current_quantity: float
    last_updated: Optional[datetime] = None


# --- ReceiptHeader ---
class ReceiptHeaderBase(BaseSchema):
    receipt_no: str
    supplier_code: str
    warehouse_code: str
    receipt_date: date
    created_by: Optional[str] = None
    notes: Optional[str] = None


class ReceiptHeaderCreate(ReceiptHeaderBase):
    pass


class ReceiptHeaderResponse(ReceiptHeaderBase):
    id: int
    created_at: datetime


# --- ReceiptLine ---
class ReceiptLineBase(BaseSchema):
    line_no: int
    product_code: str
    lot_id: Optional[int] = None
    lot_number: Optional[str] = None
    quantity: float
    unit: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def _validate_lot_identifier(cls, data):
        lot_id = getattr(data, "lot_id", None)
        lot_number = getattr(data, "lot_number", None)
        if not lot_id and not lot_number:
            raise ValueError("lot_id または lot_number のいずれかが必須です")
        return data


class ReceiptLineCreate(ReceiptLineBase):
    pass


class ReceiptLineResponse(ReceiptLineBase):
    id: int
    receipt_id: int


# ===== ✅ ここを修正 =====
class ReceiptCreateRequest(ReceiptHeaderBase):
    """入荷伝票作成リクエスト(ヘッダー+明細)"""
    
    lines: list[ReceiptLineCreate]
# ========================


class ReceiptResponse(BaseSchema):
    """入荷伝票レスポンス"""

    header: ReceiptHeaderResponse
    lines: list[ReceiptLineResponse]


# --- ExpiryRule ---
class ExpiryRuleBase(BaseSchema):
    product_code: str
    shelf_life_days: int


class ExpiryRuleCreate(ExpiryRuleBase):
    pass


class ExpiryRuleUpdate(BaseSchema):
    shelf_life_days: int


class ExpiryRuleResponse(ExpiryRuleBase, TimestampMixin):
    id: int
