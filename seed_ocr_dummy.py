#!/usr/bin/env python
"""OCR結果（SmartReadLongData）のダミーデータ生成スクリプト.
"""

import sys
from datetime import date, datetime
from pathlib import Path

# プロジェクトルートをパスに追加
project_root = Path(__file__).parent / "backend"
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.smartread_models import SmartReadLongData, SmartReadConfig

def seed_ocr_dummy(db_url: str | None = None):
    import os
    if db_url is None:
        db_url = os.getenv(
            "DATABASE_URL",
            "postgresql://lot_user:lot_pass@localhost:5432/lot_management",
        )

    engine = create_engine(db_url)
    session = Session(engine)

    try:
        # Configがない場合は作成
        config = session.query(SmartReadConfig).first()
        if not config:
            config = SmartReadConfig(
                config_name="Default OCR",
                api_endpoint="https://api.example.com",
                api_key="dummy",
                is_default=True
            )
            session.add(config)
            session.flush()

        task_date = date(2026, 1, 20)
        
        # 既存のPENDINGデータを削除
        session.query(SmartReadLongData).filter(
            SmartReadLongData.task_date == task_date,
            SmartReadLongData.status == "PENDING"
        ).delete()

        # ダミーOCRデータ（ShippingMasterCuratedのダミーと一致させる）
        # C001 x M001 x J01
        # C001 x M002 x J01
        # C002 x M001 x J01
        
        ocr_rows = [
            {
                "材質コード": "M001",
                "得意先コード": "C001",
                "次区": "J01",
                "入庫No": "INB-1001",
                "納期": "2026-01-25",
                "納入量": "50",
                "アイテムNo": "ITM-001",
                "数量単位": "pcs"
            },
            {
                "材質コード": "M002",
                "得意先コード": "C001",
                "次区": "J01",
                "入庫No": "INB-1002",
                "納期": "2026-01-26",
                "納入量": "100",
                "アイテムNo": "ITM-002",
                "数量単位": "kg"
            },
            {
                "材質コード": "M001",
                "得意先コード": "C002",
                "次区": "J01",
                "入庫No": "INB-1003",
                "納期": "2026-01-27",
                "納入量": "75",
                "アイテムNo": "ITM-003",
                "数量単位": "pcs"
            },
            # マスタにないパターン
            {
                "材質コード": "UNKNOWN",
                "得意先コード": "C001",
                "次区": "J01",
                "入庫No": "INB-9999",
                "納期": "2026-01-30",
                "納入量": "10",
                "アイテムNo": "ITM-999",
                "数量単位": "pcs"
            }
        ]

        for i, row in enumerate(ocr_rows):
            long_data = SmartReadLongData(
                config_id=config.id,
                task_id=f"TASK_{datetime.now().strftime('%Y%m%d%H%M%S')}_{i}",
                task_date=task_date,
                row_index=i + 1,
                content=row,
                status="PENDING"
            )
            session.add(long_data)

        session.commit()
        print(f"OCRダミーデータ {len(ocr_rows)} 件を投入しました。")

    except Exception as e:
        session.rollback()
        print(f"エラー発生: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_ocr_dummy()
