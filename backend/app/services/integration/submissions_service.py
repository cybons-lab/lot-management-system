"""
External submissions service - unified processing for external order intake.

Domain-focused naming: "submission" (not "ocr" - input channel agnostic).
Supports multiple input channels: OCR, Excel, API, EDI, etc.

Refactored: Consolidates duplicate submission processing from multiple routers.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.masters_models import Customer, Product
from app.models.orders_models import Order, OrderLine
from app.schemas.integration.integration_schema import (
    OcrOrderRecord,
    SubmissionRequest,
    SubmissionResponse,
)
from app.services.common.quantity_service import QuantityConversionError, to_internal_qty


logger = logging.getLogger(__name__)

# Optional forecast matching
try:
    from app.services.forecasts.forecast_service import ForecastService

    FORECAST_AVAILABLE = True
except ImportError:
    FORECAST_AVAILABLE = False
    logger.warning("⚠️ ForecastService not available - forecast matching will be skipped")


# ============================
# Domain Models (Internal)
# ============================


class ExternalSubmissionRecord:
    """
    Normalized external submission record (input-channel agnostic).

    Can be created from OCR, Excel, API, EDI, or other sources.
    """

    def __init__(
        self,
        order_no: str,
        customer_code: str,
        order_date: datetime | None,
        lines: list,
    ):
        """
        Initialize submission record.

        Args:
            order_no: Order number
            customer_code: Customer code
            order_date: Order date (optional)
            lines: List of line items
        """
        self.order_no = order_no
        self.customer_code = customer_code
        self.order_date = order_date
        self.lines = lines


# ============================
# Service Functions
# ============================


def normalize_external_submission(submission: SubmissionRequest) -> list[ExternalSubmissionRecord]:
    """
    Normalize external submission data to domain model (input-channel agnostic).

    Supports multiple input channels:
    - OCR: payload.records with OCR-specific structure
    - Excel: payload.records with Excel-specific structure
    - API: payload.records with standard structure
    - Future: EDI, CSV, etc.

    Args:
        submission: Submission request (from any channel)

    Returns:
        List of normalized submission records

    Raises:
        ValueError: If payload parsing fails
    """
    source = submission.source.lower()

    try:
        records_data = submission.payload.get("records", [])
        if not records_data:
            raise ValueError("payload に 'records' が含まれていません")

        # Channel-specific parsing
        if source in ("ocr", "excel", "api"):
            # For now, OCR/Excel/API use same structure (OcrOrderRecord)
            # Future: Add channel-specific parsers as needed
            ocr_records = [OcrOrderRecord(**rec) for rec in records_data]

            # Convert to normalized domain model
            normalized = []
            for ocr_rec in ocr_records:
                normalized.append(
                    ExternalSubmissionRecord(
                        order_no=ocr_rec.order_no,
                        customer_code=ocr_rec.customer_code,
                        order_date=ocr_rec.order_date,
                        lines=ocr_rec.lines,
                    )
                )
            return normalized
        else:
            raise ValueError(f"未対応のソース種別: {source}")

    except Exception as e:
        raise ValueError(f"payload のパース失敗: {str(e)}") from e


def validate_submission(
    db: Session, record: ExternalSubmissionRecord
) -> tuple[bool, Customer | None, str | None]:
    """
    Validate submission record.

    Args:
        db: Database session
        record: Normalized submission record

    Returns:
        Tuple of (is_valid, customer_entity, error_message)
    """
    # Check for duplicate order
    existing = db.query(Order).filter(Order.order_number == record.order_no).first()
    if existing:
        return False, None, f"受注番号 {record.order_no} は既に存在します"

    # Validate customer exists
    customer = db.query(Customer).filter(Customer.customer_code == record.customer_code).first()
    if not customer:
        return False, None, f"得意先コード {record.customer_code} が見つかりません"

    return True, customer, None


def map_submission_to_domain(
    db: Session,
    record: ExternalSubmissionRecord,
    customer: Customer,
) -> Order:
    """
    Map normalized submission to domain entities (Order).

    Args:
        db: Database session
        record: Normalized submission record
        customer: Validated customer entity

    Returns:
        Created order entity
    """
    order = Order(
        order_number=record.order_no,
        customer_id=customer.id,
        delivery_place_id=customer.id,  # TODO: Get from request if available
        order_date=record.order_date if record.order_date else None,
        status="pending",
    )
    db.add(order)
    db.flush()
    return order


def persist_submission_line(
    db: Session,
    order: Order,
    line_data,
    forecast_matcher,
) -> tuple[bool, str | None]:
    """
    Persist single order line from submission.

    Args:
        db: Database session
        order: Parent order
        line_data: Line data from submission
        forecast_matcher: Forecast matcher (optional)

    Returns:
        Tuple of (success, error_message)
    """
    # Validate product exists
    product = db.query(Product).filter(Product.maker_part_code == line_data.product_code).first()
    if not product:
        return False, f"製品コード {line_data.product_code} が見つかりません"

    # Convert quantity to internal unit
    try:
        internal_qty = to_internal_qty(
            product=product,
            qty_external=line_data.quantity,
            external_unit=line_data.external_unit,
        )
    except QuantityConversionError as exc:
        return False, str(exc)

    # Create order line
    order_line = OrderLine(
        order_id=order.id,
        product_id=product.id,
        order_quantity=float(internal_qty),
        unit=product.base_unit,
        delivery_date=line_data.due_date,
    )
    db.add(order_line)
    db.flush()

    # Optional forecast matching
    if forecast_matcher and order.order_date:
        try:
            forecast_matcher.apply_forecast_to_order_line(
                order_line=order_line,
                product_code=line_data.product_code,
                customer_code=order.customer.customer_code if order.customer else "",
                order_date=order.order_date,
            )
        except Exception as e:
            logger.warning(
                f"⚠️ Forecast matching failed for order {order.order_number} "
                f"line {line_data.line_no}: {e}"
            )

    return True, None


def persist_submission(
    db: Session,
    record: ExternalSubmissionRecord,
    customer: Customer,
    forecast_matcher,
) -> tuple[int, int, list[str]]:
    """
    Persist submission to database (order with lines).

    Args:
        db: Database session
        record: Normalized submission record
        customer: Validated customer entity
        forecast_matcher: Forecast matcher (optional)

    Returns:
        Tuple of (created_orders, created_lines, errors)
    """
    errors = []

    # Create order header
    order = map_submission_to_domain(db, record, customer)
    created_orders = 1
    created_lines = 0

    # Persist order lines
    for line in record.lines:
        success, error = persist_submission_line(db, order, line, forecast_matcher)
        if success:
            created_lines += 1
        else:
            errors.append(f"受注 {record.order_no} 明細 {line.line_no}: {error}")

    return created_orders, created_lines, errors


def build_submission_response(
    submission_id: str,
    source: str,
    total_records: int,
    processed_records: int,
    failed_records: int,
    skipped_records: int,
    created_orders: int,
    created_lines: int,
    error_details: list[str],
) -> SubmissionResponse:
    """
    Build submission response.

    Args:
        submission_id: Submission ID
        source: Submission source (ocr, excel, api, etc.)
        total_records: Total records
        processed_records: Successfully processed records
        failed_records: Failed records
        skipped_records: Skipped records
        created_orders: Created orders count
        created_lines: Created lines count
        error_details: List of error messages

    Returns:
        Submission response
    """
    status = (
        "success" if failed_records == 0 else ("partial" if processed_records > 0 else "failed")
    )

    return SubmissionResponse(
        status=status,
        submission_id=submission_id,
        source=source,
        created_records=created_orders,
        total_records=total_records,
        processed_records=processed_records,
        failed_records=failed_records,
        skipped_records=skipped_records,
        error_details="\n".join(error_details) if error_details else None,
        submitted_at=datetime.now(),
    )


# ============================
# Main Service Function
# ============================


def process_external_submission(
    db: Session,
    submission: SubmissionRequest,
) -> SubmissionResponse:
    """
    Process external submission (input-channel agnostic).

    Unified processing for:
    - OCR submissions
    - Excel imports
    - API submissions
    - Future: EDI, CSV, etc.

    Replaces:
    - integration_router.submit_ocr_data
    - submissions_router._process_ocr_submission

    Args:
        db: Database session
        submission: Submission request (from any channel)

    Returns:
        Submission response

    Raises:
        ValueError: If payload parsing fails
    """
    submission_id = f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-{submission.source}"

    # Step 1: Normalize external data to domain model
    try:
        records = normalize_external_submission(submission)
    except ValueError as e:
        logger.error(f"Submission normalization failed: {e}")
        raise

    # Initialize counters
    total_records = len(records)
    processed_records = 0
    failed_records = 0
    skipped_records = 0
    created_orders = 0
    created_lines = 0
    error_details = []

    # Initialize forecast matcher
    forecast_matcher = ForecastService(db) if FORECAST_AVAILABLE else None

    # Step 2-4: Validate, map, and persist each record
    for record in records:
        try:
            # Step 2: Validate
            is_valid, customer, error = validate_submission(db, record)

            if not is_valid:
                if customer is None and "既に存在します" in (error or ""):
                    skipped_records += 1
                else:
                    failed_records += 1
                if error:
                    error_details.append(error)
                continue

            # Step 3-4: Map to domain and persist
            orders, lines, errors = persist_submission(db, record, customer, forecast_matcher)

            processed_records += 1
            created_orders += orders
            created_lines += lines
            if errors:
                error_details.extend(errors)

        except Exception as e:
            failed_records += 1
            error_details.append(f"受注 {record.order_no}: {str(e)}")

    # Commit transaction
    db.commit()

    # Log result
    logger.info(
        f"External submission completed ({submission.source}): "
        f"{processed_records}/{total_records} 件成功, "
        f"{failed_records} 件失敗, {skipped_records} 件スキップ"
    )

    # Step 5: Build response
    return build_submission_response(
        submission_id=submission_id,
        source=submission.source,
        total_records=total_records,
        processed_records=processed_records,
        failed_records=failed_records,
        skipped_records=skipped_records,
        created_orders=created_orders,
        created_lines=created_lines,
        error_details=error_details,
    )
