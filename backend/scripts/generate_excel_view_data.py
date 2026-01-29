#!/usr/bin/env python3
import os
import sys
from datetime import date, timedelta
from decimal import Decimal


# Add backend directory to path
# Assumes script is at backend/scripts/generate_excel_view_data.py
# We need to add 'backend' (parent of scripts) to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv


load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sqlalchemy.orm import Session  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.infrastructure.persistence.models import (  # noqa: E402
    AllocationSuggestion,
    Customer,
    DeliveryPlace,
    LotMaster,
    LotReceipt,
    Product,
    ProductWarehouse,
    Supplier,
    Warehouse,
)


def _get_or_create_supplier(db: Session, code: str, name: str) -> Supplier:
    supplier = db.query(Supplier).filter(Supplier.supplier_code == code).first()
    if not supplier:
        supplier = Supplier(supplier_code=code, supplier_name=name, short_name=name)
        db.add(supplier)
        db.flush()
    return supplier


def _get_or_create_warehouse(db: Session, code: str, name: str) -> Warehouse:
    warehouse = db.query(Warehouse).filter(Warehouse.warehouse_code == code).first()
    if not warehouse:
        warehouse = Warehouse(
            warehouse_code=code, warehouse_name=name, warehouse_type="internal", short_name=name
        )
        db.add(warehouse)
        db.flush()
    return warehouse


def _get_or_create_customer(db: Session, code: str, name: str) -> Customer:
    customer = db.query(Customer).filter(Customer.customer_code == code).first()
    if not customer:
        customer = Customer(customer_code=code, customer_name=name, short_name=name)
        db.add(customer)
        db.flush()
    return customer


def _get_or_create_delivery_place(
    db: Session, customer: Customer, code: str, name: str
) -> DeliveryPlace:
    dp = db.query(DeliveryPlace).filter(DeliveryPlace.delivery_place_code == code).first()
    if not dp:
        dp = DeliveryPlace(
            delivery_place_code=code,
            delivery_place_name=name,
            customer_id=customer.id,
            jiku_code=code,  # specific to this system, can reuse code
        )
        db.add(dp)
        db.flush()
    return dp


def _get_or_create_product(db: Session, code: str, name: str) -> Product:
    product = db.query(Product).filter(Product.maker_part_no == code).first()
    if not product:
        product = Product(
            maker_part_no=code,
            display_name=name,
            base_unit="kg",
            internal_unit="kg",
            external_unit="kg",
            qty_per_internal_unit=Decimal("1"),
            qty_scale=1,
        )
        db.add(product)
        db.flush()
    return product


def generate_excel_view_data(db: Session):
    print("Generating Excel View Test Data...")

    # 1. Create Supplier
    print("Creating Supplier...")
    supplier = _get_or_create_supplier(db, "EXCEL-SUP-001", "Excel Test Supplier")

    # 2. Create Warehouse
    print("Creating Warehouse...")
    warehouse = _get_or_create_warehouse(db, "EXCEL-WH-001", "Excel Test Warehouse")

    # 3. Create Product
    print("Creating Product...")
    product = _get_or_create_product(db, "EXCEL-PROD-001", "Excel Test Product")

    # Link Product to Warehouse
    print("Linking Product to Warehouse...")
    pw = (
        db.query(ProductWarehouse)
        .filter(
            ProductWarehouse.product_group_id == product.id,
            ProductWarehouse.warehouse_id == warehouse.id,
        )
        .first()
    )
    if not pw:
        db.add(
            ProductWarehouse(product_group_id=product.id, warehouse_id=warehouse.id, is_active=True)
        )

    # 4. Create Lots and Receipts
    print("Creating Lots...")
    today = date.today()

    # Lot 1
    lot1_no = "LOT-EXCEL-001"
    lot1_master = db.query(LotMaster).filter(LotMaster.lot_number == lot1_no).first()
    if not lot1_master:
        lot1_master = LotMaster(
            lot_number=lot1_no,
            product_group_id=product.id,
            supplier_id=supplier.id,
            first_receipt_date=today - timedelta(days=30),
            latest_expiry_date=today + timedelta(days=365),
        )
        db.add(lot1_master)
        db.flush()

    lot1_receipt = db.query(LotReceipt).filter(LotReceipt.lot_master_id == lot1_master.id).first()
    if not lot1_receipt:
        lot1_receipt = LotReceipt(
            lot_master_id=lot1_master.id,
            product_group_id=product.id,
            warehouse_id=warehouse.id,
            supplier_id=supplier.id,
            received_date=today - timedelta(days=30),
            expiry_date=today + timedelta(days=365),
            received_quantity=Decimal("1000"),
            consumed_quantity=Decimal("200"),  # 1000 - 800 = 200 consumed
            status="active",
            unit="kg",
            origin_type="adhoc",
            origin_reference="initial-import",
        )
        db.add(lot1_receipt)
        db.flush()

    # Lot 2
    lot2_no = "LOT-EXCEL-002"
    lot2_master = db.query(LotMaster).filter(LotMaster.lot_number == lot2_no).first()
    if not lot2_master:
        lot2_master = LotMaster(
            lot_number=lot2_no,
            product_group_id=product.id,
            supplier_id=supplier.id,
            first_receipt_date=today - timedelta(days=10),
            latest_expiry_date=today + timedelta(days=400),
        )
        db.add(lot2_master)
        db.flush()

    lot2_receipt = db.query(LotReceipt).filter(LotReceipt.lot_master_id == lot2_master.id).first()
    if not lot2_receipt:
        lot2_receipt = LotReceipt(
            lot_master_id=lot2_master.id,
            product_group_id=product.id,
            warehouse_id=warehouse.id,
            supplier_id=supplier.id,
            received_date=today - timedelta(days=10),
            expiry_date=today + timedelta(days=400),
            received_quantity=Decimal("500"),
            consumed_quantity=Decimal("0"),
            status="active",
            unit="kg",
            origin_type="adhoc",
            origin_reference="initial-import",
        )
        db.add(lot2_receipt)
        db.flush()

    # 5. Create Allocation Suggestions (Planned Shipments)
    print("Creating Allocation Suggestions...")
    customer = _get_or_create_customer(db, "EXCEL-CUST-001", "Excel Test Customer")
    dp1 = _get_or_create_delivery_place(db, customer, "EXCEL-DP-001", "Excel Delivery Place 1")
    dp2 = _get_or_create_delivery_place(db, customer, "EXCEL-DP-002", "Excel Delivery Place 2")

    # Clear old suggestions for these lots
    db.query(AllocationSuggestion).filter(
        AllocationSuggestion.lot_id.in_([lot1_receipt.id, lot2_receipt.id])
    ).delete()

    # Suggestions for Lot 1
    # Delivery Place 1 (Customer A)
    s1 = AllocationSuggestion(
        lot_id=lot1_receipt.id,
        product_group_id=product.id,
        customer_id=customer.id,
        delivery_place_id=dp1.id,
        quantity=Decimal("50"),
        allocation_type="soft",
        source="manual_test_data",
        forecast_period=(today + timedelta(days=2)).strftime("%Y-%m"),
    )
    db.add(s1)

    s2 = AllocationSuggestion(
        lot_id=lot1_receipt.id,
        product_group_id=product.id,
        customer_id=customer.id,
        delivery_place_id=dp1.id,
        quantity=Decimal("30"),
        allocation_type="soft",
        source="manual_test_data",
        forecast_period=(today + timedelta(days=5)).strftime("%Y-%m"),
    )
    db.add(s2)

    # Suggestions for Lot 2
    # Delivery Place 2 (Customer B)
    s3 = AllocationSuggestion(
        lot_id=lot2_receipt.id,
        product_group_id=product.id,
        customer_id=customer.id,
        delivery_place_id=dp2.id,
        quantity=Decimal("100"),
        allocation_type="soft",
        source="manual_test_data",
        forecast_period=(today + timedelta(days=3)).strftime("%Y-%m"),
    )
    db.add(s3)

    db.commit()
    print("✅ Excel View Test Data Generated Successfully!")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        generate_excel_view_data(db)
    finally:
        db.close()
