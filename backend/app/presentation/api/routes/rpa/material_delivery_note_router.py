"""Material Delivery Note RPA router.

素材納品書発行ワークフローのAPIエンドポイント。
"""

import json
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.application.services.rpa import (
    MaterialDeliveryNoteService,
    call_power_automate_flow,
    get_lock_manager,
)
from app.infrastructure.persistence.models import LayerCodeMapping
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import (
    get_current_user_optional,
)
from app.presentation.schemas.rpa_run_schema import (
    MaterialDeliveryNoteExecuteRequest,
    MaterialDeliveryNoteExecuteResponse,
    RpaRunBatchUpdateRequest,
    RpaRunCreateResponse,
    RpaRunItemResponse,
    RpaRunItemUpdateRequest,
    RpaRunListResponse,
    RpaRunResponse,
    RpaRunSummaryResponse,
    Step2ExecuteRequest,
    Step2ExecuteResponse,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rpa/material-delivery-note", tags=["rpa-material-delivery-note"])


def _get_maker_map(db: Session, layer_codes: list[str]) -> dict[str, str]:
    """層別コードに対応するメーカー名のマップを取得."""
    if not layer_codes:
        return {}
    mappings = (
        db.query(LayerCodeMapping).filter(LayerCodeMapping.layer_code.in_(set(layer_codes))).all()
    )
    return {m.layer_code: m.maker_name for m in mappings}


def _build_run_response(run, maker_map: dict[str, str] = None) -> RpaRunResponse:
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
        all_items_complete=run.all_items_complete,
        items=items,
    )


def _build_run_summary(run) -> RpaRunSummaryResponse:
    """RpaRunからサマリレスポンスを構築."""
    return RpaRunSummaryResponse(
        id=run.id,
        rpa_type=run.rpa_type,
        status=run.status,
        data_start_date=run.data_start_date,
        data_end_date=run.data_end_date,
        started_at=run.started_at,
        started_by_username=run.started_by_user.username if run.started_by_user else None,
        step2_executed_at=run.step2_executed_at,
        created_at=run.created_at,
        item_count=run.item_count,
        complete_count=run.complete_count,
        all_items_complete=run.all_items_complete,
    )


@router.post(
    "/runs",
    response_model=RpaRunCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_run(
    file: UploadFile = File(...),
    import_type: str = Form("material_delivery_note"),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """CSVファイルからRunを作成する.

    Args:
        file: アップロードされたCSVファイル
        import_type: インポート形式 (default: material_delivery_note)
        db: DBセッション
        user: 実行ユーザー
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file",
        )

    try:
        content = file.file.read()
        service = MaterialDeliveryNoteService(db)
        run = service.create_run_from_csv(content, import_type, user)
        return RpaRunCreateResponse(
            id=run.id,
            status=run.status,
            item_count=run.item_count,
            message="CSV uploaded and items created successfully",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Error creating run")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {e!s}",
        )


@router.get("/runs", response_model=RpaRunListResponse)
def list_runs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Run一覧取得."""
    service = MaterialDeliveryNoteService(db)
    runs, total = service.get_runs(skip=skip, limit=limit)

    return RpaRunListResponse(
        runs=[_build_run_summary(run) for run in runs],
        total=total,
    )


@router.get("/runs/{run_id}", response_model=RpaRunResponse)
def get_run(
    run_id: int,
    db: Session = Depends(get_db),
):
    """Run詳細取得（items含む）."""
    service = MaterialDeliveryNoteService(db)
    run = service.get_run(run_id)

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found: {run_id}",
        )

    layer_codes = [item.layer_code for item in run.items if item.layer_code]
    maker_map = _get_maker_map(db, layer_codes)

    return _build_run_response(run, maker_map)


@router.patch(
    "/runs/{run_id}/items/{item_id}",
    response_model=RpaRunItemResponse,
)
def update_item(
    run_id: int,
    item_id: int,
    request: RpaRunItemUpdateRequest,
    db: Session = Depends(get_db),
):
    """Item更新（issue_flag / complete_flag / delivery_quantity）."""
    service = MaterialDeliveryNoteService(db)
    item = service.update_item(
        run_id=run_id,
        item_id=item_id,
        issue_flag=request.issue_flag,
        complete_flag=request.complete_flag,
        delivery_quantity=request.delivery_quantity,
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item not found: run_id={run_id}, item_id={item_id}",
        )

    resp_item = RpaRunItemResponse.model_validate(item)
    if item.layer_code:
        maker_map = _get_maker_map(db, [item.layer_code])
        resp_item.maker_name = maker_map.get(item.layer_code)

    return resp_item


@router.post(
    "/runs/{run_id}/items/batch-update",
    response_model=RpaRunResponse,
)
def batch_update_items(
    run_id: int,
    request: RpaRunBatchUpdateRequest,
    db: Session = Depends(get_db),
):
    """指定したItemsを一括更新する."""
    service = MaterialDeliveryNoteService(db)
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
    maker_map = _get_maker_map(db, layer_codes)

    return _build_run_response(run, maker_map)


@router.post(
    "/runs/{run_id}/complete-all",
    response_model=RpaRunResponse,
)
def complete_all_items(
    run_id: int,
    db: Session = Depends(get_db),
):
    """全Itemsを完了にする."""
    service = MaterialDeliveryNoteService(db)
    run = service.complete_all_items(run_id)

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run not found: {run_id}",
        )

    layer_codes = [item.layer_code for item in run.items if item.layer_code]
    maker_map = _get_maker_map(db, layer_codes)

    return _build_run_response(run, maker_map)


@router.post(
    "/runs/{run_id}/step2",
    response_model=Step2ExecuteResponse,
)
async def execute_step2(
    run_id: int,
    request: Step2ExecuteRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Step2実行.

    事前条件: 全Itemsが完了していること。
    Power Automate Flowを呼び出してStep2を実行します。
    """
    service = MaterialDeliveryNoteService(db)

    try:
        # JSON Payload parse
        try:
            json_payload = json.loads(request.json_payload) if request.json_payload else {}
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
