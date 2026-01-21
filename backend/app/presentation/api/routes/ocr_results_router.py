"""OCR結果（リアルタイムビュー）API ルーター.

v_ocr_resultsビューから直接データを取得し、
SmartRead縦持ちデータと出荷用マスタをJOINした結果を返す。
"""

from datetime import date, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_user


router = APIRouter(prefix="/ocr-results", tags=["OCR Results"])


class OcrResultItem(BaseModel):
    """OCR結果アイテム."""

    id: int
    wide_data_id: int | None = None
    config_id: int
    task_id: str
    task_date: date
    request_id_ref: int | None = None
    row_index: int
    status: str
    error_reason: str | None = None
    content: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    # OCR由来
    customer_code: str | None = None
    material_code: str | None = None
    jiku_code: str | None = None
    delivery_date: str | None = None
    delivery_quantity: str | None = None
    item_no: str | None = None
    order_unit: str | None = None
    inbound_no: str | None = None
    lot_no: str | None = None

    # マスタ由来
    master_id: int | None = None
    customer_name: str | None = None
    supplier_code: str | None = None
    supplier_name: str | None = None
    delivery_place_code: str | None = None
    delivery_place_name: str | None = None
    shipping_warehouse_code: str | None = None
    shipping_warehouse_name: str | None = None
    shipping_slip_text: str | None = None
    transport_lt_days: int | None = None
    customer_part_no: str | None = None
    maker_part_no: str | None = None
    has_order: bool | None = None

    # エラーフラグ
    master_not_found: bool = False
    jiku_format_error: bool = False
    date_format_error: bool = False
    has_error: bool = False

    model_config = {"from_attributes": True}


class OcrResultListResponse(BaseModel):
    """OCR結果一覧レスポンス."""

    items: list[OcrResultItem]
    total: int


@router.get("", response_model=OcrResultListResponse)
async def list_ocr_results(
    task_date: Annotated[str | None, Query(description="タスク日付 (YYYY-MM-DD)")] = None,
    status: Annotated[str | None, Query(description="ステータスでフィルタ")] = None,
    has_error: Annotated[bool | None, Query(description="エラーのみ表示")] = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> OcrResultListResponse:
    """OCR結果一覧を取得（v_ocr_resultsビューから）."""
    # ビューからデータを取得
    query = "SELECT * FROM v_ocr_results WHERE 1=1"
    params: dict[str, Any] = {}

    if task_date:
        query += " AND task_date = :task_date"
        params["task_date"] = datetime.fromisoformat(task_date).date()

    if status:
        query += " AND status = :status"
        params["status"] = status

    if has_error is True:
        query += " AND has_error = true"
    elif has_error is False:
        query += " AND has_error = false"

    # 並び順
    query += " ORDER BY task_date DESC, row_index ASC"

    # ページネーション
    query += " LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset

    result = db.execute(text(query), params)
    rows = result.mappings().all()

    # 総件数取得
    count_query = "SELECT COUNT(*) FROM v_ocr_results WHERE 1=1"
    count_params: dict[str, Any] = {}
    if task_date:
        count_query += " AND task_date = :task_date"
        count_params["task_date"] = params["task_date"]
    if status:
        count_query += " AND status = :status"
        count_params["status"] = status
    if has_error is True:
        count_query += " AND has_error = true"
    elif has_error is False:
        count_query += " AND has_error = false"

    total_result = db.execute(text(count_query), count_params)
    total = total_result.scalar() or 0

    items = [OcrResultItem.model_validate(dict(row)) for row in rows]

    return OcrResultListResponse(items=items, total=total)


@router.get("/{item_id}", response_model=OcrResultItem)
async def get_ocr_result(
    item_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> OcrResultItem:
    """OCR結果詳細を取得."""
    query = "SELECT * FROM v_ocr_results WHERE id = :id"
    result = db.execute(text(query), {"id": item_id})
    row = result.mappings().first()

    if not row:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OCR結果 ID={item_id} が見つかりません",
        )

    return OcrResultItem.model_validate(dict(row))
