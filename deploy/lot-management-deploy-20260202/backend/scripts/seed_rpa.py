import sys
from datetime import date, datetime


# Add backend directory to sys.path
sys.path.append("/app")

from app.core.database import SessionLocal
from app.infrastructure.persistence.models.rpa_models import RpaRun, RpaRunItem, RpaRunStatus


def seed_rpa_data():
    db = SessionLocal()
    try:
        print("Seeding RPA data...")

        # 1. Draft Run (Step 1完了直後)
        run1 = RpaRun(status=RpaRunStatus.DRAFT, created_at=datetime.now(), items=[])
        db.add(run1)
        db.flush()  # get ID

        items1 = [
            RpaRunItem(
                run_id=run1.id,
                row_no=1,
                status="New",
                destination="東京工場",
                material_code="MAT-001",
                delivery_date=date(2025, 1, 10),
                delivery_quantity=100,
                issue_flag=True,
                complete_flag=False,
            ),
            RpaRunItem(
                run_id=run1.id,
                row_no=2,
                status="New",
                destination="大阪支店",
                material_code="MAT-002",
                delivery_date=date(2025, 1, 11),
                delivery_quantity=200,
                issue_flag=True,
                complete_flag=False,
            ),
            RpaRunItem(
                run_id=run1.id,
                row_no=3,
                status="Skipped",
                destination="名古屋倉庫",
                material_code="MAT-003",
                delivery_date=date(2025, 1, 12),
                delivery_quantity=50,
                issue_flag=False,
                complete_flag=True,
            ),  # issue_flag=Falseなら完了扱いにしてみる
        ]
        db.add_all(items1)
        db.flush()

        # 2. Ready for Step 2 (Step 3待ち)
        run2 = RpaRun(status=RpaRunStatus.READY_FOR_STEP2, created_at=datetime.now(), items=[])
        db.add(run2)
        db.flush()

        items2 = [
            RpaRunItem(
                run_id=run2.id,
                row_no=1,
                status="Confirmed",
                destination="福岡センター",
                material_code="MAT-100",
                delivery_date=date(2025, 2, 1),
                delivery_quantity=500,
                issue_flag=True,
                complete_flag=True,
            ),
            RpaRunItem(
                run_id=run2.id,
                row_no=2,
                status="Confirmed",
                destination="札幌支店",
                material_code="MAT-101",
                delivery_date=date(2025, 2, 2),
                delivery_quantity=300,
                issue_flag=True,
                complete_flag=True,
            ),
        ]
        db.add_all(items2)
        db.flush()

        db.commit()
        print(f"RPA data seeded successfully! Created Run IDs: {run1.id}, {run2.id}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_rpa_data()
