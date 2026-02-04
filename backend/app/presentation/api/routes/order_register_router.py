"""受注登録結果 API ルーター."""

import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
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
logger = logging.getLogger(__name__)


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
    logger.debug(
        "Order register list requested",
        extra={"task_date": task_date, "status": status, "limit": limit, "offset": offset},
    )
    task_date_obj = datetime.fromisoformat(task_date).date() if task_date else None

    items = service.list_order_register_rows(
        task_date=task_date_obj,
        status=status,
        limit=limit,
        offset=offset,
    )
    response_items = [OrderRegisterRowResponse.model_validate(item) for item in items]
    logger.info(
        "Order register list fetched",
        extra={"count": len(items), "task_date": task_date},
    )
    return OrderRegisterRowListResponse(items=response_items, total=len(items))


@router.get("/{row_id}", response_model=OrderRegisterRowResponse)
async def get_order_register_row(
    row_id: int,
    service: OrderRegisterService = Depends(get_service),
) -> OrderRegisterRowResponse:
    """受注登録結果を取得."""
    logger.debug("Order register row requested", extra={"row_id": row_id})
    row = service.get_order_register_row(row_id)
    if not row:
        logger.warning("Order register row not found", extra={"row_id": row_id})
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
    logger.info(
        "Order register generation requested",
        extra={"task_date": str(request.task_date)},
    )
    generated_count, warnings = service.generate_from_ocr(request.task_date)

    logger.info(
        "Order register generation completed",
        extra={
            "task_date": str(request.task_date),
            "generated_count": generated_count,
            "warning_count": len(warnings),
        },
    )
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
    logger.info("Lot assignment update requested", extra={"row_id": row_id})
    updated = service.update_lot_assignments(
        row_id=row_id,
        lot_no_1=data.lot_no_1,
        quantity_1=data.quantity_1,
        lot_no_2=data.lot_no_2,
        quantity_2=data.quantity_2,
    )
    if not updated:
        logger.warning("Order register row not found for lot update", extra={"row_id": row_id})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"受注登録結果 ID={row_id} が見つかりません",
        )
    logger.info("Lot assignment updated", extra={"row_id": row_id})
    return OrderRegisterRowResponse.model_validate(updated)


@router.get("/export/excel")
async def export_order_register_to_excel(
    task_date: Annotated[str | None, Query(description="タスク日付 (YYYY-MM-DD)")] = None,
    status: Annotated[str | None, Query(description="ステータスでフィルタ")] = None,
    service: OrderRegisterService = Depends(get_service),
) -> StreamingResponse:
    """受注登録結果をExcelでエクスポート.

    ファイル名形式: 受注情報登録_yyyymmddhhMMss.xlsx
    """
    logger.info(
        "Order register Excel export requested",
        extra={"task_date": task_date, "status": status},
    )
    task_date_obj = datetime.fromisoformat(task_date).date() if task_date else None

    # データ取得（制限なし）
    items = service.list_order_register_rows(
        task_date=task_date_obj,
        status=status,
        limit=10000,  # 大きめの制限
        offset=0,
    )

    # Pydanticモデルに変換
    response_items = [OrderRegisterRowResponse.model_validate(item) for item in items]

    # タイムスタンプを含むファイル名生成
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"受注情報登録_{timestamp}"

    # カラムマッピング (要件 A-X列)
    column_map = {
        "inbound_no": "入庫No",
        "delivery_date": "納期",
        "delivery_quantity": "納入量",
        "item_no": "アイテムNo",
        "quantity_unit": "数量単位",
        "lot_no_1": "ロットNo1",
        "quantity_1": "数量1",
        "lot_no_2": "ロットNo2",
        "quantity_2": "数量2",
        "material_code": "材質コード",
        "jiku_code": "次区",
        "shipping_date": "出荷日",
        "customer_part_no": "先方品番",
        "maker_part_no": "メーカー品番",
        "shipping_slip_text": "出荷票テキスト",
        "customer_code": "得意先コード",
        "customer_name": "得意先名",
        "supplier_code": "仕入先コード",
        "supplier_name": "仕入先名称",
        "shipping_warehouse_code": "出荷倉庫コード",
        "shipping_warehouse_name": "出荷倉庫名",
        "delivery_place_code": "納入先コード",
        "delivery_place_name": "納入先",
        "remarks": "備考",
    }

    # Excel出力
    logger.info(
        "Order register Excel export completed",
        extra={"count": len(response_items), "filename": filename},
    )
    return ExportService.export_to_excel(response_items, filename=filename, column_map=column_map)
