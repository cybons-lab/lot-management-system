# backend/app/api/routes/integration.py
"""
連携管理のAPIエンドポイント
OCR取込、SAP連携
"""

import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Customer, OcrSubmission, Order, OrderLine, Product, SapSyncLog
from app.schemas import (
    OcrSubmissionRequest,
    OcrSubmissionResponse,
    SapRegisterRequest,
    SapRegisterResponse,
    SapSyncLogResponse,
)
from app.services.quantity import QuantityConversionError, to_internal_qty

# フォーキャストマッチング機能（オプション）
try:
    from app.services.forecast import ForecastMatcher

    FORECAST_AVAILABLE = True
except ImportError:
    FORECAST_AVAILABLE = False
    print("⚠️  ForecastMatcher not available - forecast matching will be skipped")

router = APIRouter(prefix="/integration", tags=["integration"])


# ===== OCR Submission =====
@router.post("/ai-ocr/submit", response_model=OcrSubmissionResponse)
def submit_ocr_data(submission: OcrSubmissionRequest, db: Session = Depends(get_db)):
    """
    AI-OCR受注データ取込

    処理フロー:
    1. OCR取込ログ作成
    2. 各受注レコードについて:
       - 得意先・製品のマスタチェック
       - 受注ヘッダ作成
       - 受注明細作成
       - (オプション) フォーキャストマッチング
    3. 結果サマリ返却
    """
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
    forecast_matcher = ForecastMatcher(db) if FORECAST_AVAILABLE else None

    # 各受注レコードを処理
    for idx, record in enumerate(submission.records):
        try:
            # 重複チェック
            existing = db.query(Order).filter(Order.order_no == record.order_no).first()
            if existing:
                skipped_records += 1
                error_details.append(f"受注番号 {record.order_no} は既に存在します")
                continue

            # 得意先チェック
            customer = (
                db.query(Customer)
                .filter(Customer.customer_code == record.customer_code)
                .first()
            )
            if not customer:
                failed_records += 1
                error_details.append(
                    f"得意先コード {record.customer_code} が見つかりません"
                )
                continue

            # 受注ヘッダ作成
            db_order = Order(
                order_no=record.order_no,
                customer_code=record.customer_code,
                order_date=record.order_date if record.order_date else None,
                status="open",
            )
            db.add(db_order)
            db.flush()
            created_orders += 1

            # 受注明細作成
            for line in record.lines:
                # 製品チェック
                product = (
                    db.query(Product)
                    .filter(Product.product_code == line.product_code)
                    .first()
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
                    error_details.append(
                        f"受注 {record.order_no} 明細 {line.line_no}: {exc}"
                    )
                    continue

                db_line = OrderLine(
                    order_id=db_order.id,
                    line_no=line.line_no,
                    product_code=line.product_code,
                    quantity=float(internal_qty),
                    unit=product.internal_unit,
                    due_date=line.due_date,
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
                        print(
                            f"⚠️  Forecast matching failed for order {record.order_no} line {line.line_no}: {e}"
                        )

                created_lines += 1

            processed_records += 1

        except Exception as e:
            failed_records += 1
            error_details.append(f"受注 {record.order_no}: {str(e)}")

    # OCR取込ログ作成
    status = (
        "success"
        if failed_records == 0
        else ("partial" if processed_records > 0 else "failed")
    )

    ocr_log = OcrSubmission(
        submission_id=submission_id,
        source_file=submission.file_name,
        source=submission.source,
        operator=submission.operator,
        schema_version=submission.schema_version,
        target_type="order",
        status=status,
        total_records=total_records,
        processed_records=processed_records,
        failed_records=failed_records,
        skipped_records=skipped_records,
        error_details="\n".join(error_details) if error_details else None,
    )
    db.add(ocr_log)
    db.commit()

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


@router.get("/ai-ocr/submissions", response_model=List[OcrSubmissionResponse])
def list_ocr_submissions(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """OCR取込ログ一覧取得"""
    submissions = (
        db.query(OcrSubmission)
        .order_by(OcrSubmission.submission_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        OcrSubmissionResponse(
            status=s.status,
            submission_id=s.submission_id,
            created_orders=s.processed_records,
            created_lines=0,  # 明細数は別途集計が必要
            total_records=s.total_records,
            processed_records=s.processed_records,
            failed_records=s.failed_records,
            skipped_records=s.skipped_records,
            error_details=s.error_details,
        )
        for s in submissions
    ]


# ===== SAP Sync =====
@router.post("/sap/register", response_model=SapRegisterResponse)
def register_to_sap(request: SapRegisterRequest, db: Session = Depends(get_db)):
    """
    SAP連携(手動送信)

    注意: 実際のSAP APIは実装されていません。
    これはモック実装です。
    """
    # 対象受注の取得
    orders = []

    if request.target.type == "order_no":
        order = db.query(Order).filter(Order.order_no == request.target.value).first()
        if order:
            orders.append(order)
    elif request.target.type == "order_id":
        order = db.query(Order).filter(Order.id == request.target.value).first()
        if order:
            orders.append(order)
    else:
        raise HTTPException(status_code=400, detail="未対応のtarget.type")

    if not orders:
        raise HTTPException(status_code=404, detail="対象受注が見つかりません")

    sent = 0
    for order in orders:
        # SAP送信(モック)
        payload = {
            "order_no": order.order_no,
            "customer_code": order.customer_code,
            "order_date": str(order.order_date) if order.order_date else None,
            "lines": [
                {
                    "line_no": line.line_no,
                    "product_code": line.product_code,
                    "quantity": line.quantity,
                }
                for line in order.lines
            ],
        }

        # モック: 成功として処理
        sap_order_id = f"SAP-{order.order_no}"
        sap_status = "posted"

        # 受注更新
        order.sap_order_id = sap_order_id
        order.sap_status = sap_status
        order.sap_sent_at = datetime.now()

        # SAP連携ログ作成
        log = SapSyncLog(
            order_id=order.id,
            payload=json.dumps(payload),
            result=json.dumps({"sap_order_id": sap_order_id, "status": sap_status}),
            status="success",
        )
        db.add(log)
        sent += 1

    db.commit()

    return SapRegisterResponse(
        status="success",
        sap_order_id=sap_order_id,
        sap_status=sap_status,
        sent=sent,
    )


@router.get("/sap/logs", response_model=List[SapSyncLogResponse])
def list_sap_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """SAP連携ログ一覧取得"""
    logs = (
        db.query(SapSyncLog)
        .order_by(SapSyncLog.executed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return logs
