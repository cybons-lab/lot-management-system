"""OCR結果（リアルタイムビュー）API ルーター.

v_ocr_resultsビューから直接データを取得し、
SmartRead縦持ちデータと出荷用マスタをJOINした結果を返す。
"""

import logging
import re
from datetime import date, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.application.services.calendar_service import CalendarService
from app.application.services.common.export_service import ExportService
from app.application.services.ocr.ocr_deletion_service import delete_ocr_results_service
from app.application.services.sap.sap_reconciliation_service import SapReconciliationService
from app.application.services.smartread.completion_service import SmartReadCompletionService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.smartread_models import OcrResultEdit, SmartReadLongData
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.schemas.calendar.calendar_schemas import BusinessDayCalculationRequest
from app.presentation.schemas.ocr_import_schema import (
    SmartReadDeletionRequest,
    SmartReadDeletionResponse,
)
from app.presentation.schemas.smartread_schema import SmartReadCompletionRequest


router = APIRouter(prefix="/ocr-results", tags=["OCR Results"])
logger = logging.getLogger(__name__)


class OcrResultItem(BaseModel):
    """OCR結果アイテム."""

    id: int
    wide_data_id: int | None = None
    config_id: int
    task_id: str
    task_date: date
    request_id_ref: int | None = None
    row_index: int
    status: str
    error_reason: str | None = None
    content: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    # OCR由来
    customer_code: str | None = None
    material_code: str | None = None
    jiku_code: str | None = None
    delivery_date: str | None = None
    delivery_quantity: str | None = None
    item_no: str | None = None
    order_unit: str | None = None
    inbound_no: str | None = None
    lot_no: str | None = None
    lot_no_1: str | None = None  # OCR由来1
    quantity_1: str | None = None  # OCR由来1
    lot_no_2: str | None = None  # OCR由来2
    quantity_2: str | None = None  # OCR由来2

    # 手入力結果
    manual_lot_no_1: str | None = None
    manual_quantity_1: str | None = None
    manual_lot_no_2: str | None = None
    manual_quantity_2: str | None = None
    manual_inbound_no: str | None = None
    manual_inbound_no_2: str | None = None  # Added
    manual_shipping_date: date | None = None
    manual_shipping_slip_text: str | None = None
    manual_shipping_slip_text_edited: bool | None = None
    manual_jiku_code: str | None = None
    manual_material_code: str | None = None
    manual_updated_at: datetime | None = None
    manual_version: int = 0

    # マスタ由来
    master_id: int | None = None
    customer_name: str | None = None
    supplier_code: str | None = None
    supplier_name: str | None = None
    delivery_place_code: str | None = None
    delivery_place_name: str | None = None
    shipping_warehouse_code: str | None = None
    shipping_warehouse_name: str | None = None
    shipping_slip_text: str | None = None
    transport_lt_days: int | None = None
    customer_part_no: str | None = None
    maker_part_no: str | None = None
    has_order: bool | None = None

    # エラーフラグ
    master_not_found: bool = False
    jiku_format_error: bool = False
    date_format_error: bool = False
    has_error: bool = False

    # 手入力・補完結果の追加分
    manual_delivery_quantity: str | None = None

    # 処理ステータス: pending/downloaded/sap_linked/completed
    process_status: str = "pending"

    # SAP照合結果
    sap_match_type: str | None = None
    sap_matched_zkdmat_b: str | None = None
    sap_supplier_code: str | None = None
    sap_supplier_name: str | None = None
    sap_qty_unit: str | None = None
    sap_maker_item: str | None = None
    sap_raw_data: dict[str, Any] | None = None

    # エラーフラグ内容（DB保存分）
    error_flags: dict[str, bool] = Field(default_factory=dict)

    # 計算結果
    calculated_shipping_date: date | None = None

    model_config = {"from_attributes": True}


class OcrResultListResponse(BaseModel):
    """OCR結果一覧レスポンス."""

    items: list[OcrResultItem]
    total: int


class OcrResultsExportRow(BaseModel):
    """OCR結果エクスポート用データ.

    カラム順序は業務要件に従って定義。
    """

    # 手入力ロット情報
    lot_no_1: str | None = None
    quantity_1: str | None = None  # 受注数量-1
    inbound_no_1: str | None = None  # 入庫No-1 (renamed from inbound_no)
    lot_no_2: str | None = None
    quantity_2: str | None = None  # 受注数量-2
    inbound_no_2: str | None = None  # 入庫No-2

    shipping_date: str | None = None  # YYYY/MM/DD形式 (出荷予定日)
    shipping_slip_text: str | None = None  # 出荷票テキスト (編集後/計算後)

    # OCR由来
    data_source: str | None = None  # 取得元（固定値"OCR"）
    material_code: str | None = None
    jiku_code: str | None = None
    delivery_date: str | None = None  # 受注納期
    delivery_quantity: str | None = None  # 納入量
    item_no: str | None = None
    customer_part_no: str | None = None  # 先方品番
    maker_part_no: str | None = None  # メーカー品番
    order_unit: str | None = None  # 数量単位

    # マスタ由来
    customer_name: str | None = None  # 得意先
    supplier_code: str | None = None  # 仕入先
    supplier_name: str | None = None  # 仕入先名称
    shipping_warehouse_code: str | None = None  # 出荷倉庫
    shipping_warehouse_name: str | None = None  # 出荷倉庫名称
    delivery_place_code: str | None = None  # 納入場所
    delivery_place_name: str | None = None  # 納入場所名称

    shipping_slip_text_master: str | None = None  # 出荷票テキスト(マスタ) - 備考の左
    remarks: str | None = None  # 備考
    transport_lt: int | None = None  # 輸送LT

    model_config = {"from_attributes": True}


class OcrResultEditRequest(BaseModel):
    """OCR結果手入力の更新リクエスト."""

    version: int = Field(..., description="楽観的ロック用バージョン")
    lot_no_1: str | None = None
    quantity_1: str | None = None
    lot_no_2: str | None = None
    quantity_2: str | None = None
    inbound_no: str | None = None
    inbound_no_2: str | None = None  # Added
    shipping_date: date | None = None
    shipping_slip_text: str | None = None
    shipping_slip_text_edited: bool | None = None
    jiku_code: str | None = None
    material_code: str | None = None
    delivery_quantity: str | None = None
    delivery_date: str | None = None
    process_status: str | None = None
    error_flags: dict[str, bool] | None = None


class OcrResultEditResponse(BaseModel):
    """OCR結果手入力の保存結果."""

    id: int
    smartread_long_data_id: int
    version: int
    lot_no_1: str | None = None
    quantity_1: str | None = None
    lot_no_2: str | None = None
    quantity_2: str | None = None
    inbound_no: str | None = None
    inbound_no_2: str | None = None  # Added
    shipping_date: date | None = None
    shipping_slip_text: str | None = None
    shipping_slip_text_edited: bool
    jiku_code: str | None = None
    material_code: str | None = None
    delivery_quantity: str | None = None
    process_status: str
    error_flags: dict[str, bool]
    updated_at: datetime

    model_config = {"from_attributes": True}


def build_shipping_slip_text(
    template: str | None,
    inbound_no: str | None,
    lot_no_1: str | None,
    quantity_1: str | None,
    lot_no_2: str | None,
    quantity_2: str | None,
    shipping_date: str | None = None,
    delivery_date: str | None = None,
    inbound_no_2: str | None = None,
) -> str | None:
    """出荷票テンプレートにロット・入庫・日付情報を反映.

    確定仕様 (2026-01-31) に基づく置換ロジック:
    - 日付プレースホルダー: ▲/▲ (出荷日), ●/● (納期) を mm/dd 形式に置換
    - 数量表記: 半角カッコ (数量)、数量が空欄の場合はカッコごと非表示
    - 複数項目の区切り: / (スラッシュ)
    - シナリオ分岐: Case A/B/C に応じた置換
    """
    if not template:
        return None

    result = template

    # テンプレート内のプレースホルダー判定
    has_inbound_placeholder = "入庫番号" in result
    has_lot_placeholder = "ロット" in result

    # 日付フォーマット変換 (YYYY-MM-DD または YYYY/MM/DD → mm/dd)
    def format_date_mmdd(date_str: str | None) -> str | None:
        if not date_str:
            return None
        try:
            # ハイフンまたはスラッシュを許容
            cleaned = str(date_str).replace("-", "/")
            dt = datetime.strptime(cleaned, "%Y/%m/%d")
            return dt.strftime("%m/%d")
        except (ValueError, Exception):
            return None

    # 1. 日付プレースホルダーの置換
    # 出荷日 ▲/▲ (▲▲/▲▲ などの揺らぎにも対応)
    if shipping_date:
        shipping_date_formatted = format_date_mmdd(shipping_date)
        if shipping_date_formatted:
            # count=1 で最初に見つかったものだけ置換
            result = re.sub(r"▲+/▲+", shipping_date_formatted, result, count=1)

    # 納期 ●/●
    if delivery_date:
        delivery_date_formatted = format_date_mmdd(delivery_date)
        if delivery_date_formatted:
            # count=1 で最初に見つかったものだけ置換
            result = re.sub(r"●+/●+", delivery_date_formatted, result, count=1)

    # 2. ロット・入庫番号の置換 (シナリオ分岐)
    # ロット情報の構築（数量がある場合のみカッコ付き）
    def build_lot_with_quantity(lot: str | None, qty: str | None) -> str | None:
        if not lot:
            return None
        if qty:
            return f"{lot}({qty})"
        return lot

    lot_1_text = build_lot_with_quantity(lot_no_1, quantity_1)
    lot_2_text = build_lot_with_quantity(lot_no_2, quantity_2)

    # 複数ロットをスラッシュで結合
    lot_combined = None
    if lot_1_text and lot_2_text:
        lot_combined = f"{lot_1_text}/{lot_2_text}"
    elif lot_1_text:
        lot_combined = lot_1_text
    elif lot_2_text:
        lot_combined = lot_2_text

    # Case A: テンプレートに「入庫番号」のみがある場合（ロットプレースホルダーなし）
    if has_inbound_placeholder and not has_lot_placeholder:
        # 入庫番号のみを置換する（数量がある場合は入庫番号(数量)形式）
        inbound_1_with_qty = build_lot_with_quantity(inbound_no, quantity_1)
        inbound_2_with_qty = (
            build_lot_with_quantity(inbound_no_2, quantity_2) if inbound_no_2 else None
        )

        # 入庫番号部分の構築（複数入庫番号はスラッシュで区切り）
        inbound_combined = None
        if inbound_1_with_qty and inbound_2_with_qty:
            inbound_combined = f"{inbound_1_with_qty}/{inbound_2_with_qty}"
        elif inbound_1_with_qty:
            inbound_combined = inbound_1_with_qty
        elif inbound_2_with_qty:
            inbound_combined = inbound_2_with_qty

        if inbound_combined:
            result = result.replace("入庫番号", inbound_combined, 1)

    # Case B: テンプレートに「入庫番号」と「ロット」がある場合
    elif has_inbound_placeholder and has_lot_placeholder:
        # 入庫番号 → 入庫番号（数量なし）
        inbound_combined = None
        if inbound_no and inbound_no_2:
            inbound_combined = f"{inbound_no}/{inbound_no_2}"
        else:
            inbound_combined = inbound_no or inbound_no_2

        if inbound_combined:
            result = result.replace("入庫番号", inbound_combined, 1)

        # ロット → ロット(数量)
        if lot_combined:
            result = result.replace("ロット", lot_combined, 1)

    # Case C: テンプレートに「ロット」のみがある場合（入庫番号プレースホルダーなし）
    elif has_lot_placeholder and not has_inbound_placeholder:
        if lot_combined:
            result = result.replace("ロット", lot_combined, 1)

    return result


@router.get("", response_model=OcrResultListResponse)
async def list_ocr_results(
    task_date: Annotated[str | None, Query(description="タスク日付 (YYYY-MM-DD)")] = None,
    status: Annotated[str | None, Query(description="ステータスでフィルタ")] = None,
    has_error: Annotated[bool | None, Query(description="エラーのみ表示")] = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> OcrResultListResponse:
    """OCR結果一覧を取得（v_ocr_resultsビューから）."""
    logger.debug(
        "OCR results list requested",
        extra={
            "task_date": task_date,
            "status": status,
            "has_error": has_error,
            "limit": limit,
            "offset": offset,
        },
    )
    # ビューからデータを取得
    query = "SELECT * FROM v_ocr_results WHERE 1=1"
    params: dict[str, Any] = {}

    if task_date:
        query += " AND task_date = :task_date"
        params["task_date"] = datetime.fromisoformat(task_date).date()

    if status:
        query += " AND status = :status"
        params["status"] = status

    if has_error is True:
        query += " AND has_error = true"
    elif has_error is False:
        query += " AND has_error = false"

    # 並び順（OCR取込順: 新しい取込バッチ -> 行番号）
    query += (
        " ORDER BY task_date DESC, COALESCE(request_id_ref, 0) DESC, "
        "task_id DESC, row_index ASC, id ASC"
    )

    # ページネーション
    query += " LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset

    result = db.execute(text(query), params)
    rows = result.mappings().all()

    # 総件数取得
    count_query = "SELECT COUNT(*) FROM v_ocr_results WHERE 1=1"
    count_params: dict[str, Any] = {}
    if task_date:
        count_query += " AND task_date = :task_date"
        count_params["task_date"] = params["task_date"]
    if status:
        count_query += " AND status = :status"
        count_params["status"] = status
    if has_error is True:
        count_query += " AND has_error = true"
    elif has_error is False:
        count_query += " AND has_error = false"

    total_result = db.execute(text(count_query), count_params)
    total = total_result.scalar() or 0

    items = [OcrResultItem.model_validate(dict(row)) for row in rows]

    # SAP照合処理を追加
    sap_service = SapReconciliationService(db)
    sap_service.load_sap_cache(kunnr="100427105")  # デフォルト得意先

    for item in items:
        if item.material_code:
            # SAP照合を実行
            sap_result = sap_service.reconcile_single(
                material_code=item.material_code,
                jiku_code=item.jiku_code or "",
                customer_code=item.customer_code or "100427105",
            )

            # 照合結果を追加
            item.sap_match_type = (
                sap_result.sap_match_type.value if sap_result.sap_match_type else None
            )
            item.sap_matched_zkdmat_b = sap_result.sap_matched_zkdmat_b

            # SAP raw_dataから情報を抽出
            if sap_result.sap_raw_data:
                item.sap_supplier_code = sap_result.sap_raw_data.get("ZLIFNR_H")
                item.sap_qty_unit = sap_result.sap_raw_data.get("MEINS")
                item.sap_maker_item = sap_result.sap_raw_data.get("ZMKMAT_B")

                # 仕入先名は既にマスタから取得されている場合があるので、
                # SAP仕入先コードがある場合のみ追加情報として保持
                # (仕入先名の取得はフロントエンドで行うか、別途マスタから取得可能)

        # 出荷日の自動計算（transport_lt_daysとdelivery_dateがある場合）
        if item.transport_lt_days and item.delivery_date:
            try:
                # 納期をdate型に変換
                delivery_date_obj = datetime.strptime(item.delivery_date, "%Y-%m-%d").date()

                # CalendarServiceで営業日計算
                calendar_service = CalendarService(db)
                request = BusinessDayCalculationRequest(
                    start_date=delivery_date_obj,
                    days=item.transport_lt_days,
                    direction="before",
                    include_start=False,
                )
                item.calculated_shipping_date = calendar_service.calculate_business_day(request)
            except (ValueError, Exception):
                # 日付フォーマットエラーや計算エラーは無視
                pass

    logger.info(
        "OCR results fetched",
        extra={"total": total, "returned_count": len(items), "task_date": task_date},
    )
    return OcrResultListResponse(items=items, total=total)


@router.get("/completed", response_model=OcrResultListResponse)
async def list_completed_ocr_results(
    task_date: Annotated[str | None, Query(description="タスク日付 (YYYY-MM-DD)")] = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> OcrResultListResponse:
    """完了済み（アーカイブ）のOCR結果一覧を取得."""
    logger.debug(
        "Completed OCR results requested",
        extra={"task_date": task_date, "limit": limit, "offset": offset},
    )
    from sqlalchemy import func, select

    from app.infrastructure.persistence.models.smartread_models import (
        OcrResultEditCompleted,
        SmartReadLongDataCompleted,
    )

    # Base query for completed items
    stmt = select(SmartReadLongDataCompleted).order_by(
        SmartReadLongDataCompleted.task_date.desc(),
        func.coalesce(SmartReadLongDataCompleted.request_id_ref, 0).desc(),
        SmartReadLongDataCompleted.task_id.desc(),
        SmartReadLongDataCompleted.row_index.asc(),
        SmartReadLongDataCompleted.id.asc(),
    )

    # Filters
    if task_date:
        stmt = stmt.where(
            SmartReadLongDataCompleted.task_date == datetime.fromisoformat(task_date).date()
        )

    # Pagination
    stmt_limit = stmt.limit(limit).offset(offset)
    long_rows = db.scalars(stmt_limit).all()

    # Total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    if not long_rows:
        return OcrResultListResponse(items=[], total=0)

    # Fetch associated edits
    long_ids = [row.id for row in long_rows]
    edits = db.scalars(
        select(OcrResultEditCompleted).where(
            OcrResultEditCompleted.smartread_long_data_completed_id.in_(long_ids)
        )
    ).all()
    edits_map = {edit.smartread_long_data_completed_id: edit for edit in edits}

    items = []
    for row in long_rows:
        content = row.content or {}
        edit = edits_map.get(row.id)

        # Map to OcrResultItem
        # Note: Master data fields will be empty as we don't join with master tables here.
        # This is acceptable for archive view.
        item = OcrResultItem(
            id=row.id,
            wide_data_id=row.wide_data_id,
            config_id=row.config_id,
            task_id=row.task_id,
            task_date=row.task_date,
            request_id_ref=row.request_id_ref,
            row_index=row.row_index,
            status=row.status,
            content=content,
            created_at=row.created_at,
            # OCR derived
            customer_code=content.get("得意先コード"),
            material_code=content.get("材質コード") or content.get("材料コード"),
            jiku_code=content.get("次区") or content.get("次区コード"),
            delivery_date=content.get("納期"),
            delivery_quantity=content.get("納入数") or content.get("数量"),
            item_no=content.get("アイテムNo"),
            order_unit=content.get("単位"),
            inbound_no=content.get("入庫No") or content.get("入庫番号"),
            lot_no=content.get("ロットNo") or content.get("ロット番号"),
            # Edits
            manual_lot_no_1=edit.lot_no_1 if edit else None,
            manual_quantity_1=edit.quantity_1 if edit else None,
            manual_lot_no_2=edit.lot_no_2 if edit else None,
            manual_quantity_2=edit.quantity_2 if edit else None,
            manual_inbound_no=edit.inbound_no if edit else None,
            manual_inbound_no_2=edit.inbound_no_2 if edit else None,
            manual_shipping_date=edit.shipping_date if edit else None,
            manual_shipping_slip_text=edit.shipping_slip_text if edit else None,
            manual_shipping_slip_text_edited=edit.shipping_slip_text_edited if edit else None,
            manual_jiku_code=edit.jiku_code if edit else None,
            manual_material_code=edit.material_code if edit else None,
            manual_delivery_quantity=edit.delivery_quantity if edit else None,
            manual_updated_at=edit.updated_at if edit else None,
            error_flags=edit.error_flags if edit else {},
            process_status=edit.process_status if edit else "completed",
            # [NEW] SAP Snapshot data from archive
            sap_match_type=edit.sap_match_type if edit else None,
            sap_matched_zkdmat_b=edit.sap_matched_zkdmat_b if edit else None,
            sap_supplier_code=edit.sap_supplier_code if edit else None,
            sap_supplier_name=edit.sap_supplier_name if edit else None,
            sap_qty_unit=edit.sap_qty_unit if edit else None,
            sap_maker_item=edit.sap_maker_item if edit else None,
        )
        items.append(item)

    return OcrResultListResponse(items=items, total=total)


@router.post("/complete", status_code=204)
async def complete_ocr_items(
    request: SmartReadCompletionRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """選択したOCR結果を完了（アーカイブ）にする."""
    logger.info(
        "OCR items completion requested",
        extra={"ids": request.ids, "count": len(request.ids)},
    )
    service = SmartReadCompletionService(db)
    service.mark_as_completed(request.ids)
    logger.info("OCR items completed", extra={"count": len(request.ids)})
    return Response(status_code=204)


@router.post("/restore", status_code=204)
async def restore_ocr_items(
    request: SmartReadCompletionRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """完了済み（アーカイブ）アイテムを復元して未処理に戻す."""
    logger.info(
        "OCR items restore requested",
        extra={"ids": request.ids, "count": len(request.ids)},
    )
    service = SmartReadCompletionService(db)
    service.restore_items(request.ids)
    logger.info("OCR items restored", extra={"count": len(request.ids)})
    return Response(status_code=204)


@router.get("/export/download")
async def export_ocr_results(
    task_date: Annotated[str | None, Query(description="タスク日付 (YYYY-MM-DD)")] = None,
    status: Annotated[str | None, Query(description="ステータスでフィルタ")] = None,
    has_error: Annotated[bool | None, Query(description="エラーのみ表示")] = None,
    # FastAPI handles list query params as ?ids=1&ids=2
    ids: Annotated[list[int] | None, Query(description="IDリストでフィルタ")] = None,
    format: Annotated[str, Query(description="エクスポート形式 (csv/xlsx)")] = "xlsx",
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """OCR結果をExcel/CSVでエクスポート."""
    logger.info(
        "OCR results export started",
        extra={
            "format": format,
            "task_date": task_date,
            "status": status,
            "has_error": has_error,
            "ids_count": len(ids) if ids else 0,
        },
    )
    query = "SELECT * FROM v_ocr_results WHERE 1=1"
    params: dict[str, Any] = {}

    if ids:
        # ID指定がある場合は他のフィルタより優先（またはAND条件）
        # Selected items should typically override other filters or be a subset.
        # User selection implies specific intent.
        query += " AND id = ANY(:ids)"
        params["ids"] = ids
    else:
        # ID指定がない場合のみ他のフィルタを適用（UI挙動に合わせて調整）
        if task_date:
            query += " AND task_date = :task_date"
            params["task_date"] = datetime.fromisoformat(task_date).date()

        if status:
            query += " AND status = :status"
            params["status"] = status

        if has_error is True:
            query += " AND has_error = true"
        elif has_error is False:
            query += " AND has_error = false"

    query += (
        " ORDER BY task_date DESC, COALESCE(request_id_ref, 0) DESC, "
        "task_id DESC, row_index ASC, id ASC"
    )

    rows = db.execute(text(query), params).mappings().all()

    # エクスポート対象レコードのステータスを "downloaded" に更新
    from sqlalchemy.dialects.postgresql import insert

    export_ids = [row.get("id") for row in rows]
    if export_ids:
        now = datetime.now()
        stmt = insert(OcrResultEdit).values(
            [
                {
                    "smartread_long_data_id": tid,
                    "process_status": "downloaded",
                    "updated_at": now,
                }
                for tid in export_ids
            ]
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_ocr_result_edits_long_data_id",
            set_={"process_status": "downloaded", "updated_at": now},
        )
        db.execute(stmt)
        db.commit()

    # SAPサービスの初期化
    sap_service = SapReconciliationService(db)
    # キャッシュロードはバッチで一括で行うため、ここでは個別行取得のループ内で必要に応じてロードされるが、
    # 効率のため事前にデフォルトロードしておく
    sap_service.load_sap_cache(kunnr="100427105")

    export_rows = []
    for row in rows:
        content = row.get("content") or {}
        remarks = content.get("備考") if isinstance(content, dict) else None
        lot_no_1 = row.get("manual_lot_no_1") or row.get("lot_no_1") or row.get("lot_no")
        quantity_1 = row.get("manual_quantity_1") or row.get("quantity_1")
        lot_no_2 = row.get("manual_lot_no_2") or row.get("lot_no_2")
        quantity_2 = row.get("manual_quantity_2") or row.get("quantity_2")
        inbound_no_1 = row.get("manual_inbound_no") or row.get("inbound_no")
        inbound_no_2 = row.get("manual_inbound_no_2")

        # 出荷日: 1.手入力(またはフロント計算) 2.バックエンド計算 3.OCR生データ
        shipping_date_raw = (
            row.get("manual_shipping_date")
            or row.get("calculated_shipping_date")
            or row.get("shipping_date")
        )
        shipping_date = (
            shipping_date_raw.strftime("%Y/%m/%d")
            if isinstance(shipping_date_raw, date | datetime)
            else None
        )

        # 納期: 1.手入力 2.OCR生データ
        delivery_date_raw = row.get("manual_delivery_date") or row.get("delivery_date")
        delivery_date = None
        if delivery_date_raw:
            if isinstance(delivery_date_raw, date | datetime):
                delivery_date = delivery_date_raw.strftime("%Y/%m/%d")
            else:
                try:
                    # ハイフンまたはスラッシュを許容
                    cleaned = str(delivery_date_raw).replace("-", "/")
                    dt = datetime.strptime(cleaned, "%Y/%m/%d")
                    delivery_date = dt.strftime("%Y/%m/%d")
                except ValueError:
                    delivery_date = str(delivery_date_raw)

        # SAP情報を取得して数量単位を決定
        sap_qty_unit = None
        if row.get("material_code"):
            sap_result = sap_service.reconcile_single(
                material_code=row.get("material_code"),
                jiku_code=row.get("jiku_code") or "",
                customer_code=row.get("customer_code") or "100427105",
            )
            if sap_result.sap_raw_data:
                sap_qty_unit = sap_result.sap_raw_data.get("MEINS")

        order_unit = sap_qty_unit if sap_qty_unit else row.get("order_unit")

        # 出荷票テキスト: ユーザーが手動編集している場合は、空文字であってもそれを優先
        if row.get("manual_shipping_slip_text_edited"):
            shipping_slip_text = row.get("manual_shipping_slip_text")
        else:
            shipping_slip_text = row.get("manual_shipping_slip_text") or row.get(
                "shipping_slip_text"
            )

        # アイテムNo: 下6桁のみ出力
        item_no_raw = row.get("item_no")
        item_no = str(item_no_raw)[-6:] if item_no_raw else None

        # マスタからの追加フィールド (Y列用)
        # 確実にマスタ生データを使用
        shipping_slip_text_master = row.get("shipping_slip_text")
        transport_lt = row.get("transport_lt_days")

        # メーカー品番: SAP側の値を優先
        maker_part_no = (
            sap_result.sap_raw_data.get("ZMKMAT_B")
            if (sap_result and sap_result.sap_raw_data)
            else row.get("maker_part_no")
        )

        export_rows.append(
            OcrResultsExportRow.model_validate(
                {
                    # 手入力ロット情報
                    "lot_no_1": lot_no_1,
                    "quantity_1": quantity_1,
                    "inbound_no_1": inbound_no_1,
                    "lot_no_2": lot_no_2,
                    "quantity_2": quantity_2,
                    "inbound_no_2": inbound_no_2,
                    "shipping_date": shipping_date,
                    "shipping_slip_text": shipping_slip_text,
                    # 取得元（SmartRead経由なので固定値"OCR"）
                    "data_source": "OCR",
                    "material_code": row.get("material_code"),
                    "jiku_code": row.get("jiku_code"),
                    "delivery_date": delivery_date,  # 整形済み納期
                    "delivery_quantity": row.get("delivery_quantity"),
                    "item_no": item_no,  # 下6桁
                    "customer_part_no": row.get("customer_part_no"),
                    "maker_part_no": maker_part_no,  # SAP優先
                    "order_unit": order_unit,  # SAP優先単位
                    # マスタ由来
                    "customer_name": row.get("customer_code"),  # 得意先コードを出力
                    "supplier_code": row.get("supplier_code"),
                    "supplier_name": row.get("supplier_name"),
                    "shipping_warehouse_code": row.get("shipping_warehouse_code"),
                    "shipping_warehouse_name": row.get("shipping_warehouse_name"),
                    "delivery_place_code": row.get("delivery_place_code"),
                    "delivery_place_name": row.get("delivery_place_name"),
                    "shipping_slip_text_master": shipping_slip_text_master,
                    "remarks": remarks,
                    "transport_lt": transport_lt,
                }
            )
        )

    # カラム順序と日本語ヘッダーのマッピング（業務要件に従った順序）
    column_map = {
        "lot_no_1": "LotNo-1",
        "quantity_1": "受注数量-1",
        "inbound_no_1": "入庫No-1",
        "lot_no_2": "LotNo-2",
        "quantity_2": "受注数量-2",
        "inbound_no_2": "入庫No-2",
        "shipping_date": "出荷予定日",
        "shipping_slip_text": "出荷票テキスト",
        "data_source": "取得元",
        "material_code": "材質コード",
        "jiku_code": "次区",
        "delivery_date": "受注納期",
        "delivery_quantity": "納入量",
        "item_no": "アイテムNo",
        "customer_part_no": "先方品番",
        "maker_part_no": "メーカー品番",
        "order_unit": "数量単位",
        "customer_name": "得意先",
        "supplier_code": "仕入先",
        "supplier_name": "仕入先名称",
        "shipping_warehouse_code": "出荷倉庫",
        "shipping_warehouse_name": "出荷倉庫名称",
        "delivery_place_code": "納入場所",
        "delivery_place_name": "納入場所名称",
        "shipping_slip_text_master": "出荷票テキスト",
        "remarks": "備考",
        "transport_lt": "輸送LT",
    }

    filename = f"ocr_results_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    logger.info(
        "OCR results export completed",
        extra={"format": format, "export_count": len(export_rows), "file_name": filename},
    )
    if format == "csv":
        return ExportService.export_to_csv(export_rows, filename=filename)
    return ExportService.export_to_excel(export_rows, filename=filename, column_map=column_map)


@router.get("/{item_id}", response_model=OcrResultItem)
async def get_ocr_result(
    item_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> OcrResultItem:
    """OCR結果詳細を取得."""
    logger.debug("OCR result detail requested", extra={"item_id": item_id})
    query = "SELECT * FROM v_ocr_results WHERE id = :id"
    result = db.execute(text(query), {"id": item_id})
    row = result.mappings().first()

    if not row:
        from fastapi import HTTPException, status

        logger.warning("OCR result not found", extra={"item_id": item_id})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OCR結果 ID={item_id} が見つかりません",
        )

    item = OcrResultItem.model_validate(dict(row))

    # SAP照合処理を追加
    if item.material_code:
        sap_service = SapReconciliationService(db)
        sap_service.load_sap_cache(kunnr="100427105")

        sap_result = sap_service.reconcile_single(
            material_code=item.material_code,
            jiku_code=item.jiku_code or "",
            customer_code=item.customer_code or "100427105",
        )

        item.sap_match_type = sap_result.sap_match_type.value if sap_result.sap_match_type else None
        item.sap_matched_zkdmat_b = sap_result.sap_matched_zkdmat_b

        if sap_result.sap_raw_data:
            item.sap_supplier_code = sap_result.sap_raw_data.get("ZLIFNR_H")
            item.sap_qty_unit = sap_result.sap_raw_data.get("MEINS")
            item.sap_maker_item = sap_result.sap_raw_data.get("ZMKMAT_B")

    return item


@router.post("/{item_id}/edit", response_model=OcrResultEditResponse)
async def save_ocr_result_edit(
    item_id: int,
    request: OcrResultEditRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> OcrResultEditResponse:
    """OCR結果の手入力内容を保存."""
    logger.info(
        "OCR result edit requested",
        extra={
            "item_id": item_id,
            "changed_fields": list(request.model_dump(exclude_unset=True).keys()),
        },
    )
    edit = (
        db.query(OcrResultEdit)
        .filter(OcrResultEdit.smartread_long_data_id == item_id)
        .one_or_none()
    )

    update_data = request.model_dump(exclude_unset=True)
    expected_version = update_data.pop("version")

    if edit is None:
        if expected_version != 0:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "OPTIMISTIC_LOCK_CONFLICT",
                    "current_version": 0,
                    "expected_version": expected_version,
                    "message": "Data was modified by another user",
                },
            )
        edit = OcrResultEdit(smartread_long_data_id=item_id)
        edit.version = 1
        db.add(edit)
    else:
        if edit.version != expected_version:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "OPTIMISTIC_LOCK_CONFLICT",
                    "current_version": edit.version,
                    "expected_version": expected_version,
                    "message": "Data was modified by another user",
                },
            )
        edit.version = edit.version + 1

    for key, value in update_data.items():
        setattr(edit, key, value)

    edit.updated_at = datetime.now()

    # バリデーションとerror_flagsの更新
    long_data = db.query(SmartReadLongData).filter(SmartReadLongData.id == item_id).first()
    if long_data:
        # 突合キーの特定
        customer_code = long_data.content.get("得意先コード") or "100427105"
        material_code = (
            edit.material_code
            or long_data.content.get("材質コード")
            or long_data.content.get("材料コード")
        )
        jiku_code = edit.jiku_code or long_data.content.get("次区")

        # マスタ登録確認（完全一致→パターン一致）
        master_match_query = """
            SELECT jiku_code
            FROM shipping_master_curated
            WHERE customer_code = :cc
              AND material_code = :mc
              AND (
                jiku_code = :jc
                OR (
                    jiku_match_pattern IS NOT NULL
                    AND :jc LIKE REPLACE(jiku_match_pattern, '*', '%')
                )
              )
            ORDER BY
              CASE WHEN jiku_code = :jc THEN 0 ELSE 1 END,
              LENGTH(REPLACE(COALESCE(jiku_match_pattern, ''), '*', '')) DESC,
              LENGTH(COALESCE(jiku_match_pattern, '')) DESC,
              id ASC
            LIMIT 1
        """
        matched_jiku_code = db.execute(
            text(master_match_query),
            {"cc": customer_code, "mc": material_code, "jc": jiku_code},
        ).scalar_one_or_none()
        master_exists = matched_jiku_code is not None

        # 次区フォーマットバリデーション（補完後の正規次区で判定）
        effective_jiku_code = matched_jiku_code or jiku_code
        jiku_error = bool(
            effective_jiku_code and not re.match(r"^[A-Za-z][0-9]+$", effective_jiku_code)
        )

        # 日付フォーマットバリデーション（納期）
        delivery_date = edit.delivery_date or long_data.content.get("納期")
        date_error = False
        if delivery_date and not re.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}$", delivery_date):
            date_error = True

        edit.error_flags = {
            "master_not_found": not master_exists,
            "jiku_format_error": jiku_error,
            "date_format_error": date_error,
        }
        # SmartReadタスクのデータバージョンを更新
        from app.application.services.smartread import SmartReadService

        SmartReadService(db).bump_data_version(long_data.task_id)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(
            "OCR result edit save failed",
            extra={"item_id": item_id, "error": str(e)[:500]},
            exc_info=True,
        )
        raise e
    db.refresh(edit)

    logger.info(
        "OCR result edit saved",
        extra={"item_id": item_id, "error_flags": edit.error_flags},
    )
    return OcrResultEditResponse.model_validate(edit)


@router.delete("")
def delete_ocr_results(
    request: SmartReadDeletionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SmartReadDeletionResponse:
    """
    エラーのあるOCR結果を削除する.

    エラーフラグが1つでもtrueの項目のみ削除可能。
    エラーのない項目は削除がブロックされる。

    Args:
        request: 削除対象IDリスト
        db: データベースセッション
        current_user: 認証済みユーザー（admin/user）

    Returns:
        SmartReadDeletionResponse: 削除結果

    Raises:
        HTTPException 400: すべての項目にエラーがない
        HTTPException 404: 指定IDが存在しない
        HTTPException 403: ゲストユーザー

    """
    logger.info(
        "OCR results deletion requested",
        extra={
            "ids": request.ids,
            "count": len(request.ids),
            "user_id": current_user.id,
        },
    )
    # ゲストは削除不可
    roles = [ur.role.role_code for ur in current_user.user_roles]
    if "guest" in roles and len(roles) == 1:
        logger.warning(
            "OCR deletion denied (guest user)",
            extra={"user_id": current_user.id},
        )
        raise HTTPException(status_code=403, detail="ゲストユーザーは削除できません")

    result = delete_ocr_results_service(db, request.ids, current_user.id)

    if result.deleted_count == 0 and result.skipped_count > 0:
        raise HTTPException(
            status_code=400,
            detail="選択された項目はすべてエラーがないため、削除できません。完了処理を使用してください。",
        )

    return result
