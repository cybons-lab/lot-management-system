"""受注登録結果 API ルーター."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.order_register import OrderRegisterService
from app.core.database import get_db
from app.presentation.schemas.order_register_schema import (
    OrderRegisterGenerateRequest,
    OrderRegisterGenerateResponse,
    OrderRegisterLotAssignmentUpdate,
    OrderRegisterRowListResponse,
    OrderRegisterRowResponse,
)


router = APIRouter(prefix="/order-register", tags=["Order Register"])


def get_service(db: Session = Depends(get_db)) -> OrderRegisterService:
    """サービスインスタンスを取得."""
    return OrderRegisterService(db)


@router.get("", response_model=OrderRegisterRowListResponse)
async def list_order_register_rows(
    task_date: Annotated[str | None, Query(description="タスク日付 (YYYY-MM-DD)")] = None,
    status: Annotated[str | None, Query(description="ステータスでフィルタ")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    service: OrderRegisterService = Depends(get_service),
) -> OrderRegisterRowListResponse:
    """受注登録結果一覧を取得."""
    from datetime import datetime

    task_date_obj = datetime.fromisoformat(task_date).date() if task_date else None

    items = service.list_order_register_rows(
        task_date=task_date_obj,
        status=status,
        limit=limit,
        offset=offset,
    )
    response_items = [OrderRegisterRowResponse.model_validate(item) for item in items]
    return OrderRegisterRowListResponse(items=response_items, total=len(items))


@router.get("/{row_id}", response_model=OrderRegisterRowResponse)
async def get_order_register_row(
    row_id: int,
    service: OrderRegisterService = Depends(get_service),
) -> OrderRegisterRowResponse:
    """受注登録結果を取得."""
    row = service.get_order_register_row(row_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"受注登録結果 ID={row_id} が見つかりません",
        )
    return OrderRegisterRowResponse.model_validate(row)


@router.post("/generate", response_model=OrderRegisterGenerateResponse)
async def generate_order_register_rows(
    request: OrderRegisterGenerateRequest,
    service: OrderRegisterService = Depends(get_service),
) -> OrderRegisterGenerateResponse:
    """OCRデータから受注登録結果を生成."""
    generated_count, warnings = service.generate_from_ocr(request.task_date)

    return OrderRegisterGenerateResponse(
        success=len(warnings) == 0,
        generated_count=generated_count,
        warnings=warnings,
    )


@router.put("/{row_id}/lots", response_model=OrderRegisterRowResponse)
async def update_lot_assignments(
    row_id: int,
    data: OrderRegisterLotAssignmentUpdate,
    service: OrderRegisterService = Depends(get_service),
) -> OrderRegisterRowResponse:
    """ロット割当を更新."""
    updated = service.update_lot_assignments(
        row_id=row_id,
        lot_no_1=data.lot_no_1,
        quantity_1=data.quantity_1,
        lot_no_2=data.lot_no_2,
        quantity_2=data.quantity_2,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"受注登録結果 ID={row_id} が見つかりません",
        )
    return OrderRegisterRowResponse.model_validate(updated)
