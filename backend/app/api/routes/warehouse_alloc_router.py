# backend/app/api/routes/warehouse_alloc.py
"""倉庫マスタ（新/IDベース）のAPIエンドポイント."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db

# 既存の models.masters.Warehouse とは異なる、新しいモデルをインポート
from app.models import Warehouse
from app.schemas import WarehouseListResponse, WarehouseOut


router = APIRouter(prefix="/warehouse-alloc", tags=["warehouse-alloc"])


@router.get("/warehouses", response_model=WarehouseListResponse)
def list_warehouses(db: Session = Depends(get_db)):
    """配分対象の倉庫一覧（新しいwarehouseテーブル）を取得."""
    # 新しい Warehouse モデル（単数形）に対してクエリ
    stmt = select(Warehouse).order_by(Warehouse.warehouse_code)
    warehouses = db.execute(stmt).scalars().all()

    items = [
        WarehouseOut(warehouse_code=w.warehouse_code, warehouse_name=w.warehouse_name)
        for w in warehouses
    ]
    return WarehouseListResponse(items=items)
