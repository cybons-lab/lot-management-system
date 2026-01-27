"""Intake history-related Pydantic schemas.

入庫履歴のリクエスト・レスポンススキーマ。
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class IntakeHistoryResponse(BaseSchema):
    """入庫履歴レスポンス."""

    id: int = Field(..., serialization_alias="intake_id")
    lot_id: int
    lot_number: str
    product_group_id: int
    product_name: str
    product_code: str
    supplier_id: int | None = None
    supplier_name: str | None = None
    supplier_code: str | None = None
    warehouse_id: int
    warehouse_name: str
    warehouse_code: str | None = None
    quantity: Decimal = Field(..., description="入庫数量")
    received_date: date = Field(..., description="入庫日")
    expiry_date: date | None = Field(None, description="有効期限")
    inbound_plan_number: str | None = Field(None, description="入庫計画番号")
    sap_po_number: str | None = Field(None, description="SAP購買注文番号")
    transaction_date: datetime = Field(..., description="トランザクション日時")
    created_at: datetime


class IntakeHistoryListResponse(BaseSchema):
    """入庫履歴一覧レスポンス."""

    intakes: list[IntakeHistoryResponse]
    total: int
    page: int
    page_size: int


class DailyIntakeSummary(BaseSchema):
    """日別入庫集計（カレンダー用）."""

    date: date
    count: int
    total_quantity: Decimal
