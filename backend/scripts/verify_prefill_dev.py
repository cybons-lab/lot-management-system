import os
import sys


# Ensure backend path is in sys.path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


# Development DB settings
# Note: From docker-compose.yml, user is 'admin', password is 'dev_password', db is 'lot_management'
# Mapping port is 5432
db_url = "postgresql://admin:dev_password@localhost:5432/lot_management"
engine = create_engine(db_url)
Session = sessionmaker(bind=engine)


def verify():
    with Session() as session:
        # 1. Update SAP cache to include names for a specific record
        # Match by: kunnr='100427105', zkdmat_b='8891548'
        print("Updating SAP cache with dummy names...")
        result = session.execute(
            text("""
            UPDATE sap_material_cache 
            SET raw_data = raw_data || '{"ZKUNNR_NAME": "DEV得意先名_補完テスト", "ZLIFNR_NAME": "DEV仕入先名_補完テスト"}'::jsonb
            WHERE kunnr = '100427105' AND zkdmat_b = '8891548'
            RETURNING id;
        """)
        )
        cache_id = result.scalar()
        if not cache_id:
            print("Error: Target SAP cache record not found in dev DB.")
            return

        # 2. Create ShippingMasterCurated for testing
        print("Creating ShippingMasterCurated test record...")
        # Clear existing
        session.execute(
            text(
                "DELETE FROM shipping_master_curated WHERE customer_code = '100427105' AND material_code = '8891548' AND jiku_code = 'DEV_TEST';"
            )
        )

        # Insert new with NULL names
        session.execute(
            text("""
            INSERT INTO shipping_master_curated 
            (customer_code, material_code, jiku_code, supplier_code, customer_name, supplier_name, version, has_order, has_duplicate_warning)
            VALUES 
            ('100427105', '8891548', 'DEV_TEST', '0001000020', NULL, NULL, 1, false, false);
        """)
        )
        session.commit()
        print("Test data prepared. Ready for API call.")


if __name__ == "__main__":
    verify()
