"""SmartRead test data generator.

Generate sample SmartRead data for testing:
- Pattern A: 1 detail with all columns (M001 x J01)
- Pattern B: Multiple details (横持ち: 材質コード1, 材質コード2...) (M002 x J01, M003 x J02)
- Pattern C: Multiple Lots (Lot No1-1, Lot No1-2...) (M004 x J01)
- Pattern D: Standard configuration (M001 x J02)
- Pattern E: マスタ未登録パターン（エラー表示確認用）

Key: 得意先コード x 材質コード x 次区
※ 得意先コードはOCRで取得できないため、デフォルト値 "100427105" を使用
"""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.smartread_models import (
    OcrResultEdit,
    SmartReadConfig,
    SmartReadLongData,
    SmartReadRequest,
    SmartReadTask,
    SmartReadWideData,
)


# OrderRegisterServiceと同じデフォルト値
DEFAULT_CUSTOMER_CODE = "100427105"


def clear_smartread_data(db: Session) -> None:
    """Clear existing SmartRead data (keep config)."""
    # Delete in correct order (respecting FK constraints)
    db.query(OcrResultEdit).delete()
    db.query(SmartReadLongData).delete()
    db.query(SmartReadWideData).delete()
    db.query(SmartReadRequest).delete()
    db.query(SmartReadTask).delete()


def ensure_smartread_config(db: Session) -> SmartReadConfig:
    """Ensure SmartRead config exists."""
    config = db.query(SmartReadConfig).filter_by(is_default=True).first()
    if not config:
        config = SmartReadConfig(
            name="Default Config",
            endpoint="https://api.smartread.jp/v3",
            api_key="demo_api_key_12345",
            is_active=True,
            is_default=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(config)
        db.flush()
    return config


def create_pattern_a_task(
    db: Session, config: SmartReadConfig, task_date: date, prefix: str = ""
) -> None:
    """Pattern A: 1明細、全カラムあり (M001 x J01)."""
    task_id = f"{prefix}1_{task_date.strftime('%Y%m%d')}"
    task = SmartReadTask(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        name=f"OCR_{task_date.strftime('%Y%m%d')}",
        created_at=datetime.now(UTC),
    )
    db.add(task)
    db.flush()

    # Request
    request = SmartReadRequest(
        request_id=f"{prefix}req_{task_date.strftime('%Y%m%d')}_001",
        task_id=task_id,
        task_id_ref=task.id,
        task_date=task_date,
        config_id=config.id,
        filename="invoice_pattern_a.pdf",
        state="OCR_COMPLETED",
        num_of_pages=1,
        submitted_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
    )
    db.add(request)
    db.flush()

    # Wide data (横持ち) - Pattern A: 全カラムあり、1明細
    # Key: 100427105 x M001 x J01 → マスタと一致
    wide_data = SmartReadWideData(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        request_id_ref=request.id,
        filename="invoice_pattern_a.pdf",
        row_index=1,
        content={
            # Common fields
            "ファイル名": "invoice_pattern_a.pdf",
            "ページ番号": "1",
            "テンプレート名": "納品書テンプレートA",
            "発行日": "2026/01/20",
            "納品書No": "DN-2026-001",
            "発注者": "株式会社サンプル商事",
            "発注事業所": "東京本社",
            "受注者": "株式会社テスト製造",
            "出荷場所名称": "東京物流センター",
            "納入日": "2026/01/25",
            "便": "午前便",
            # Detail fields - M001 x J01 (マスタと一致)
            "材質コード": "M001",
            "材質サイズ": "1000x500x10",
            "単位": "kg",
            "納入量": "500",
            "アイテム": "1000000001",
            "アイテムNo": "1000000001",
            "購買": "PO-2026-001",
            "次区": "J01",
            # Sub-detail fields
            "Lot No1-1": "LOT-A-20260115-001",
            "数量1-1": "500",
            "梱包数1-1": "10",
        },
        row_fingerprint=f"{prefix}pattern_a_001",
        created_at=datetime.now(UTC),
    )
    db.add(wide_data)


def create_pattern_b_task(
    db: Session, config: SmartReadConfig, task_date: date, prefix: str = ""
) -> None:
    """Pattern B: 複数明細（材質コード1, 材質コード2...）(M002 x J01, M003 x J02)."""
    task_id = f"{prefix}2_{task_date.strftime('%Y%m%d')}"
    task = SmartReadTask(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        name=f"OCR_{task_date.strftime('%Y%m%d')}_B",
        state="SUCCEEDED",
        created_at=datetime.now(UTC),
    )
    db.add(task)
    db.flush()

    # Request
    request = SmartReadRequest(
        request_id=f"req_{task_date.strftime('%Y%m%d')}_002",
        task_id=task_id,
        task_id_ref=task.id,
        task_date=task_date,
        config_id=config.id,
        filename="invoice_pattern_b.pdf",
        state="OCR_COMPLETED",
        num_of_pages=1,
        submitted_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
    )
    db.add(request)
    db.flush()

    # Wide data - Pattern B: 複数明細（横持ち）
    # M002 x J01, M003 x J02 → マスタと一致
    wide_data = SmartReadWideData(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        request_id_ref=request.id,
        filename="invoice_pattern_b.pdf",
        row_index=1,
        content={
            # Common fields
            "ファイル名": "invoice_pattern_b.pdf",
            "ページ番号": "1",
            "テンプレート名": "納品書テンプレートB",
            "発行日": "2026/01/21",
            "納品書No": "DN-2026-002",
            "発注者": "株式会社ABC製作所",
            "発注事業所": "大阪工場",
            "受注者": "株式会社XYZ商事",
            "出荷場所名称": "大阪配送センター",
            "納入日": "2026/01/26",
            "便": "午後便",
            # Detail 1: M002 x J01 (マスタと一致)
            "材質コード1": "M002",
            "材質サイズ1": "500x300x5",
            "単位1": "kg",
            "納入量1": "200",
            "数量1-1": "200",
            "梱包数1-1": "20",
            "アイテム1": "2000000002",
            "アイテムNo1": "2000000002",
            "購買1": "PO-2026-002",
            "次区1": "J01",
            # Detail 2: M003 x J02 (マスタと一致)
            "材質コード2": "M003",
            "材質サイズ2": "800x400x8",
            "単位2": "kg",
            "納入量2": "300",
            "数量2-1": "300",
            "梱包数2-1": "30",
            "アイテム2": "3000000003",
            "アイテムNo2": "3000000003",
            "購買2": "PO-2026-003",
            "次区2": "J02",
            # Detail 3: M004 x J01 (マスタと一致)
            "材質コード3": "M004",
            "材質サイズ3": "1200x600x12",
            "単位3": "kg",
            "納入量3": "150",
            "数量3-1": "150",
            "梱包数3-1": "15",
            "アイテム3": "4000000004",
            "アイテムNo3": "4000000004",
            "購買3": "PO-2026-004",
            "次区3": "J01",
        },
        row_fingerprint="pattern_b_001",
        created_at=datetime.now(UTC),
    )
    db.add(wide_data)


def create_pattern_c_task(
    db: Session, config: SmartReadConfig, task_date: date, prefix: str = ""
) -> None:
    """Pattern C: 複数Lot（Lot No1-1, Lot No1-2...）(M001 x J02)."""
    task_id = f"{prefix}3_{task_date.strftime('%Y%m%d')}"
    task = SmartReadTask(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        name=f"OCR_{task_date.strftime('%Y%m%d')}_C",
        state="SUCCEEDED",
        created_at=datetime.now(UTC),
    )
    db.add(task)
    db.flush()

    # Request
    request = SmartReadRequest(
        request_id=f"req_{task_date.strftime('%Y%m%d')}_003",
        task_id=task_id,
        task_id_ref=task.id,
        task_date=task_date,
        config_id=config.id,
        filename="invoice_pattern_c.pdf",
        state="OCR_COMPLETED",
        num_of_pages=1,
        submitted_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
    )
    db.add(request)
    db.flush()

    # Wide data - Pattern C: 複数Lot
    # M001 x J02 → マスタと一致
    wide_data = SmartReadWideData(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        request_id_ref=request.id,
        filename="invoice_pattern_c.pdf",
        row_index=1,
        content={
            # Common fields
            "ファイル名": "invoice_pattern_c.pdf",
            "ページ番号": "1",
            "テンプレート名": "納品書テンプレートC",
            "発行日": "2026/01/22",
            "納品書No": "DN-2026-003",
            "発注者": "株式会社サンプル工業",
            "発注事業所": "名古屋支店",
            "受注者": "株式会社デモ物流",
            "出荷場所名称": "名古屋倉庫",
            "納入日": "2026/01/27",
            "便": "午前便",
            # Detail 1 with multiple Lots: M001 x J02 (マスタと一致)
            "材質コード1": "M001",
            "材質サイズ1": "600x400x6",
            "単位1": "kg",
            "納入量1": "450",
            "アイテム1": "5000000005",
            "アイテムNo1": "5000000005",
            "購買1": "PO-2026-005",
            "次区1": "J02",
            "Lot No1-1": "LOT-C-20260110-001",
            "数量1-1": "150",
            "梱包数1-1": "15",
            "Lot No1-2": "LOT-C-20260112-002",
            "数量1-2": "200",
            "梱包数1-2": "20",
            "Lot No1-3": "LOT-C-20260115-003",
            "数量1-3": "100",
            "梱包数1-3": "10",
            # Detail 2 with single Lot: M002 x J01 (マスタと一致)
            "材質コード2": "M002",
            "材質サイズ2": "700x500x7",
            "単位2": "kg",
            "納入量2": "250",
            "アイテム2": "6000000006",
            "アイテムNo2": "6000000006",
            "購買2": "PO-2026-006",
            "次区2": "J01",
            "Lot No2-1": "LOT-C-20260118-004",
            "数量2-1": "250",
            "梱包数2-1": "25",
        },
        row_fingerprint="pattern_c_001",
        created_at=datetime.now(UTC),
    )
    db.add(wide_data)


def create_pattern_d_task(
    db: Session, config: SmartReadConfig, task_date: date, prefix: str = ""
) -> None:
    """Pattern D: 標準構成 (M004 x J01)."""
    task_id = f"{prefix}4_{task_date.strftime('%Y%m%d')}"
    task = SmartReadTask(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        name=f"OCR_{task_date.strftime('%Y%m%d')}_D",
        state="SUCCEEDED",
        created_at=datetime.now(UTC),
    )
    db.add(task)
    db.flush()

    # Request
    request = SmartReadRequest(
        request_id=f"req_{task_date.strftime('%Y%m%d')}_004",
        task_id=task_id,
        task_id_ref=task.id,
        task_date=task_date,
        config_id=config.id,
        filename="invoice_pattern_d.pdf",
        state="OCR_COMPLETED",
        num_of_pages=1,
        submitted_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
    )
    db.add(request)
    db.flush()

    # Wide data - Pattern D: 標準構成
    # M004 x J01 → マスタと一致
    wide_data = SmartReadWideData(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        request_id_ref=request.id,
        filename="invoice_pattern_d.pdf",
        row_index=1,
        content={
            # Common fields
            "ファイル名": "invoice_pattern_d.pdf",
            "ページ番号": "1",
            "テンプレート名": "納品書テンプレートD",
            "発行日": "2026/01/23",
            "納品書No": "DN-2026-004",
            "発注者": "株式会社標準商社",
            "発注事業所": "福岡営業所",
            "受注者": "株式会社通常物産",
            "出荷場所名称": "福岡物流センター",
            "納入日": "2026/01/28",
            "便": "午後便",
            # Detail fields (standard single detail): M004 x J01 (マスタと一致)
            "材質コード": "M004",
            "材質サイズ": "900x600x9",
            "単位": "kg",
            "納入量": "350",
            "アイテム": "7000000007",
            "アイテムNo": "7000000007",
            "購買": "PO-2026-007",
            "次区": "J01",
            "Lot No1-1": "LOT-D-20260120-001",
            "数量1-1": "350",
            "梱包数1-1": "35",
        },
        row_fingerprint="pattern_d_001",
        created_at=datetime.now(UTC),
    )
    db.add(wide_data)


def create_pattern_e_error_task(
    db: Session, config: SmartReadConfig, task_date: date, prefix: str = ""
) -> None:
    """Pattern E: エラーパターン（マスタ未登録、フォーマットエラー）."""
    task_id = f"{prefix}5_{task_date.strftime('%Y%m%d')}"
    task = SmartReadTask(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        name=f"OCR_{task_date.strftime('%Y%m%d')}_E_ERROR",
        state="SUCCEEDED",
        created_at=datetime.now(UTC),
    )
    db.add(task)
    db.flush()

    # Request
    request = SmartReadRequest(
        request_id=f"req_{task_date.strftime('%Y%m%d')}_005",
        task_id=task_id,
        task_id_ref=task.id,
        task_date=task_date,
        config_id=config.id,
        filename="invoice_pattern_e_error.pdf",
        state="OCR_COMPLETED",
        num_of_pages=1,
        submitted_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
    )
    db.add(request)
    db.flush()

    # Wide data - Pattern E: エラーパターン
    wide_data = SmartReadWideData(
        config_id=config.id,
        task_id=task_id,
        task_date=task_date,
        request_id_ref=request.id,
        filename="invoice_pattern_e_error.pdf",
        row_index=1,
        content={
            # Common fields
            "ファイル名": "invoice_pattern_e_error.pdf",
            "ページ番号": "1",
            "テンプレート名": "納品書テンプレートE",
            "発行日": "2026/01/24",
            "納品書No": "DN-2026-005",
            "発注者": "株式会社エラーテスト",
            "発注事業所": "札幌営業所",
            "受注者": "株式会社未登録物産",
            "出荷場所名称": "札幌物流センター",
            "納入日": "2026-01-29",  # 正常な日付フォーマット
            "便": "午前便",
            # Detail 1: マスタ未登録 (UNKNOWN x J01)
            "材質コード1": "UNKNOWN",
            "材質サイズ1": "100x100x1",
            "単位1": "個",
            "納入量1": "10",
            "数量1": "10",
            "アイテム1": "ITM-ERR-001",
            "購買1": "PO-ERR-001",
            "次区1": "J01",
            # Detail 2: 次区フォーマットエラー (M001 x INVALID_JIKU)
            "材質コード2": "M001",
            "材質サイズ2": "200x200x2",
            "単位2": "個",
            "納入量2": "20",
            "数量2": "20",
            "アイテム2": "ITM-ERR-002",
            "購買2": "PO-ERR-002",
            "次区2": "INVALID",  # 不正なフォーマット（アルファベットのみ）
            # Detail 3: 日付フォーマットエラー（発行日は common なので別ファイルで）
            "材質コード3": "M002",
            "材質サイズ3": "300x300x3",
            "単位3": "個",
            "納入量3": "invalid_qty",  # 数量エラー
            "数量3": "invalid_qty",
            "アイテム3": "ITM-ERR-003",
            "購買3": "PO-ERR-003",
            "次区3": "J01",
        },
        row_fingerprint="pattern_e_001",
        created_at=datetime.now(UTC),
    )
    db.add(wide_data)


def generate_smartread_data(db: Session) -> None:
    """Generate SmartRead sample data for 5 patterns.

    Note: Long data (縦持ち) is intentionally empty.
    It will be populated after conversion from wide data.

    Patterns:
    - A: M001 x J01 (マスタ一致)
    - B: M002 x J01, M003 x J02, M004 x J01 (複数明細、マスタ一致)
    - C: M001 x J02, M002 x J01 (複数Lot、マスタ一致)
    - D: M004 x J01 (標準、マスタ一致)
    - E: エラーパターン (マスタ未登録、フォーマットエラー)
    """
    # Clear existing data
    clear_smartread_data(db)

    # Ensure config exists
    config = ensure_smartread_config(db)

    # Create tasks for multiple days (3 days x 4 patterns = 12 items)
    today = date.today()
    for i in range(3):
        task_date = today - timedelta(days=i)
        create_pattern_a_task(db, config, task_date, prefix=f"A{i}_")
        create_pattern_b_task(db, config, task_date, prefix=f"B{i}_")
        create_pattern_c_task(db, config, task_date, prefix=f"C{i}_")
        create_pattern_d_task(db, config, task_date, prefix=f"D{i}_")

    # One error pattern for today
    create_pattern_e_error_task(db, config, today, prefix="E_")

    # Generate Long Data and Edits from Wide Data
    generate_long_data_from_wide(db)


def generate_long_data_from_wide(db: Session) -> None:
    """Simple converter for test data to populate UI tables."""
    wide_records = db.query(SmartReadWideData).all()
    for wide in wide_records:
        content = wide.content
        details = []

        # Find all detail headers (材質コード, 材質コード1, ...)
        material_keys = [k for k in content.keys() if k.startswith("材質コード")]
        for m_key in material_keys:
            # Extract suffix (empty for "材質コード", otherwise "1", "2"...)
            suffix = m_key.replace("材質コード", "")

            # Sub-detail (Lots)
            lots = {}
            for sub_idx in range(1, 5):
                lot_key = f"Lot No{suffix}-{sub_idx}" if suffix else f"Lot No1-{sub_idx}"
                qty_key = f"数量{suffix}-{sub_idx}" if suffix else f"数量1-{sub_idx}"
                pack_key = f"梱包数{suffix}-{sub_idx}" if suffix else f"梱包数1-{sub_idx}"
                if lot_key in content or qty_key in content:
                    lots[f"Lot No{sub_idx}"] = content.get(lot_key)
                    lots[f"数量{sub_idx}"] = content.get(qty_key)
                    lots[f"梱包数{sub_idx}"] = content.get(pack_key)

            details.append(
                {
                    "material_code": content.get(m_key),
                    "jiku": content.get(f"次区{suffix}") if suffix else content.get("次区"),
                    "納入量": content.get(f"納入量{suffix}") if suffix else content.get("納入量"),
                    "item_no": content.get(f"アイテムNo{suffix}")
                    or content.get(f"アイテム{suffix}")
                    or content.get("アイテムNo")
                    or content.get("アイテム"),
                    "lots": lots,
                }
            )

        for idx, det in enumerate(details):
            long_content = {
                "材質コード": det["material_code"],
                "次区": det["jiku"],
                "納入量": det["納入量"],
                "アイテムNo": det["item_no"],
                "納入日": content.get("納入日"),
                "ファイル名": wide.filename,
            }
            # Add lots/quantities to content
            long_content.update(det["lots"] or {})

            long_record = SmartReadLongData(
                wide_data_id=wide.id,
                config_id=wide.config_id,
                task_id=wide.task_id,
                task_date=wide.task_date,
                request_id_ref=wide.request_id_ref,
                row_index=wide.row_index + idx,
                content=long_content,
                status="PENDING",
            )
            db.add(long_record)
            db.flush()

            # Create Edit record for UI validation display
            edit_record = OcrResultEdit(
                smartread_long_data_id=long_record.id,
                material_code=det["material_code"],
                jiku_code=det["jiku"],
                delivery_quantity=det["納入量"],
                lot_no_1=(det["lots"] or {}).get("Lot No1"),
                quantity_1=(det["lots"] or {}).get("数量1"),
                lot_no_2=(det["lots"] or {}).get("Lot No2"),
                quantity_2=(det["lots"] or {}).get("数量2"),
                delivery_date=content.get("納入日"),
                process_status="pending",
                error_flags={"master_not_found": True} if det["material_code"] == "UNKNOWN" else {},
            )
            db.add(edit_record)
