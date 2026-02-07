import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.smartread.completion_service import SmartReadCompletionService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.smartread_models import (
    OcrResultEdit,
    RpaJob,
    SmartReadLongData,
)
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.schemas.rpa_schema import (
    RpaOrderCheckoutRequest,
    RpaOrderCheckoutResponse,
    RpaOrderResultRequest,
    RpaOrderResultResponse,
    RpaOrderStartRequest,
    RpaOrderStartResponse,
    RpaOrderVerifyRequest,
    RpaOrderVerifyResponse,
)


router = APIRouter(prefix="/rpa/sap/orders", tags=["RPA SAP Orders"])
logger = logging.getLogger(__name__)


@router.post("/start", response_model=RpaOrderStartResponse)
async def start_rpa_job(
    request: RpaOrderStartRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """RPAジョブを開始し、対象データをロックする."""
    # Validate IDs
    items = db.scalars(select(SmartReadLongData).where(SmartReadLongData.id.in_(request.ids))).all()

    if len(items) != len(request.ids):
        found_ids = {item.id for item in items}
        missing = set(request.ids) - found_ids
        raise HTTPException(status_code=400, detail=f"Items not found: {missing}")

    for item in items:
        # PENDINGまたはERRORのみ許可
        if item.status not in ["PENDING", "ERROR"]:
            raise HTTPException(
                status_code=400,
                detail=f"Item {item.id} is not in PENDING/ERROR state (status={item.status})",
            )
        # 既に処理中か確認 (processingでかつ、ジョブが生きている場合など)
        # 簡易的には status=='processing' ならNG
        if item.status == "processing":
            raise HTTPException(status_code=400, detail=f"Item {item.id} is already processing")

    # Create Job
    job = RpaJob(job_type="sales_order_entry", status="pending", target_count=len(items))
    db.add(job)
    db.flush()  # get updated items

    # Update Items
    for item in items:
        item.status = "processing"
        item.rpa_job_id = job.id
        # 前回の検証結果などをクリアするか？
        item.verification_result = None
        item.error_reason = None

    db.commit()
    db.refresh(job)

    logger.info(f"RPA Job {job.id} started for {len(items)} items by user {_current_user.username}")

    # 起動URLの生成 (将来的に必要であれば)
    launch_url = None

    return RpaOrderStartResponse(
        job_id=job.id, target_count=job.target_count, launch_url=launch_url
    )


@router.post("/checkout", response_model=RpaOrderCheckoutResponse)
async def checkout_rpa_job(
    request: RpaOrderCheckoutRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """RPAからデータを取得する."""
    job = db.get(RpaJob, request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in ["pending", "processing", "validating"]:
        # リトライなどで何度か呼ばれる可能性を考慮し、完了/失敗以外なら許可
        pass

    if job.status == "pending":
        job.status = "processing"

    # Fetch Data
    items = db.scalars(
        select(SmartReadLongData).where(SmartReadLongData.rpa_job_id == job.id)
    ).all()

    # Fetch Edits
    item_ids = [i.id for i in items]
    edits = db.scalars(
        select(OcrResultEdit).where(OcrResultEdit.smartread_long_data_id.in_(item_ids))
    ).all()
    edits_map = {e.smartread_long_data_id: e for e in edits}

    response_items = []
    for item in items:
        edit = edits_map.get(item.id)

        # Base content (OCR result)
        data: dict[str, Any] = dict(item.content)

        # Add internal IDs
        data["system_id"] = item.id
        data["row_index"] = item.row_index

        # Override with manual edits if exists
        if edit:
            if edit.lot_no_1 is not None:
                data["lot_no_1"] = edit.lot_no_1
            if edit.quantity_1 is not None:
                data["quantity_1"] = edit.quantity_1
            if edit.lot_no_2 is not None:
                data["lot_no_2"] = edit.lot_no_2
            if edit.quantity_2 is not None:
                data["quantity_2"] = edit.quantity_2
            if edit.inbound_no is not None:
                data["inbound_no"] = edit.inbound_no
            if edit.inbound_no_2 is not None:
                data["inbound_no_2"] = edit.inbound_no_2
            if edit.shipping_date is not None:
                data["shipping_date"] = edit.shipping_date.isoformat()
            if edit.shipping_slip_text is not None:
                data["shipping_slip_text"] = edit.shipping_slip_text
            if edit.jiku_code is not None:
                data["jiku_code"] = edit.jiku_code
            if edit.material_code is not None:
                data["material_code"] = edit.material_code
            if edit.delivery_quantity is not None:
                data["delivery_quantity"] = edit.delivery_quantity
            if edit.delivery_date is not None:
                data["delivery_date"] = edit.delivery_date

        # 必要なフィールドが揃っているかなどのビジネスロジックはここに入れられるが、
        # 基本的にはそのまま渡す

        response_items.append({"id": item.id, "data": data})

    db.commit()
    logger.info(
        f"RPA Job {job.id} checked out by {_current_user.username}. Items count: {len(response_items)}"
    )
    return RpaOrderCheckoutResponse(job_id=job.id, items=response_items)


@router.post("/verify", response_model=RpaOrderVerifyResponse)
async def verify_rpa_job(
    request: RpaOrderVerifyRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """RPAマクロ側でのバリデーション結果を受け取る."""
    job = db.get(RpaJob, request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    items = db.scalars(
        select(SmartReadLongData).where(SmartReadLongData.rpa_job_id == job.id)
    ).all()

    if request.success:
        job.status = "registering"  # バリデーションOK、登録処理へ
        action = "proceed"
    else:
        job.status = "failed"
        job.error_message = request.error_message
        job.failure_count = len(items)

        # 全アイテムをエラーにする
        for item in items:
            item.status = "ERROR"
            item.error_reason = request.error_message or "Validation failed"
            item.verification_result = {"error": request.error_message}

        action = "abort"

    db.commit()
    logger.info(
        f"RPA Job {job.id} verification result received: success={request.success}, action={action}"
    )
    return RpaOrderVerifyResponse(action=action)


@router.post("/result", response_model=RpaOrderResultResponse)
async def result_rpa_job(
    request: RpaOrderResultRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """RPA実行の最終結果を受け取る (SAP登録完了/失敗)."""
    job = db.get(RpaJob, request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    items = db.scalars(
        select(SmartReadLongData).where(SmartReadLongData.rpa_job_id == job.id)
    ).all()

    if request.success:
        job.status = "completed"
        job.success_count = len(items)
        job.error_message = None

        # Archiving
        ids_to_archive = []
        for item in items:
            item.sap_order_no = request.sap_order_no
            item.status = "IMPORTED"  # 一旦完了にする
            ids_to_archive.append(item.id)

        db.flush()  # Save sap_order_no first

        try:
            service = SmartReadCompletionService(db)
            service.mark_as_completed(ids_to_archive)
        except Exception as e:
            # アーカイブ失敗時はロールバックして不整合を防ぐ
            db.rollback()
            logger.error(f"Archiving failed after SAP registration: {e}")
            job.error_message = f"Registration success, but archiving failed: {e!s}"
            # フロントエンドには成功として返すが、ジョブメッセージに残す
            pass

        message = "Job completed successfully"
    else:
        job.status = "failed"
        job.error_message = request.error_message
        job.failure_count = len(items)

        for item in items:
            item.status = "ERROR"
            item.error_reason = request.error_message or "Registration failed"

        message = f"Job failed: {request.error_message}"

    db.commit()
    logger.info(
        f"RPA Job {job.id} final result received: success={request.success}, sap_order_no={request.sap_order_no}"
    )
    return RpaOrderResultResponse(success=request.success, message=message)
