"""Submissions API (Phase 3-5: v2.2.1) - Generic data intake endpoint."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Customer, Order, OrderLine, Product
from app.schemas.integration_schema import (
    OcrOrderRecord,
    SubmissionRequest,
    SubmissionResponse,
)
from app.services.quantity_service import QuantityConversionError, to_internal_qty


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/submissions", tags=["submissions"])

# フォーキャストマッチング機能（オプション）
try:
    from app.services.forecast_service import ForecastService

    FORECAST_AVAILABLE = True
except ImportError:
    FORECAST_AVAILABLE = False
    logger.warning("⚠️ ForecastService not available - forecast matching will be skipped")


@router.post("", response_model=SubmissionResponse)
def create_submission(submission: SubmissionRequest, db: Session = Depends(get_db)):
    """
    汎用サブミッション登録（v2.2.1準拠）.

    外部から取り込まれる入荷情報・受注情報などの受付口として、
    用途に依存しない汎用的な submissions リソースとして統合。

    Args:
        submission: サブミッションリクエスト
        db: データベースセッション

    Returns:
        SubmissionResponse: 取込結果

    Note:
        - source: "ocr", "excel", "api" など
        - payload: 任意のデータ構造（sourceに応じて処理を分岐）
    """
    submission_id = f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-{submission.source}"

    # ソース種別に応じて処理を分岐
    if submission.source.lower() == "ocr":
        return _process_ocr_submission(submission, submission_id, db)
    elif submission.source.lower() == "excel":
        # 将来実装: Excel取込処理
        raise HTTPException(
            status_code=501, detail="Excel取込は未実装です。OCRソースを使用してください。"
        )
    elif submission.source.lower() == "api":
        # 将来実装: API経由の受注取込
        raise HTTPException(
            status_code=501, detail="API取込は未実装です。OCRソースを使用してください。"
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"未対応のソース種別: {submission.source}。対応: ocr, excel, api",
        )


def _process_ocr_submission(
    submission: SubmissionRequest, submission_id: str, db: Session
) -> SubmissionResponse:
    """
    OCR取込処理（既存の integration/ai-ocr/submit の移植）.

    Args:
        submission: サブミッションリクエスト
        submission_id: サブミッションID
        db: データベースセッション

    Returns:
        SubmissionResponse: 取込結果
    """
    # payloadからOCR受注レコードを抽出
    try:
        records_data = submission.payload.get("records", [])
        if not records_data:
            raise HTTPException(status_code=400, detail="payload に 'records' が含まれていません")

        # OCROrderRecordに変換
        records = [OcrOrderRecord(**rec) for rec in records_data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"payload のパース失敗: {str(e)}")

    total_records = len(records)
    processed_records = 0
    failed_records = 0
    skipped_records = 0
    created_orders = 0
    created_lines = 0
    error_details = []

    # フォーキャストマッチャーの初期化
    forecast_matcher = ForecastService(db) if FORECAST_AVAILABLE else None

    # 各受注レコードを処理
    for _idx, record in enumerate(records):
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
                        f"受注 {record.order_no} 明細 {line.line_no}: "
                        f"製品コード {line.product_code} が見つかりません"
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
                            product_code=line.product_code,  # from request payload
                            customer_code=record.customer_code,
                            order_date=db_order.order_date,
                        )
                    except Exception as e:
                        # フォーキャストマッチングエラーは警告のみ
                        logger.warning(
                            f"⚠️ Forecast matching failed for order {record.order_no} "
                            f"line {line.line_no}: {e}"
                        )

                created_lines += 1

            processed_records += 1

        except Exception as e:
            failed_records += 1
            error_details.append(f"受注 {record.order_no}: {str(e)}")

    # コミット
    db.commit()

    # ステータス判定
    status = (
        "success" if failed_records == 0 else ("partial" if processed_records > 0 else "failed")
    )

    logger.info(
        f"OCR取込完了 (submissions API): {processed_records}/{total_records} 件成功, "
        f"{failed_records} 件失敗, {skipped_records} 件スキップ"
    )

    return SubmissionResponse(
        status=status,
        submission_id=submission_id,
        source=submission.source,
        created_records=created_orders,
        total_records=total_records,
        processed_records=processed_records,
        failed_records=failed_records,
        skipped_records=skipped_records,
        error_details="\n".join(error_details) if error_details else None,
        submitted_at=datetime.now(),
    )
