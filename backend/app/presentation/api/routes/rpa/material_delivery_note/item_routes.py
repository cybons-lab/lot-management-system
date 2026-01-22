"""Material Delivery Note item endpoints."""

import logging

from fastapi import Depends, HTTPException, Query, status

from app.application.services.common.export_service import ExportService
from app.application.services.common.uow_service import UnitOfWork
from app.application.services.rpa import MaterialDeliveryNoteOrchestrator
from app.presentation.api.deps import get_uow
from app.presentation.api.routes.rpa.material_delivery_note.common import _get_maker_map
from app.presentation.api.routes.rpa.material_delivery_note.router import router
from app.presentation.schemas.rpa_run_schema import (
    ActivityItemResponse,
    LotSuggestionsResponse,
    RpaRunItemFailureRequest,
    RpaRunItemResponse,
    RpaRunItemSuccessRequest,
    RpaRunItemUpdateRequest,
    RpaRunResultUpdateRequest,
)


logger = logging.getLogger(__name__)


@router.patch(
    "/runs/{run_id}/items/{item_id}",
    response_model=RpaRunItemResponse,
)
def update_item(
    run_id: int,
    item_id: int,
    request: RpaRunItemUpdateRequest,
    uow: UnitOfWork = Depends(get_uow),
):
    """Item更新（issue_flag / complete_flag / delivery_quantity）."""
    try:
        service = MaterialDeliveryNoteOrchestrator(uow)
        item = service.update_item(
            run_id=run_id,
            item_id=item_id,
            issue_flag=request.issue_flag,
            complete_flag=request.complete_flag,
            delivery_quantity=request.delivery_quantity,
            lot_no=request.lot_no,
        )

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item not found: run_id={run_id}, item_id={item_id}",
            )

        resp_item = RpaRunItemResponse.model_validate(item)
        if item.layer_code:
            maker_map = _get_maker_map(uow.session, [item.layer_code])
            resp_item.maker_name = maker_map.get(item.layer_code)

        return resp_item
    except ValueError as e:
        logger.error(f"ValueError in update_item: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Unexpected error in update_item")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {e!s}",
        )


@router.get(
    "/runs/{run_id}/next-item",
    response_model=RpaRunItemResponse | None,
)
def get_next_processing_item(
    run_id: int,
    lock_timeout_seconds: int = Query(default=600, ge=30, le=3600),
    lock_owner: str | None = Query(default=None),
    include_failed: bool = Query(default=False),
    uow: UnitOfWork = Depends(get_uow),
):
    """次に処理すべき未完了アイテムをロックして取得する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    item = service.claim_next_processing_item(
        run_id=run_id,
        lock_timeout_seconds=lock_timeout_seconds,
        lock_owner=lock_owner,
        include_failed=include_failed,
    )

    if not item:
        return None

    resp_item = RpaRunItemResponse.model_validate(item)
    if item.layer_code:
        maker_map = _get_maker_map(uow.session, [item.layer_code])
        resp_item.maker_name = maker_map.get(item.layer_code)

    return resp_item


@router.post(
    "/runs/{run_id}/items/{item_id}/success",
    response_model=RpaRunItemResponse,
)
def report_item_success(
    run_id: int,
    item_id: int,
    request: RpaRunItemSuccessRequest,
    uow: UnitOfWork = Depends(get_uow),
):
    """PADから成功報告を受け取る."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        item = service.mark_item_success(
            run_id=run_id,
            item_id=item_id,
            pdf_path=request.pdf_path,
            message=request.message,
            lock_owner=request.lock_owner,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Item not found")

    resp_item = RpaRunItemResponse.model_validate(item)
    if item.layer_code:
        maker_map = _get_maker_map(uow.session, [item.layer_code])
        resp_item.maker_name = maker_map.get(item.layer_code)
    return resp_item


@router.post(
    "/runs/{run_id}/items/{item_id}/failure",
    response_model=RpaRunItemResponse,
)
def report_item_failure(
    run_id: int,
    item_id: int,
    request: RpaRunItemFailureRequest,
    uow: UnitOfWork = Depends(get_uow),
):
    """PADから失敗報告を受け取る."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        item = service.mark_item_failure(
            run_id=run_id,
            item_id=item_id,
            error_code=request.error_code,
            error_message=request.error_message,
            screenshot_path=request.screenshot_path,
            lock_owner=request.lock_owner,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Item not found")

    resp_item = RpaRunItemResponse.model_validate(item)
    if item.layer_code:
        maker_map = _get_maker_map(uow.session, [item.layer_code])
        resp_item.maker_name = maker_map.get(item.layer_code)
    return resp_item


@router.get(
    "/runs/{run_id}/failed-items",
    response_model=list[RpaRunItemResponse],
)
def list_failed_items(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
):
    """失敗したアイテム一覧を取得する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    run = service.get_run(run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Run not found")

    items = service.get_failed_items(run_id)
    responses: list[RpaRunItemResponse] = []
    layer_codes = [item.layer_code for item in items if item.layer_code]
    maker_map = _get_maker_map(uow.session, layer_codes)
    for item in items:
        resp_item = RpaRunItemResponse.model_validate(item)
        if item.layer_code:
            resp_item.maker_name = maker_map.get(item.layer_code)
        responses.append(resp_item)
    return responses


@router.get(
    "/runs/{run_id}/activity",
    response_model=list[ActivityItemResponse],
)
def get_activity(
    run_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    uow: UnitOfWork = Depends(get_uow),
):
    """PADループの活動ログを取得する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    run = service.get_run(run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Run not found")

    items = service.get_activity(run_id, limit=limit)
    return [
        ActivityItemResponse(
            item_id=item.id,
            row_no=item.row_no,
            result_status=item.result_status,
            updated_at=item.updated_at,
            result_message=item.result_message,
            result_pdf_path=item.result_pdf_path,
            last_error_code=item.last_error_code,
            last_error_message=item.last_error_message,
            last_error_screenshot_path=item.last_error_screenshot_path,
            locked_by=item.locked_by,
            locked_until=item.locked_until,
        )
        for item in items
    ]


@router.get(
    "/runs/{run_id}/items/{item_id}/lot-suggestions",
    response_model=LotSuggestionsResponse,
)
def get_lot_suggestions(
    run_id: int,
    item_id: int,
    uow: UnitOfWork = Depends(get_uow),
):
    """アイテムに対するロット候補を取得する.

    疎結合対応: CustomerItemマスタやロットがなくてもエラーにならない。

    Returns:
        - lots: FEFO順のロット候補リスト
        - auto_selected: 候補が1つの場合のロット番号
        - source: マッピング元 (customer_item, product_only, none)
    """
    service = MaterialDeliveryNoteOrchestrator(uow)
    result = service.get_lot_suggestions(run_id, item_id)
    return LotSuggestionsResponse(**result)


@router.patch(
    "/runs/{run_id}/items/{item_id}/rpa-result",
    response_model=RpaRunItemResponse,
)
def update_item_result(
    run_id: int,
    item_id: int,
    request: RpaRunResultUpdateRequest,
    uow: UnitOfWork = Depends(get_uow),
):
    """PADからの結果更新."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    item = service.update_item_result(
        run_id=run_id,
        item_id=item_id,
        result_status=request.result_status,
        sap_registered=request.sap_registered,
        issue_flag=request.issue_flag,
    )
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Item not found")

    resp_item = RpaRunItemResponse.model_validate(item)
    if item.layer_code:
        maker_map = _get_maker_map(uow.session, [item.layer_code])
        resp_item.maker_name = maker_map.get(item.layer_code)
    return resp_item


@router.get("/runs/{run_id}/failed-items/export")
def export_failed_items(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
):
    """失敗アイテムをExcelで出力."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        items = service.get_failed_items(run_id)
        export_rows = []
        for item in items:
            export_rows.append(
                {
                    "run_id": str(item.run_id),
                    "row_no": str(item.row_no),
                    "item_no": str(item.item_no) if item.item_no is not None else "",
                    "order_no": str(item.order_no) if item.order_no is not None else "",
                    "supplier_code": str(item.layer_code) if item.layer_code is not None else "",
                    "destination_code": str(item.jiku_code) if item.jiku_code is not None else "",
                    "result_status": str(item.result_status) if item.result_status else "",
                    "error_code": str(item.last_error_code) if item.last_error_code else "",
                    "error_message": str(item.last_error_message)
                    if item.last_error_message
                    else "",
                    "updated_at": item.updated_at.isoformat() if item.updated_at else "",
                }
            )
        column_map = {
            "run_id": "Run ID",
            "row_no": "行番号",
            "item_no": "納品書番号",
            "order_no": "受発注No",
            "supplier_code": "層別コード",
            "destination_code": "次区コード",
            "result_status": "結果",
            "error_code": "エラーコード",
            "error_message": "エラーメッセージ",
            "updated_at": "更新日時",
        }
        filename = f"material_delivery_run_{run_id}_failed_items"
        return ExportService.export_to_excel(export_rows, filename=filename, column_map=column_map)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))
