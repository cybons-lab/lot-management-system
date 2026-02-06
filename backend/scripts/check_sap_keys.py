from sqlalchemy import select

from app.core.database import SessionLocal
from app.infrastructure.persistence.models.sap_models import SapMaterialCache


def check_sap_keys():
    db = SessionLocal()
    try:
        stmt = select(SapMaterialCache).limit(5)
        records = db.execute(stmt).scalars().all()
        if not records:
            print("No records found in SapMaterialCache")
            return

        for i, rec in enumerate(records):
            print(f"Record {i}: zkdmat_b={rec.zkdmat_b}, kunnr={rec.kunnr}")
            print(f"  raw_data keys: {list(rec.raw_data.keys())}")
            # もし MATNR や 名前の入っていそうなキーがあれば中身も少し出す
            for k in ["MATNR", "ZKUNNR_NAME", "NAME1", "ZLIFNR_NAME", "ZLIFNR_TXT"]:
                if k in rec.raw_data:
                    print(f"    {k}: {rec.raw_data[k]}")
    finally:
        db.close()


if __name__ == "__main__":
    check_sap_keys()
