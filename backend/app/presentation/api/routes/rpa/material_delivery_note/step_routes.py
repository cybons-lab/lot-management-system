"""Material Delivery Note step endpoints."""

import json
import logging

from fastapi import Depends, File, HTTPException, UploadFile, status

from app.application.services.common.uow_service import UnitOfWork
from app.application.services.rpa import MaterialDeliveryNoteOrchestrator
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.deps import get_uow
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.api.routes.rpa.material_delivery_note.common import (
    _build_run_response,
    _get_maker_map,
)
from app.presentation.api.routes.rpa.material_delivery_note.router import router
from app.presentation.schemas.rpa_run_schema import (
    RpaRunResponse,
    Step2ExecuteRequest,
    Step2ExecuteResponse,
)

logger = logging.getLogger(__name__)


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
