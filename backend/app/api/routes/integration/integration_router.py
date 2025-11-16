# backend/app/api/routes/integration.py
"""
連携管理のAPIエンドポイント
OCR取込、SAP連携.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models import Order
from app.schemas.integration.integration_schema import (
    OcrSubmissionRequest,
    OcrSubmissionResponse,
    SapRegisterRequest,
    SapRegisterResponse,
    SubmissionRequest,
)
from app.services.integration.submissions_service import process_external_submission


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integration", tags=["integration"])


# ===== OCR Submission =====
@router.post("/ai-ocr/submit", response_model=OcrSubmissionResponse, deprecated=True)
def submit_ocr_data(submission: OcrSubmissionRequest, db: Session = Depends(get_db)):
    """
    AI-OCR受注データ取込.

    DEPRECATED: Use POST /api/submissions instead with source="ocr".
    This endpoint will be removed in v3.0.

    処理フロー:
    1. OCR取込ログ作成
    2. 各受注レコードについて:
       - 得意先・製品のマスタチェック
       - 受注ヘッダ作成
       - 受注明細作成
       - (オプション) フォーキャストマッチング
    3. 結果サマリ返却
    """
    logger.warning(
        "DEPRECATED: POST /integration/ai-ocr/submit called. "
        "Please migrate to POST /submissions with source='ocr'."
    )

    # Convert OcrSubmissionRequest to SubmissionRequest format
    submission_request = SubmissionRequest(
        source=submission.source,
        payload={
            "records": [
                {
                    "order_no": record.order_no,
                    "customer_code": record.customer_code,
                    "order_date": record.order_date,
                    "lines": [
                        {
                            "line_no": line.line_no,
                            "product_code": line.product_code,
                            "quantity": line.quantity,
                            "external_unit": line.external_unit,
                            "due_date": line.due_date,
                        }
                        for line in record.lines
                    ],
                }
                for record in submission.records
            ]
        },
    )

    # Delegate to unified submission service
    response = process_external_submission(db, submission_request)

    # Convert SubmissionResponse to OcrSubmissionResponse for backward compatibility
    return OcrSubmissionResponse(
        status=response.status,
        submission_id=response.submission_id,
        created_orders=response.created_records,
        created_lines=0,  # Not tracked separately in SubmissionResponse
        total_records=response.total_records,
        processed_records=response.processed_records,
        failed_records=response.failed_records,
        skipped_records=response.skipped_records,
        error_details=response.error_details,
    )


@router.get("/ai-ocr/submissions", deprecated=True)
def list_ocr_submissions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    OCR取込ログ一覧取得.

    DEPRECATED: This endpoint has been removed in DDL v2.2.
    The ocr_submissions table no longer exists.
    Use /api/operation-logs for logging instead.
    """
    logger.warning(
        "DEPRECATED: GET /integration/ai-ocr/submissions called. "
        "This endpoint is no longer functional (DDL v2.2)."
    )
    raise HTTPException(
        status_code=410,
        detail="このエンドポイントは削除されました。ocr_submissionsテーブルはDDL v2.2で廃止されました。",
    )


# ===== SAP Sync =====
@router.post("/sap/register", response_model=SapRegisterResponse, deprecated=True)
def register_to_sap(request: SapRegisterRequest, db: Session = Depends(get_db)):
    """
    SAP連携(手動送信).

    DEPRECATED: This endpoint will be moved to /api/sap-sync in v3.0.

    注意: 実際のSAP APIは実装されていません。
    これはモック実装です。
    """
    logger.warning(
        "DEPRECATED: POST /integration/sap/register called. "
        "Please migrate to POST /sap-sync in future versions."
    )
    # 対象受注の取得
    orders = []

    if request.target.type == "order_no":
        order = db.query(Order).filter(Order.order_number == request.target.value).first()
        if order:
            orders.append(order)
    elif request.target.type == "order_id":
        stmt = (
            select(Order)
            .where(Order.id == request.target.value)
            .options(selectinload(Order.order_lines))
        )
        order = db.execute(stmt).scalar_one_or_none()
        if order:
            orders.append(order)
    else:
        raise HTTPException(status_code=400, detail="未対応のtarget.type")

    if not orders:
        raise HTTPException(status_code=404, detail="対象受注が見つかりません")

    sent = 0
    for order in orders:
        # SAP送信(モック)

        # モック: 成功として処理
        sap_order_id = f"SAP-{order.order_number}"
        sap_status = "posted"

        # Note: DDL v2.2 では sap_order_id, sap_status, sap_sent_at フィールドは削除されました
        # SAP連携状態は別テーブルで管理する必要があります

        # Note: SapSyncLog モデルも DDL v2.2 で削除されました
        # SAP連携ログは operation_logs または別のログシステムで行ってください
        sent += 1

    db.commit()

    return SapRegisterResponse(
        status="success",
        sap_order_id=sap_order_id,
        sap_status=sap_status,
        sent=sent,
    )


@router.get("/sap/logs", deprecated=True)
def list_sap_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    SAP連携ログ一覧取得.

    DEPRECATED: This endpoint has been removed in DDL v2.2.
    The sap_sync_logs table no longer exists.
    Use /api/operation-logs for logging instead.
    """
    logger.warning(
        "DEPRECATED: GET /integration/sap/logs called. "
        "This endpoint is no longer functional (DDL v2.2)."
    )
    raise HTTPException(
        status_code=410,
        detail="このエンドポイントは削除されました。sap_sync_logsテーブルはDDL v2.2で廃止されました。",
    )
