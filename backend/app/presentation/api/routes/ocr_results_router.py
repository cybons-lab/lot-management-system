"""OCR結果（リアルタイムビュー）API ルーター.

v_ocr_resultsビューから直接データを取得し、
SmartRead縦持ちデータと出荷用マスタをJOINした結果を返す。
"""

import re
from datetime import date, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.application.services.calendar_service import CalendarService
from app.application.services.common.export_service import ExportService
from app.application.services.sap.sap_reconciliation_service import SapReconciliationService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.smartread_models import OcrResultEdit, SmartReadLongData
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.schemas.calendar.calendar_schemas import BusinessDayCalculationRequest


router = APIRouter(prefix="/ocr-results", tags=["OCR Results"])


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
) -> str | None:
    """出荷票テンプレートにロット・入庫情報を反映."""
    if not template:
        return None

    lot_entries = []
    if lot_no_1:
        lot_entries.append(f"{lot_no_1}（{quantity_1 or ''}）")
    if lot_no_2:
        lot_entries.append(f"{lot_no_2}（{quantity_2 or ''}）")

    lot_text = "・".join(lot_entries)

    # ロット表記を正規化 (ロット, ロット/, /ロット, /ロット/ などに対応)
    normalized = re.sub(r"(^|/)ロット($|/)", r"\1ロット番号(数量)\2", template)

    # キーワード置換（全角カッコや表記揺れにもある程度対応）
    result = re.sub(r"ロット番号\s*[（(]数量[）)]", lot_text, normalized)
    result = result.replace("入庫番号", inbound_no or "")

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

    # 並び順
    query += " ORDER BY task_date DESC, row_index ASC"

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

    return OcrResultListResponse(items=items, total=total)


@router.get("/{item_id}", response_model=OcrResultItem)
async def get_ocr_result(
    item_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> OcrResultItem:
    """OCR結果詳細を取得."""
    query = "SELECT * FROM v_ocr_results WHERE id = :id"
    result = db.execute(text(query), {"id": item_id})
    row = result.mappings().first()

    if not row:
        from fastapi import HTTPException, status

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
    edit = (
        db.query(OcrResultEdit)
        .filter(OcrResultEdit.smartread_long_data_id == item_id)
        .one_or_none()
    )

    if edit is None:
        edit = OcrResultEdit(smartread_long_data_id=item_id)
        db.add(edit)

    update_data = request.model_dump(exclude_unset=True)
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

        # マスタ登録確認
        master_check_query = """
            SELECT 1 FROM shipping_master_curated
            WHERE customer_code = :cc AND material_code = :mc AND jiku_code = :jc
        """
        master_exists = (
            db.execute(
                text(master_check_query),
                {"cc": customer_code, "mc": material_code, "jc": jiku_code},
            ).first()
            is not None
        )

        # 次区フォーマットバリデーション
        jiku_error = False
        if jiku_code and not re.match(r"^[A-Za-z][0-9]+$", jiku_code):
            jiku_error = True

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

    db.commit()
    db.refresh(edit)

    return OcrResultEditResponse.model_validate(edit)


@router.get("/export/download")
async def export_ocr_results(
    task_date: Annotated[str | None, Query(description="タスク日付 (YYYY-MM-DD)")] = None,
    status: Annotated[str | None, Query(description="ステータスでフィルタ")] = None,
    has_error: Annotated[bool | None, Query(description="エラーのみ表示")] = None,
    format: Annotated[str, Query(description="エクスポート形式 (csv/xlsx)")] = "xlsx",
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """OCR結果をExcel/CSVでエクスポート."""
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

    query += " ORDER BY task_date DESC, row_index ASC"

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

    export_rows = []
    for row in rows:
        content = row.get("content") or {}
        remarks = content.get("備考") if isinstance(content, dict) else None
        lot_no_1 = row.get("manual_lot_no_1")
        quantity_1 = row.get("manual_quantity_1")
        lot_no_2 = row.get("manual_lot_no_2")
        quantity_2 = row.get("manual_quantity_2")
        inbound_no_1 = row.get("manual_inbound_no") or row.get("inbound_no")
        inbound_no_2 = row.get("manual_inbound_no_2")

        # 出荷日: 手入力値をそのまま使用（自動計算は画面表示時のみ）
        # Excelエクスポート用にYYYY/MM/DD形式の文字列に変換
        shipping_date_raw = row.get("manual_shipping_date")
        shipping_date = shipping_date_raw.strftime("%Y/%m/%d") if shipping_date_raw else None

        shipping_slip_text = (
            row.get("manual_shipping_slip_text")
            if row.get("manual_shipping_slip_text_edited")
            else build_shipping_slip_text(
                row.get("shipping_slip_text"),
                inbound_no_1,
                lot_no_1 or row.get("lot_no"),
                quantity_1,
                lot_no_2,
                quantity_2,
            )
        )

        # マスタからの追加フィールド
        shipping_slip_text_master = row.get("shipping_slip_text")
        transport_lt = row.get("transport_lt_days")

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
                    "delivery_date": row.get("delivery_date"),
                    "delivery_quantity": row.get("delivery_quantity"),
                    "item_no": row.get("item_no"),
                    "customer_part_no": row.get("customer_part_no"),
                    "maker_part_no": row.get("maker_part_no"),
                    "order_unit": row.get("order_unit"),
                    # マスタ由来
                    "customer_name": row.get("customer_name"),
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
    if format == "csv":
        return ExportService.export_to_csv(export_rows, filename=filename)
    return ExportService.export_to_excel(export_rows, filename=filename, column_map=column_map)
