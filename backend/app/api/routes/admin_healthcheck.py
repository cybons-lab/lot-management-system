# backend/app/api/routes/admin_healthcheck.py
"""
ヘルスチェックAPI - 各テーブルのデータ件数を確認
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.masters import Customer, Product, Warehouse, Supplier
from app.models.inventory import Lot, StockMovement
from app.models.orders import Order, OrderLine, Allocation

router = APIRouter(prefix="/admin/healthcheck", tags=["admin"])


@router.get("/db-counts")
def get_db_counts(db: Session = Depends(get_db)):
    """
    各テーブルのレコード件数を返す

    Returns:
        dict: テーブル名をキー、件数を値とする辞書
    """
    counts = {}

    # マスタテーブル
    counts["customers"] = db.scalar(select(func.count()).select_from(Customer)) or 0
    counts["products"] = db.scalar(select(func.count()).select_from(Product)) or 0
    counts["warehouses"] = db.scalar(select(func.count()).select_from(Warehouse)) or 0
    counts["suppliers"] = db.scalar(select(func.count()).select_from(Supplier)) or 0

    # 在庫テーブル
    counts["lots"] = db.scalar(select(func.count()).select_from(Lot)) or 0
    counts["stock_movements"] = db.scalar(select(func.count()).select_from(StockMovement)) or 0

    # 受注テーブル
    counts["orders"] = db.scalar(select(func.count()).select_from(Order)) or 0
    counts["order_lines"] = db.scalar(select(func.count()).select_from(OrderLine)) or 0
    counts["allocations"] = db.scalar(select(func.count()).select_from(Allocation)) or 0

    # VIEWは件数取得が難しい場合があるのでスキップ
    # counts["lot_current_stock"] = ...

    return {
        "status": "ok",
        "counts": counts,
        "total": sum(counts.values()),
    }


@router.get("/masters")
def get_masters_health(db: Session = Depends(get_db)):
    """
    マスタテーブルのヘルスチェック

    Returns:
        dict: 各マスタテーブルの件数とサンプルデータ（先頭5件のコード）
    """
    result = {}

    # 得意先
    customer_count = db.scalar(select(func.count()).select_from(Customer)) or 0
    customer_codes = [
        c for (c,) in db.execute(select(Customer.customer_code).limit(5)).all()
    ]
    result["customers"] = {"count": customer_count, "sample_codes": customer_codes}

    # 製品
    product_count = db.scalar(select(func.count()).select_from(Product)) or 0
    product_codes = [
        p for (p,) in db.execute(select(Product.product_code).limit(5)).all()
    ]
    result["products"] = {"count": product_count, "sample_codes": product_codes}

    # 倉庫
    warehouse_count = db.scalar(select(func.count()).select_from(Warehouse)) or 0
    warehouse_codes = [
        w for (w,) in db.execute(select(Warehouse.warehouse_code).limit(5)).all()
    ]
    result["warehouses"] = {"count": warehouse_count, "sample_codes": warehouse_codes}

    # 仕入先
    supplier_count = db.scalar(select(func.count()).select_from(Supplier)) or 0
    supplier_codes = [
        s for (s,) in db.execute(select(Supplier.supplier_code).limit(5)).all()
    ]
    result["suppliers"] = {"count": supplier_count, "sample_codes": supplier_codes}

    return result
