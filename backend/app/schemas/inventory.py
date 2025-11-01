# backend/app/schemas/inventory.py
"""
在庫関連のPydanticスキーマ
"""

from datetime import date, datetime
from typing import Optional

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
    qc_certificate_status: Optional[str] = None
    qc_certificate_file: Optional[str] = None


class LotResponse(LotBase, TimestampMixin):
    id: int
    current_stock: Optional[float] = None  # 現在在庫数量
    product_name: Optional[str] = None  # <-- この行を追加


# --- StockMovement ---
class StockMovementBase(BaseSchema):
    lot_id: int
    movement_type: str  # receipt, allocate, ship, adjust, transfer_in, transfer_out
    quantity: float
    related_id: Optional[str] = None


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementResponse(StockMovementBase):
    id: int
    occurred_at: datetime


# --- LotCurrentStock ---
class LotCurrentStockResponse(BaseSchema):
    lot_id: int
    current_quantity: float
    last_updated: datetime


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
    lot_id: int
    quantity: float
    unit: Optional[str] = None
    notes: Optional[str] = None


class ReceiptLineCreate(ReceiptLineBase):
    pass


class ReceiptLineResponse(ReceiptLineBase):
    id: int
    header_id: int
    created_at: datetime


# --- Receipt (Header + Lines) ---
class ReceiptCreateRequest(BaseSchema):
    """入荷伝票作成リクエスト(ヘッダー+明細)"""

    receipt_no: str
    supplier_code: str
    warehouse_code: str
    receipt_date: date
    created_by: Optional[str] = None
    notes: Optional[str] = None
    lines: list[ReceiptLineCreate]


class ReceiptResponse(ReceiptHeaderResponse):
    """入荷伝票レスポンス"""

    lines: list[ReceiptLineResponse] = []


# --- ExpiryRule ---
class ExpiryRuleBase(BaseSchema):
    product_code: Optional[str] = None
    supplier_code: Optional[str] = None
    rule_type: str  # days_from_receipt, days_from_mfg, fixed_date
    days: Optional[int] = None
    fixed_date: Optional[date] = None
    is_active: int = 1
    priority: int


class ExpiryRuleCreate(ExpiryRuleBase):
    pass


class ExpiryRuleUpdate(BaseSchema):
    rule_type: Optional[str] = None
    days: Optional[int] = None
    fixed_date: Optional[date] = None
    is_active: Optional[int] = None
    priority: Optional[int] = None


class ExpiryRuleResponse(ExpiryRuleBase):
    id: int
