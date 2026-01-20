"""SmartRead test data generator.

Generate sample SmartRead data for testing:
- Pattern A: 1 detail with all columns
- Pattern B: Multiple details (横持ち: 材質コード1, 材質コード2...)
- Pattern C: Multiple Lots (Lot No1-1, Lot No1-2...)
- Pattern D: Standard configuration
"""

from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.smartread_models import (
    SmartReadConfig,
    SmartReadRequest,
    SmartReadTask,
    SmartReadWideData,
)


def clear_smartread_data(db: Session) -> None:
    """Clear existing SmartRead data (keep config)."""
    # Delete in correct order (respecting FK constraints)
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


def create_pattern_a_task(db: Session, config: SmartReadConfig, task_date: date) -> None:
    """Pattern A: 1明細、全カラムあり."""
    task_id = f"1_{task_date.strftime('%Y%m%d')}"
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
        request_id=f"req_{task_date.strftime('%Y%m%d')}_001",
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
            # Detail fields (no numbering for single detail)
            "材質コード": "MAT-A100",
            "材質サイズ": "1000x500x10",
            "単位": "kg",
            "納入量": "500",
            "アイテム": "ITM-001",
            "購買": "PO-2026-001",
            "次区": "A1",
            # Sub-detail fields
            "Lot No-1": "LOT-A-20260115-001",
            "梱包数-1": "10",
        },
        row_fingerprint="pattern_a_001",
        created_at=datetime.now(UTC),
    )
    db.add(wide_data)


def create_pattern_b_task(db: Session, config: SmartReadConfig, task_date: date) -> None:
    """Pattern B: 複数明細（材質コード1, 材質コード2...）."""
    task_id = f"2_{task_date.strftime('%Y%m%d')}"
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
            # Detail 1
            "材質コード1": "MAT-B100",
            "材質サイズ1": "500x300x5",
            "単位1": "kg",
            "納入量1": "200",
            "アイテム1": "ITM-101",
            "購買1": "PO-2026-101",
            "次区1": "B1",
            # Detail 2
            "材質コード2": "MAT-B200",
            "材質サイズ2": "800x400x8",
            "単位2": "kg",
            "納入量2": "300",
            "アイテム2": "ITM-102",
            "購買2": "PO-2026-102",
            "次区2": "B2",
            # Detail 3
            "材質コード3": "MAT-B300",
            "材質サイズ3": "1200x600x12",
            "単位3": "kg",
            "納入量3": "150",
            "アイテム3": "ITM-103",
            "購買3": "PO-2026-103",
            "次区3": "B3",
        },
        row_fingerprint="pattern_b_001",
        created_at=datetime.now(UTC),
    )
    db.add(wide_data)


def create_pattern_c_task(db: Session, config: SmartReadConfig, task_date: date) -> None:
    """Pattern C: 複数Lot（Lot No1-1, Lot No1-2...）."""
    task_id = f"3_{task_date.strftime('%Y%m%d')}"
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
            # Detail 1 with multiple Lots
            "材質コード1": "MAT-C100",
            "材質サイズ1": "600x400x6",
            "単位1": "kg",
            "納入量1": "450",
            "アイテム1": "ITM-201",
            "購買1": "PO-2026-201",
            "次区1": "C1",
            "Lot No1-1": "LOT-C-20260110-001",
            "梱包数1-1": "15",
            "Lot No1-2": "LOT-C-20260112-002",
            "梱包数1-2": "20",
            "Lot No1-3": "LOT-C-20260115-003",
            "梱包数1-3": "10",
            # Detail 2 with single Lot
            "材質コード2": "MAT-C200",
            "材質サイズ2": "700x500x7",
            "単位2": "kg",
            "納入量2": "250",
            "アイテム2": "ITM-202",
            "購買2": "PO-2026-202",
            "次区2": "C2",
            "Lot No2-1": "LOT-C-20260118-004",
            "梱包数2-1": "25",
        },
        row_fingerprint="pattern_c_001",
        created_at=datetime.now(UTC),
    )
    db.add(wide_data)


def create_pattern_d_task(db: Session, config: SmartReadConfig, task_date: date) -> None:
    """Pattern D: 標準構成."""
    task_id = f"4_{task_date.strftime('%Y%m%d')}"
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
            # Detail fields (standard single detail)
            "材質コード": "MAT-D100",
            "材質サイズ": "900x600x9",
            "単位": "kg",
            "納入量": "350",
            "アイテム": "ITM-301",
            "購買": "PO-2026-301",
            "次区": "D1",
            "Lot No-1": "LOT-D-20260120-001",
            "梱包数-1": "35",
        },
        row_fingerprint="pattern_d_001",
        created_at=datetime.now(UTC),
    )
    db.add(wide_data)


def generate_smartread_data(db: Session) -> None:
    """Generate SmartRead sample data for 4 patterns.

    Note: Long data (縦持ち) is intentionally empty.
    It will be populated after conversion from wide data.
    """
    # Clear existing data
    clear_smartread_data(db)

    # Ensure config exists
    config = ensure_smartread_config(db)

    # Create tasks for today
    today = date.today()

    create_pattern_a_task(db, config, today)
    create_pattern_b_task(db, config, today)
    create_pattern_c_task(db, config, today)
    create_pattern_d_task(db, config, today)
