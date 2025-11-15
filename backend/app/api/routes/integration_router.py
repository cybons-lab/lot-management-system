# backend/app/api/routes/integration.py
"""
連携管理のAPIエンドポイント
OCR取込、SAP連携.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models import Customer, Order, OrderLine, Product
from app.schemas import (
    OcrSubmissionRequest,
    OcrSubmissionResponse,
    SapRegisterRequest,
    SapRegisterResponse,
)
from app.services.quantity_service import QuantityConversionError, to_internal_qty


logger = logging.getLogger(__name__)
# フォーキャストマッチング機能（オプション）
try:
    from app.services.forecast_service import ForecastService

    FORECAST_AVAILABLE = True
except ImportError:
    FORECAST_AVAILABLE = False
    logger.warning("⚠️ ForecastService not available - forecast matching will be skipped")

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
    # 取込ID生成
    submission_id = f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-{submission.source}"

    total_records = len(submission.records)
    processed_records = 0
    failed_records = 0
    skipped_records = 0
    created_orders = 0
    created_lines = 0
    error_details = []

    # フォーキャストマッチャーの初期化
    forecast_matcher = ForecastService(db) if FORECAST_AVAILABLE else None

    # 各受注レコードを処理
    for _idx, record in enumerate(submission.records):
        try:
            # 重複チェック
            existing = db.query(Order).filter(Order.order_number == record.order_no).first()
            if existing:
                skipped_records += 1
                error_details.append(f"受注番号 {record.order_no} は既に存在します")
                continue

            # 得意先チェック
            customer = (
                db.query(Customer).filter(Customer.customer_code == record.customer_code).first()
            )
            if not customer:
                failed_records += 1
                error_details.append(f"得意先コード {record.customer_code} が見つかりません")
                continue

            # 受注ヘッダ作成
            db_order = Order(
                order_number=record.order_no,
                customer_id=customer.id,
                delivery_place_id=customer.id,  # TODO: Get from request if available
                order_date=record.order_date if record.order_date else None,
                status="pending",
            )
            db.add(db_order)
            db.flush()
            created_orders += 1

            # 受注明細作成
            for line in record.lines:
                # 製品チェック
                product = (
                    db.query(Product).filter(Product.maker_part_code == line.product_code).first()
                )
                if not product:
                    failed_records += 1
                    error_details.append(
                        f"受注 {record.order_no} 明細 {line.line_no}: 製品コード {line.product_code} が見つかりません"
                    )
                    continue

                try:
                    internal_qty = to_internal_qty(
                        product=product,
                        qty_external=line.quantity,
                        external_unit=line.external_unit,
                    )
                except QuantityConversionError as exc:
                    failed_records += 1
                    error_details.append(f"受注 {record.order_no} 明細 {line.line_no}: {exc}")
                    continue

                db_line = OrderLine(
                    order_id=db_order.id,
                    product_id=product.id,
                    order_quantity=float(internal_qty),
                    unit=product.base_unit,
                    delivery_date=line.due_date,
                )
                db.add(db_line)
                db.flush()

                # フォーキャストマッチング（オプション）
                if forecast_matcher and db_order.order_date:
                    try:
                        forecast_matcher.apply_forecast_to_order_line(
                            order_line=db_line,
                            product_code=line.product_code,
                            customer_code=record.customer_code,
                            order_date=db_order.order_date,
                        )
                    except Exception as e:
                        # フォーキャストマッチングエラーは警告のみ
                        logger.warning(
                            f"⚠️ Forecast matching failed for order {record.order_no} line {line.line_no}: {e}"
                        )

                created_lines += 1

            processed_records += 1

        except Exception as e:
            failed_records += 1
            error_details.append(f"受注 {record.order_no}: {str(e)}")

    # DDL v2.2: ocr_submissions テーブルは削除されました
    # ログ記録は operation_logs または別のログシステムで行ってください
    status = (
        "success" if failed_records == 0 else ("partial" if processed_records > 0 else "failed")
    )

    # Note: OcrSubmission モデルは DDL v2.2 で削除されました
    # このエンドポイントは DEPRECATED であり、/api/submissions を使用してください
    db.commit()

    logger.info(
        f"OCR取込完了: {processed_records}/{total_records} 件成功, {failed_records} 件失敗, {skipped_records} 件スキップ"
    )

    return OcrSubmissionResponse(
        status=status,
        submission_id=submission_id,
        created_orders=created_orders,
        created_lines=created_lines,
        total_records=total_records,
        processed_records=processed_records,
        failed_records=failed_records,
        skipped_records=skipped_records,
        error_details="\n".join(error_details) if error_details else None,
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
