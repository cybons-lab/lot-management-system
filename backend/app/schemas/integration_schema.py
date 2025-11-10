# backend/app/schemas/integration.py
"""
連携関連のPydanticスキーマ
OCR取込、SAP連携.
"""

from datetime import datetime
from typing import Any

from .base import BaseSchema
from .orders import OrderLineCreate


# --- OCR Submission ---
class OcrOrderRecord(BaseSchema):
    """OCR受注レコード."""

    order_no: str
    customer_code: str
    order_date: str | None = None
    lines: list[OrderLineCreate]


class OcrSubmissionRequest(BaseSchema):
    """OCR取込リクエスト."""

    source: str = "PAD"  # PAD, API, etc.
    schema_version: str = "1.0.0"
    file_name: str | None = None
    operator: str | None = None
    records: list[OcrOrderRecord]


class OcrSubmissionResponse(BaseSchema):
    """OCR取込レスポンス."""

    status: str  # success, partial, failed
    submission_id: str
    created_orders: int
    created_lines: int
    total_records: int
    processed_records: int
    failed_records: int
    skipped_records: int
    error_details: str | None = None


# --- SAP Sync ---
class SapRegisterTarget(BaseSchema):
    """SAP送信対象指定."""

    type: str  # order_no, order_id, date_range
    value: Any  # 受注番号、ID、または日付範囲


class SapRegisterOptions(BaseSchema):
    """SAP送信オプション."""

    retry: int = 1
    timeout_sec: int = 30


class SapRegisterRequest(BaseSchema):
    """SAP送信リクエスト."""

    target: SapRegisterTarget
    options: SapRegisterOptions | None = SapRegisterOptions()


class SapRegisterResponse(BaseSchema):
    """SAP送信レスポンス."""

    status: str  # success, timeout, error
    sap_order_id: str | None = None
    sap_status: str | None = None
    sent: int
    error_message: str | None = None


class SapSyncLogResponse(BaseSchema):
    """SAP連携ログレスポンス."""

    id: int
    order_id: int | None = None
    payload: str | None = None
    result: str | None = None
    status: str
    executed_at: datetime
