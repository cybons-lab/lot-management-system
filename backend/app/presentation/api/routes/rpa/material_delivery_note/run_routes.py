"""Material Delivery Note run endpoints."""

import logging

from fastapi import Depends, File, Form, HTTPException, Query, UploadFile, status

from app.application.services.common.uow_service import UnitOfWork
from app.application.services.rpa import MaterialDeliveryNoteOrchestrator
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import Customer
from app.presentation.api.deps import get_uow
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.api.routes.rpa.material_delivery_note.common import (
    _build_run_response,
    _build_run_summary,
    _get_maker_map,
)
from app.presentation.api.routes.rpa.material_delivery_note.router import router
from app.presentation.schemas.rpa_run_schema import (
    RpaRunBatchUpdateRequest,
    RpaRunListResponse,
    RpaRunResponse,
)

logger = logging.getLogger(__name__)


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
