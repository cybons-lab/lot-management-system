"""出荷用マスタの同期状況を調査するスクリプト."""

import sys
import os
from sqlalchemy import select
from sqlalchemy.orm import Session

# backendディレクトリをパスに追加
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.database import SessionLocal
from app.infrastructure.persistence.models.shipping_master_models import ShippingMasterCurated
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    DeliveryPlace,
    Warehouse,
    Supplier
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

def investigate():
    db = SessionLocal()
    try:
        # 全整形済みデータを取得
        curated_list = db.execute(select(ShippingMasterCurated)).scalars().all()
        print(f"Total curated records: {len(curated_list)}")

        missing = {
            "customers": set(),
            "suppliers": set(),
            "warehouses": set(),
            "delivery_places": set(),
            "supplier_items": set(),
            "customer_items": set(),
            "product_mappings": set()
        }

        # 既存マスタを取得
        customers = {c.customer_code for c in db.execute(select(Customer)).scalars().all()}
        suppliers = {s.supplier_code for s in db.execute(select(Supplier)).scalars().all()}
        warehouses = {w.warehouse_code for w in db.execute(select(Warehouse)).scalars().all()}
        
        # 複合キーの取得
        dps = {(dp.jiku_code, dp.delivery_place_code) for dp in db.execute(select(DeliveryPlace)).scalars().all()}
        
        # SupplierItemは (supplier_code, maker_part_no) でチェック
        si_stmt = select(SupplierItem, Supplier.supplier_code).join(Supplier, Supplier.id == SupplierItem.supplier_id)
        supplier_items = {(row[1], row[0].maker_part_no) for row in db.execute(si_stmt).all()}

        # CustomerItemは (customer_code, customer_part_no) でチェック
        ci_stmt = select(CustomerItem, Customer.customer_code).join(Customer, Customer.id == CustomerItem.customer_id)
        customer_items = {(row[1], row[0].customer_part_no) for row in db.execute(ci_stmt).all()}

        for c in curated_list:
            if c.customer_code and c.customer_code not in customers:
                missing["customers"].add(c.customer_code)
            
            if c.supplier_code and c.supplier_code not in suppliers:
                missing["suppliers"].add(c.supplier_code)
            
            if c.shipping_warehouse_code and c.shipping_warehouse_code not in warehouses:
                missing["warehouses"].add(c.shipping_warehouse_code)
            
            if c.delivery_place_code and (c.jiku_code, c.delivery_place_code) not in dps:
                missing["delivery_places"].add((c.jiku_code, c.delivery_place_code))
            
            if c.supplier_code and c.maker_part_no:
                if (c.supplier_code, c.maker_part_no) not in supplier_items:
                    missing["supplier_items"].add((c.supplier_code, c.maker_part_no))
            
            part_no = c.customer_part_no or c.maker_part_no
            if c.customer_code and part_no:
                if (c.customer_code, part_no) not in customer_items:
                    missing["customer_items"].add((c.customer_code, part_no))

        print("\n--- Summary of missing sync data ---")
        for key, vals in missing.items():
            print(f"{key}: {len(vals)} missing items")
            if vals:
                # 最初の5件だけ表示
                sample = list(vals)[:5]
                print(f"  Samples: {sample}")

    finally:
        db.close()

if __name__ == "__main__":
    investigate()
