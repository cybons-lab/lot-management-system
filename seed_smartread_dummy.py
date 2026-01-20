
import asyncio
import os
from datetime import date, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadConfig,
    SmartReadRequest,
    SmartReadTask,
    SmartReadLongData,
    SmartReadWideData,
)

# Database connection
engine = create_engine(str(settings.DATABASE_URL))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_dummy_data():
    db = SessionLocal()
    try:
        print("Starting seed dummy data...")

        # 1. Ensure Config Exists
        config = db.query(SmartReadConfig).first()
        if not config:
            config = SmartReadConfig(
                name="Demo Config",
                endpoint="https://api.smartread.jp/v3",
                api_key="dummy_key",
                is_active=True,
                is_default=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(config)
            db.commit()
            db.refresh(config)
            print(f"Created config: {config.id}")
        else:
            print(f"Using existing config: {config.id}")

        # 2. Create Task (1-day-1-task)
        task_date = date.today()
        task_id = f"{config.id}_{task_date.strftime('%Y%m%d')}"
        
        task = db.query(SmartReadTask).filter_by(task_id=task_id).first()
        if not task:
            task = SmartReadTask(
                config_id=config.id,
                task_id=task_id,
                task_date=task_date,
                name=f"OCR_{task_date.strftime('%Y%m%d')}",
                created_at=datetime.utcnow()
            )
            db.add(task)
            db.flush()
            print(f"Created task: {task.task_id}")

        # 3. Create Dummy Requests
        req1 = SmartReadRequest(
            request_id="req_dummy_001",
            task_id=task.task_id,
            task_id_ref=task.id, # Set FK
            task_date=task_date,
            config_id=config.id,
            filename="invoice_20240120_A.pdf",
            state="completed",
            submitted_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        
        req2 = SmartReadRequest(
            request_id="req_dummy_002",
            task_id=task.task_id,
            task_id_ref=task.id, # Set FK
            task_date=task_date,
            config_id=config.id,
            filename="invoice_20240120_B.pdf",
            state="processing",
            submitted_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )

        db.add(req1)
        db.add(req2)
        db.flush() # Generate IDs
        print("Created dummy requests with IDs:", req1.id, req2.id)

        # 4. Create Dummy Long Data (Result of req1)
        long_data_1 = SmartReadLongData(
            config_id=config.id,
            task_id=task.task_id,
            task_date=task_date,
            request_id_ref=req1.id, # Use Integer ID
            row_index=1,
            content={
                "日付": "2024-01-20",
                "伝票番号": "INV-001",
                "材料コード": "MAT-A100",
                "品名": "Sample Material A",
                "数量": "100",
                "単位": "kg",
            },
            status="valid",
            created_at=datetime.utcnow()
        )

        long_data_2 = SmartReadLongData(
            config_id=config.id,
            task_id=task.task_id,
            task_date=task_date,
            request_id_ref=req1.id, # Use Integer ID
            row_index=2,
            content={
                "日付": "2024-01-20",
                "伝票番号": "INV-001",
                "材料コード": "MAT-B200",
                "品名": "Sample Material B",
                "数量": "50",
                "単位": "kg",
            },
            status="valid",
            created_at=datetime.utcnow()
        )
        
        db.add(long_data_1)
        db.add(long_data_2)
        print("Created dummy long data")

        db.commit()
        print("Seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_dummy_data()
