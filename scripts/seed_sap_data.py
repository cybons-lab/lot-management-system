"""SAP & Master sample data generator.

This script populates:
1. sap_material_cache (SAP Data)
2. shipping_master_curated (Master Data linked to OCR)
3. smartread_long_data (OCR Results matches for testing)

It ensures a consistent state for testing OCR reconciliation.
"""

import os
import sys
from datetime import datetime, date, UTC

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from app.core.config import settings
from app.infrastructure.persistence.models.sap_models import (
    SapConnection,
    SapMaterialCache,
)
from app.infrastructure.persistence.models.shipping_master_models import (
    ShippingMasterCurated,
)
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadLongData,
    SmartReadConfig,
)

# Database connection
engine = create_engine(str(settings.DATABASE_URL))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def clear_data(db):
    """Clear existing SAP, Master, and Long Data."""
    print("Clearing existing data...")
    db.query(SapMaterialCache).delete()
    db.query(ShippingMasterCurated).delete()
    db.query(SmartReadLongData).delete()
    db.commit()
    print("✓ Cleared SAP, Master & Long data")


def ensure_sap_connection(db):
    """Ensure a default SAP connection exists."""
    conn = db.query(SapConnection).filter_by(is_default=True).first()
    if not conn:
        conn = SapConnection(
            name="Test Connection",
            environment="test",
            ashost="sap.example.com",
            sysnr="00",
            client="100",
            user_name="testuser",
            passwd_encrypted="encrypted_pass",
            is_active=True,
            is_default=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(conn)
        db.commit()
        db.refresh(conn)
    print(f"✓ Default SAP connection (ID: {conn.id})")
    return conn


def ensure_smartread_config(db):
    """Ensure a default SmartRead config exists."""
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
        db.commit()
        db.refresh(config)
    print(f"✓ Default SmartRead config (ID: {config.id})")
    return config


def seed_long_data(db, config_id, customer_code, materials):
    """Seed SmartReadLongData."""
    task_date = date.today()
    for i, mat in enumerate(materials):
        # Create a LongData record for this material
        # Match keys: 得意先コード, 材質コード, 次区
        
        long_data = SmartReadLongData(
            config_id=config_id,
            task_id=f"TASK-SAP-{task_date}-{i}", 
            task_date=task_date,
            row_index=i + 1,
            content={
                "得意先コード": customer_code,
                "材質コード": mat["code"],
                "次区": mat["jiku"],
                "納入日": "2026/01/01",
                "納入量": "100",
                "単位": "kg",
                "アイテム": "ITM-" + mat["code"],
                "購買": "PO-" + mat["code"],
                "Lot No": "LOT-" + mat["code"],
            },
            status="PENDING",
            created_at=datetime.now(UTC),
        )
        db.add(long_data)
    print(f"✓ Seeded {len(materials)} SmartReadLongData records")


def seed_sap_cache(db, conn_id, customer_code, materials):
    """Seed SapMaterialCache."""
    for mat in materials:
        # Check existing to avoid dupes if not cleared perfectly
        exists = db.query(SapMaterialCache).filter_by(
            connection_id=conn_id, zkdmat_b=mat["code"], kunnr=customer_code
        ).first()
        if exists:
            continue

        cache = SapMaterialCache(
            connection_id=conn_id,
            zkdmat_b=mat["code"],
            kunnr=customer_code,
            raw_data={
                "KUNNR": customer_code,
                "ZKDMAT_B": mat["code"],
                "MAKTX": mat["name"],
                "ZKY_JIKU": mat.get("jiku", ""),
                "ZKY_SNAME": "SAP Supplier " + mat["code"],
            },
            fetched_at=datetime.now(UTC),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(cache)
    print(f"✓ Seeded SAP cache records for {customer_code}")


def seed_shipping_master(db, customer_code, materials):
    """Seed ShippingMasterCurated."""
    for mat in materials:
        # Upsert-ish check
        exists = db.query(ShippingMasterCurated).filter_by(
            customer_code=customer_code, material_code=mat["code"], jiku_code=mat["jiku"]
        ).first()
        if exists:
            continue
            
        master = ShippingMasterCurated(
            customer_code=customer_code,
            material_code=mat["code"],
            jiku_code=mat["jiku"],
            # Master Data
            customer_name="Sample Customer Inc.",
            supplier_code="SUP-" + mat["code"],
            supplier_name="Link Supplier " + mat["code"],
            delivery_place_code="DP-" + mat["jiku"],
            delivery_place_name="Delivery Place " + mat["jiku"],
            shipping_warehouse_code="WH-01",
            shipping_warehouse_name="Tokyo Warehouse",
            shipping_slip_text="Generated Slip Text for " + mat["code"],
            transport_lt_days=2,
            has_order=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(master)
    print(f"✓ Seeded Shipping Master records for {customer_code}")


def seed_data():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("SAP & Master Data Seeder")
        print("=" * 60)

        # 1. Clear
        clear_data(db)

        # 2. Preparation
        conn = ensure_sap_connection(db)
        config = ensure_smartread_config(db)

        # 3. Define Data Patterns
        # Default Customer Code
        CUSTOMER_CODE = "100427105"

        materials = [
            # Pattern A
            {"code": "MAT-A100", "jiku": "A1", "name": "Material A-100"},
            # Pattern B
            {"code": "MAT-B100", "jiku": "B1", "name": "Material B-100"},
            {"code": "MAT-B200", "jiku": "B2", "name": "Material B-200"},
            {"code": "MAT-B300", "jiku": "B3", "name": "Material B-300"},
            # Pattern C
            {"code": "MAT-C100", "jiku": "C1", "name": "Material C-100"},
            # Pattern D
            {"code": "MAT-D100", "jiku": "D1", "name": "Material D-100"},
        ]

        # 4. Insert
        seed_long_data(db, config.id, CUSTOMER_CODE, materials)
        seed_sap_cache(db, conn.id, CUSTOMER_CODE, materials)
        seed_shipping_master(db, CUSTOMER_CODE, materials)

        db.commit()

        print("\n" + "=" * 60)
        print("✓ Data generation completed successfully")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n✗ Error seeding data: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
