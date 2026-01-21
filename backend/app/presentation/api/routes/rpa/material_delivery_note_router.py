"""Material Delivery Note RPA router.

素材納品書発行ワークフローのAPIエンドポイント。
"""

import json
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.common.uow_service import UnitOfWork
from app.application.services.rpa import (
    MaterialDeliveryNoteOrchestrator,
    call_power_automate_flow,
    get_lock_manager,
)
from app.infrastructure.persistence.models import LayerCodeMapping
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import Customer
from app.presentation.api.deps import get_uow
from app.presentation.api.routes.auth.auth_router import (
    get_current_user_optional,
)
from app.presentation.schemas.rpa_run_schema import (
    ActivityItemResponse,
    LoopSummaryResponse,
    LotSuggestionsResponse,
    MaterialDeliveryNoteExecuteRequest,
    MaterialDeliveryNoteExecuteResponse,
    RpaRunBatchUpdateRequest,
    RpaRunEventCreateRequest,
    RpaRunEventResponse,
    RpaRunFetchCreateRequest,
    RpaRunFetchResponse,
    RpaRunItemFailureRequest,
    RpaRunItemResponse,
    RpaRunItemSuccessRequest,
    RpaRunItemUpdateRequest,
    RpaRunListResponse,
    RpaRunResponse,
    RpaRunResultUpdateRequest,
    RpaRunSummaryResponse,
    Step2ExecuteRequest,
    Step2ExecuteResponse,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rpa/material-delivery-note", tags=["rpa-material-delivery-note"])


def _get_maker_map(db: Session | None, layer_codes: list[str]) -> dict[str, str]:
    """層別コードに対応するメーカー名のマップを取得."""
    if not layer_codes:
        return {}

    # Session might be None in some contexts but here we expect a valid session
    if db is None:
        logger.warning("_get_maker_map called with None session")
        return {}

    mappings = (
        db.query(LayerCodeMapping).filter(LayerCodeMapping.layer_code.in_(set(layer_codes))).all()
    )
    return {m.layer_code: m.maker_name for m in mappings}


def _build_run_response(run, maker_map: dict[str, str] | None = None) -> RpaRunResponse:
    """RpaRunからレスポンスを構築."""
    maker_map = maker_map or {}
    items = []
    for item in run.items:
        resp_item = RpaRunItemResponse.model_validate(item)
        resp_item.maker_name = maker_map.get(item.layer_code)
        resp_item.result_status = item.result_status
        items.append(resp_item)

    return RpaRunResponse(
        id=run.id,
        rpa_type=run.rpa_type,
        status=run.status,
        run_group_id=run.run_group_id,
        customer_id=run.customer_id,
        data_start_date=run.data_start_date,
        data_end_date=run.data_end_date,
        progress_percent=run.progress_percent,
        estimated_minutes=run.estimated_minutes,
        paused_at=run.paused_at,
        cancelled_at=run.cancelled_at,
        started_at=run.started_at,
        started_by_user_id=run.started_by_user_id,
        started_by_username=run.started_by_user.username if run.started_by_user else None,
        step2_executed_at=run.step2_executed_at,
        step2_executed_by_user_id=run.step2_executed_by_user_id,
        step2_executed_by_username=run.step2_executed_by_user.username
        if run.step2_executed_by_user
        else None,
        created_at=run.created_at,
        updated_at=run.updated_at,
        item_count=run.item_count,
        complete_count=run.complete_count,
        issue_count=run.issue_count,
        all_items_complete=run.all_items_complete,
        items=items,
        external_done_at=run.external_done_at,
        external_done_by_user_id=run.external_done_by_user_id,
        external_done_by_username=run.external_done_by_user.username
        if run.external_done_by_user
        else None,
        step4_executed_at=run.step4_executed_at,
    )


def _build_run_summary(run) -> RpaRunSummaryResponse:
    """RpaRunからサマリレスポンスを構築."""
    return RpaRunSummaryResponse(
        id=run.id,
        rpa_type=run.rpa_type,
        status=run.status,
        run_group_id=run.run_group_id,
        data_start_date=run.data_start_date,
        data_end_date=run.data_end_date,
        progress_percent=run.progress_percent,
        estimated_minutes=run.estimated_minutes,
        paused_at=run.paused_at,
        cancelled_at=run.cancelled_at,
        started_at=run.started_at,
        started_by_username=run.started_by_user.username if run.started_by_user else None,
        step2_executed_at=run.step2_executed_at,
        created_at=run.created_at,
        item_count=run.item_count,
        complete_count=run.complete_count,
        issue_count=run.issue_count,
        all_items_complete=run.all_items_complete,
        external_done_at=run.external_done_at,
        step4_executed_at=run.step4_executed_at,
    )


@router.post(
    "/runs",
    response_model=RpaRunResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_run(
    file: UploadFile = File(...),
    import_type: str = Form("material_delivery_note"),
    customer_code: str | None = Form(None),  # 得意先コード（オプション）
    uow: UnitOfWork = Depends(get_uow),
    user: User | None = Depends(get_current_user_optional),
):
    """CSVファイルからRunを作成する.

    Args:
        file: アップロードされたCSVファイル
        import_type: インポート形式 (default: material_delivery_note)
        customer_code: 得意先コード（オプション、マスタになくてもエラーにならない）
        uow: UnitOfWork
        user: 実行ユーザー
    """
    if not (file.filename and file.filename.endswith(".csv")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file",
        )

    with uow:
        # customer_code -> customer_id 解決（疎結合: なくてもエラーにならない）
        customer_id = None
        if customer_code:
            assert uow.session is not None
            customer = (
                uow.session.query(Customer).filter(Customer.customer_code == customer_code).first()
            )
            if customer:
                customer_id = customer.id
            # マスタになくても継続（ログのみ）
            else:
                logger.warning(f"Customer not found for code: {customer_code}")

        content = file.file.read()

        # Orchestrator uses uow.session which is now active
        service = MaterialDeliveryNoteOrchestrator(uow)
        try:
            run = service.create_run_from_csv(
                file_content=content,
                user=user,
                customer_id=customer_id,
            )
            # Commit is handled by __exit__

            # メーカー名マップ作成 for response
            maker_map = _get_maker_map(
                uow.session, [item.layer_code for item in run.items if item.layer_code]
            )

            return _build_run_response(run, maker_map)
        except ValueError as e:
            # Rollback is handled by __exit__ if exception propagates?
            # Actually __exit__ rollback depends on exception being present.
            # If we catch it, we must assume uow won't rollback automatically unless we re-raise or manually rollback.
            # But UnitOfWork doesn't have rollback() method exposed on instance (it uses self.session.rollback() in exit).
            # We should just RAISING the exception for uow to see it?
            # Or reliance on uow.session.rollback() if we could access it.
            # But uow.session IS accessible.
            # Let's check uow implementation again.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        except Exception as e:
            logger.error(f"Import failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Import failed",
            )


@router.get("/runs", response_model=RpaRunListResponse)
def list_runs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    uow: UnitOfWork = Depends(get_uow),
):
    """Run一覧取得."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    runs, total = service.get_runs(skip=skip, limit=limit)

    return RpaRunListResponse(
        runs=[_build_run_summary(run) for run in runs],
        total=total,
    )


@router.get("/runs/{run_id}", response_model=RpaRunResponse)
def get_run(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
):
    """Run詳細取得（items含む）."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    run = service.get_run(run_id)

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found: {run_id}",
        )

    layer_codes = [item.layer_code for item in run.items if item.layer_code]
    maker_map = _get_maker_map(uow.session, layer_codes)

    return _build_run_response(run, maker_map)


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
    "/runs/{run_id}/loop-summary",
    response_model=LoopSummaryResponse,
)
def get_loop_summary(
    run_id: int,
    top_n: int = Query(default=5, ge=1, le=50),
    uow: UnitOfWork = Depends(get_uow),
):
    """PADループの集計情報を取得する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    run = service.get_run(run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Run not found")

    summary = service.get_loop_summary(run_id, top_n=top_n)
    return LoopSummaryResponse(**summary)


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


@router.post(
    "/runs/{run_id}/items/batch-update",
    response_model=RpaRunResponse,
)
def batch_update_items(
    run_id: int,
    request: RpaRunBatchUpdateRequest,
    uow: UnitOfWork = Depends(get_uow),
):
    """指定したItemsを一括更新する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    run = service.batch_update_items(
        run_id=run_id,
        item_ids=request.item_ids,
        issue_flag=request.update_data.issue_flag,
        complete_flag=request.update_data.complete_flag,
        delivery_quantity=request.update_data.delivery_quantity,
    )

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found: {run_id}",
        )

    layer_codes = [item.layer_code for item in run.items if item.layer_code]
    maker_map = _get_maker_map(uow.session, layer_codes)

    return _build_run_response(run, maker_map)


@router.post(
    "/runs/{run_id}/complete-all",
    response_model=RpaRunResponse,
)
def complete_all_items(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
):
    """Step2完了としてステータスを更新する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    run = service.complete_all_items(run_id)

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found: {run_id}",
        )

    layer_codes = [item.layer_code for item in run.items if item.layer_code]
    maker_map = _get_maker_map(uow.session, layer_codes)

    return _build_run_response(run, maker_map)


@router.post(
    "/runs/{run_id}/step2",
    response_model=Step2ExecuteResponse,
)
async def execute_step2(
    run_id: int,
    request: Step2ExecuteRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Step2実行.

    事前条件: 全Itemsが完了していること。
    Power Automate Flowを呼び出してStep2を実行します。
    """
    service = MaterialDeliveryNoteOrchestrator(uow)

    try:
        # JSON Payload parse with variable substitution
        try:
            raw_payload = request.json_payload or "{}"
            # Replace variables
            raw_payload = raw_payload.replace("{{id}}", str(run_id))
            if request.start_date:
                raw_payload = raw_payload.replace("{{start_date}}", str(request.start_date))
            if request.end_date:
                raw_payload = raw_payload.replace("{{end_date}}", str(request.end_date))

            json_payload = json.loads(raw_payload)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSONペイロードの形式が不正です",
            )

        result = await service.execute_step2(
            run_id,
            flow_url=request.flow_url,
            json_payload=json_payload,
            start_date=request.start_date,
            end_date=request.end_date,
            user=current_user,
        )

        return Step2ExecuteResponse(
            status=result["status"],
            message=result["message"],
            executed_at=result["executed_at"],
            flow_response=result.get("flow_response"),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Step2実行エラー")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Step2実行に失敗しました: {e!s}",
        )


@router.post("/runs/{run_id}/external-done", response_model=RpaRunResponse)
def mark_external_done(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User | None = Depends(get_current_user_optional),
):
    """外部手順完了をマークする."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        run = service.mark_external_done(run_id, current_user)
        layer_codes = [item.layer_code for item in run.items if item.layer_code]
        maker_map = _get_maker_map(uow.session, layer_codes)
        return _build_run_response(run, maker_map)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


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


@router.post("/runs/{run_id}/step4-check", response_model=dict)
def execute_step4_check(
    run_id: int,
    file: UploadFile = File(...),
    uow: UnitOfWork = Depends(get_uow),
):
    """Step4: 突合チェック実行.

    Returns:
        {"match": int, "mismatch": int}
    """
    if not (file.filename and file.filename.endswith(".csv")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="CSV file required")

    with uow:
        service = MaterialDeliveryNoteOrchestrator(uow)
        try:
            content = file.file.read()
            result = service.execute_step4_check(run_id, content)
            # Commit is handled by __exit__
            return result
        except ValueError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            logger.error(f"Step4 check failed: {e}")
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Step4 check failed")


@router.post("/runs/{run_id}/step4-complete", response_model=RpaRunResponse)
def complete_step4(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
):
    """Step4完了としてステータスを更新する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        run = service.complete_step4(run_id)
        layer_codes = [item.layer_code for item in run.items if item.layer_code]
        maker_map = _get_maker_map(uow.session, layer_codes)
        return _build_run_response(run, maker_map)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/runs/{run_id}/retry-failed", response_model=RpaRunResponse)
def retry_failed_items(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
):
    """Step4 NGアイテムのみStep3再実行."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        run = service.retry_step3_failed(run_id)
        layer_codes = [item.layer_code for item in run.items if item.layer_code]
        maker_map = _get_maker_map(uow.session, layer_codes)
        return _build_run_response(run, maker_map)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/runs/{run_id}/pause", response_model=RpaRunResponse)
def pause_run(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
    user: User | None = Depends(get_current_user_optional),
):
    """Runを一時停止として記録する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        run = service.pause_run(run_id, user=user)
        layer_codes = [item.layer_code for item in run.items if item.layer_code]
        maker_map = _get_maker_map(uow.session, layer_codes)
        return _build_run_response(run, maker_map)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/runs/{run_id}/resume", response_model=RpaRunResponse)
def resume_run(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
    user: User | None = Depends(get_current_user_optional),
):
    """Runの一時停止を解除する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        run = service.resume_run(run_id, user=user)
        layer_codes = [item.layer_code for item in run.items if item.layer_code]
        maker_map = _get_maker_map(uow.session, layer_codes)
        return _build_run_response(run, maker_map)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/runs/{run_id}/cancel", response_model=RpaRunResponse)
def cancel_run(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
    user: User | None = Depends(get_current_user_optional),
):
    """Runをキャンセルする."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        run = service.cancel_run(run_id, user=user)
        layer_codes = [item.layer_code for item in run.items if item.layer_code]
        maker_map = _get_maker_map(uow.session, layer_codes)
        return _build_run_response(run, maker_map)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/runs/{run_id}/step4-start", response_model=RpaRunResponse)
def start_step4(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
    user: User | None = Depends(get_current_user_optional),
):
    """Step4開始を記録する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        run = service.start_step4(run_id, user=user)
        layer_codes = [item.layer_code for item in run.items if item.layer_code]
        maker_map = _get_maker_map(uow.session, layer_codes)
        return _build_run_response(run, maker_map)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/runs/{run_id}/events", response_model=list[RpaRunEventResponse])
def get_run_events(
    run_id: int,
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
):
    """Run制御イベントを取得."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        events = service.get_run_events(run_id, limit=limit)
        return [RpaRunEventResponse.model_validate(event) for event in events]
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/runs/{run_id}/events", response_model=RpaRunEventResponse)
def create_run_event(
    run_id: int,
    request: RpaRunEventCreateRequest,
    uow: UnitOfWork = Depends(get_uow),
    user: User | None = Depends(get_current_user_optional),
):
    """Run制御イベントを追加."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        event = service.repo.add_run_event(
            run_id=run_id,
            event_type=request.event_type,
            message=request.message,
            created_by_user_id=user.id if user else None,
        )
        return RpaRunEventResponse.model_validate(event)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/runs/{run_id}/failed-items", response_model=list[RpaRunItemResponse])
def get_failed_items(
    run_id: int,
    uow: UnitOfWork = Depends(get_uow),
):
    """失敗アイテム一覧を取得."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    try:
        items = service.get_failed_items(run_id)
        layer_codes = [item.layer_code for item in items if item.layer_code]
        maker_map = _get_maker_map(uow.session, layer_codes)
        response_items = []
        for item in items:
            resp_item = RpaRunItemResponse.model_validate(item)
            resp_item.maker_name = maker_map.get(item.layer_code)
            response_items.append(resp_item)
        return response_items
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


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
                    "error_message": str(item.last_error_message) if item.last_error_message else "",
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


@router.post("/step1/result", response_model=RpaRunFetchResponse)
def create_step1_result(
    request: RpaRunFetchCreateRequest,
    uow: UnitOfWork = Depends(get_uow),
):
    """Step1取得結果を記録する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    fetch = service.record_run_fetch(
        start_date=request.start_date,
        end_date=request.end_date,
        status=request.status,
        item_count=request.item_count,
        run_created=request.run_created,
        run_updated=request.run_updated,
        message=request.message,
    )
    return RpaRunFetchResponse.model_validate(fetch)


@router.get("/step1/latest", response_model=RpaRunFetchResponse | None)
def get_step1_latest(uow: UnitOfWork = Depends(get_uow)):
    """Step1取得結果の最新を取得する."""
    service = MaterialDeliveryNoteOrchestrator(uow)
    fetch = service.get_latest_run_fetch()
    return RpaRunFetchResponse.model_validate(fetch) if fetch else None


@router.post(
    "/execute",
    response_model=MaterialDeliveryNoteExecuteResponse,
    status_code=status.HTTP_200_OK,
)
async def execute_material_delivery_note(
    request: MaterialDeliveryNoteExecuteRequest,
    current_user: User | None = Depends(get_current_user_optional),
):
    """Power Automate Cloud Flowを呼び出して素材納品書発行を実行.

    既存の「素材納品書発行」ボタンの機能を拡張し、
    URL/JSONを指定してFlowをトリガーする。
    """
    lock_manager = get_lock_manager()
    user_name = current_user.username if current_user else "system"

    # ロック取得を試行
    if not lock_manager.acquire_lock(user=user_name, duration_seconds=60):
        remaining = lock_manager.get_remaining_seconds()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"他のユーザーが実行中です。時間をおいて実施してください（残り{remaining}秒）",
        )

    try:
        # Parse JSON payload
        try:
            json_payload = json.loads(request.json_payload) if request.json_payload else {}
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSONペイロードの形式が不正です",
            )

        # Add date range to payload
        json_payload["start_date"] = str(request.start_date)
        json_payload["end_date"] = str(request.end_date)
        json_payload["executed_by"] = user_name

        # Call Power Automate Flow
        try:
            flow_response = await call_power_automate_flow(
                flow_url=request.flow_url,
                json_payload=json_payload,
            )
            return MaterialDeliveryNoteExecuteResponse(
                status="success",
                message="Power Automate Flowの呼び出しが完了しました",
                flow_response=flow_response,
            )
        except Exception as e:
            logger.exception("Power Automate Flow呼び出しエラー")
            return MaterialDeliveryNoteExecuteResponse(
                status="error",
                message=f"Flow呼び出しに失敗しました: {e!s}",
                flow_response=None,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("素材納品書発行エラー")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"実行に失敗しました: {e!s}",
        )
