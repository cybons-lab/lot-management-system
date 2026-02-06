import asyncio
import sys
from pathlib import Path


# Add backend directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.application.services.common.quantity_service import to_internal_qty
from app.infrastructure.persistence.models import ProductUomConversion, SupplierItem


async def main():
    # Setup DB connection - default to PostgreSQL
    import os

    db_url = os.getenv(
        "DATABASE_URL", "postgresql://admin:dev_password@localhost:5432/lot_management"
    )

    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    print(f"Connecting to DB: {db_url}")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("--- Starting Verification ---")

        try:
            # 1. Create Test Product
            product = SupplierItem(
                maker_part_code="TEST-UOM-001",
                product_name="Test UOM Product",
                base_unit="PCS",
                internal_unit="PCS",
                external_unit="BOX",
                qty_per_internal_unit=1.0,
            )
            db.add(product)
            await db.flush()
            print(f"Created Product: {product.product_name} (ID: {product.id})")

            # 2. Create Conversion
            # 1 BOX = 12 PCS
            conversion = ProductUomConversion(
                product_id=product.id, external_unit="BOX", factor=12.0
            )
            db.add(conversion)
            await db.flush()
            print(f"Created Conversion: 1 BOX = {conversion.factor} PCS")

            # 3. Test Conversion
            # Case 1: External Unit = Internal Unit (PCS -> PCS)
            qty = await to_internal_qty(db, product, 10, "PCS")
            print(f"Test 1 (PCS -> PCS): Input=10 PCS, Output={qty} PCS. Expected=10.00")
            assert qty == 10.00

            # Case 2: External Unit = BOX (BOX -> PCS)
            qty = await to_internal_qty(db, product, 2, "BOX")
            print(f"Test 2 (BOX -> PCS): Input=2 BOX, Output={qty} PCS. Expected=24.00")
            assert qty == 24.00

            print("✅ Verification Successful!")
        except Exception as e:
            print(f"❌ Verification Failed: {e}")
            import traceback

            traceback.print_exc()
        finally:
            await db.rollback()  # Clean up


if __name__ == "__main__":
    asyncio.run(main())
