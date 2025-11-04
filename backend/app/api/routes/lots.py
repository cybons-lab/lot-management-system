# backend/app/api/routes/lots.py
"""
ロット・在庫管理のAPIエンドポイント
"""

from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db
from app.models import (
    Lot,
    LotCurrentStock,
    Product,
    StockMovement,
    StockMovementReason,
    Supplier,
    Warehouse,
)
from app.schemas import (
    LotCreate,
    LotResponse,
    LotUpdate,
    StockMovementCreate,
    StockMovementResponse,
)

router = APIRouter(prefix="/lots", tags=["lots"])


@router.get("", response_model=List[LotResponse])
def list_lots(
    skip: int = 0,
    limit: int = 100,
    product_code: Optional[str] = None,
    supplier_code: Optional[str] = None,
    warehouse_code: Optional[str] = None,
    expiry_from: Optional[date] = None,
    expiry_to: Optional[date] = None,
    with_stock: bool = True,
    db: Session = Depends(get_db),
):
    """
    ロット一覧取得

    Args:
        skip: スキップ件数
        limit: 取得件数
        product_code: 製品コードでフィルタ
        supplier_code: 仕入先コードでフィルタ
        warehouse_code: 倉庫コードでフィルタ
        expiry_from: 有効期限開始日
        expiry_to: 有効期限終了日
        with_stock: 在庫あり(>0)のみ取得
    """
    query = db.query(Lot).options(joinedload(Lot.product))

    # フィルタ適用
    if product_code:
        query = query.filter(Lot.product_code == product_code)
    if supplier_code:
        query = query.filter(Lot.supplier_code == supplier_code)
    if warehouse_code:
        query = query.filter(Lot.warehouse_code == warehouse_code)
    if expiry_from:
        query = query.filter(Lot.expiry_date >= expiry_from)
    if expiry_to:
        query = query.filter(Lot.expiry_date <= expiry_to)

    # 在庫ありのみ
    if with_stock:
        query = query.join(Lot.current_stock).filter(LotCurrentStock.current_quantity > 0)

    # FEFO(先入先出): 有効期限昇順
    query = query.order_by(Lot.expiry_date.asc().nullslast())

    lots = query.offset(skip).limit(limit).all()

    # 現在在庫と製品名を付与
    result = []
    for lot in lots:
        # 1. まずLotの基本的な属性を辞書にコピー
        lot_dict = {
            "id": lot.id,
            "supplier_code": lot.supplier_code,
            "product_code": lot.product_code,
            "lot_number": lot.lot_number,
            "receipt_date": lot.receipt_date,
            "mfg_date": lot.mfg_date,
            "expiry_date": lot.expiry_date,
            "warehouse_code": lot.warehouse.warehouse_code if lot.warehouse else None,
            "warehouse_id": lot.warehouse_id,
            "lot_unit": lot.lot_unit,
            "kanban_class": lot.kanban_class,
            "sales_unit": lot.sales_unit,
            "inventory_unit": lot.inventory_unit,
            "received_by": lot.received_by,
            "source_doc": lot.source_doc,
            "qc_certificate_status": lot.qc_certificate_status,
            "qc_certificate_file": lot.qc_certificate_file,
            "created_at": lot.created_at,
            "updated_at": lot.updated_at,
        }

        # 2. リレーション先の正しい値を手動で設定
        if lot.product:
            lot_dict["product_name"] = lot.product.product_name

        if lot.current_stock:
            lot_dict["current_stock"] = lot.current_stock.current_quantity
        else:
            lot_dict["current_stock"] = 0.0

        # 3. 最後に完成した辞書をLotResponseで検証
        result.append(LotResponse(**lot_dict))

    return result


@router.post("", response_model=LotResponse, status_code=201)
def create_lot(lot: LotCreate, db: Session = Depends(get_db)):
    """
    ロット新規登録

    - ロットマスタ登録
    - 現在在庫テーブル初期化
    """
    # 重複チェック
    existing = (
        db.query(Lot)
        .filter(
            and_(
                Lot.supplier_code == lot.supplier_code,
                Lot.product_code == lot.product_code,
                Lot.lot_number == lot.lot_number,
            )
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="同じ仕入先・製品・ロット番号の組み合わせが既に存在します",
        )

    # マスタ存在チェック
    product = db.query(Product).filter(Product.product_code == lot.product_code).first()
    if not product:
        raise HTTPException(
            status_code=404, detail=f"製品コード '{lot.product_code}' が見つかりません"
        )

    supplier = db.query(Supplier).filter(Supplier.supplier_code == lot.supplier_code).first()
    if not supplier:
        raise HTTPException(
            status_code=404,
            detail=f"仕入先コード '{lot.supplier_code}' が見つかりません",
        )

    if lot.warehouse_code:
        warehouse = (
            db.query(Warehouse).filter(Warehouse.warehouse_code == lot.warehouse_code).first()
        )
        if not warehouse:
            raise HTTPException(
                status_code=404,
                detail=f"倉庫コード '{lot.warehouse_code}' が見つかりません",
            )

    # ロット作成
    lot_payload = lot.model_dump()
    lot_payload.setdefault("warehouse_id", lot_payload.get("warehouse_code"))
    db_lot = Lot(**lot_payload)
    db.add(db_lot)
    db.flush()

    # 現在在庫初期化
    current_stock = LotCurrentStock(lot_id=db_lot.id, current_quantity=0.0)
    db.add(current_stock)

    db.commit()
    db.refresh(db_lot)

    # レスポンス
    response = LotResponse.model_validate(db_lot)
    response.current_stock = 0.0
    return response


@router.get("/{lot_id}", response_model=LotResponse)
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    """ロット詳細取得"""
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    response = LotResponse.model_validate(lot)
    if lot.current_stock:
        response.current_stock = lot.current_stock.current_quantity
    else:
        response.current_stock = 0.0
    return response


@router.put("/{lot_id}", response_model=LotResponse)
def update_lot(lot_id: int, lot: LotUpdate, db: Session = Depends(get_db)):
    """ロット更新"""
    db_lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not db_lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    updates = lot.model_dump(exclude_unset=True)
    if "warehouse_code" in updates and "warehouse_id" not in updates:
        updates["warehouse_id"] = updates["warehouse_code"]
    for key, value in updates.items():
        setattr(db_lot, key, value)

    db_lot.updated_at = datetime.now()
    db.commit()
    db.refresh(db_lot)

    response = LotResponse.model_validate(db_lot)
    if db_lot.current_stock:
        response.current_stock = db_lot.current_stock.current_quantity
    return response


@router.delete("/{lot_id}", status_code=204)
def delete_lot(lot_id: int, db: Session = Depends(get_db)):
    """ロット削除"""
    db_lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not db_lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    db.delete(db_lot)
    db.commit()
    return None


# ===== Stock Movements =====
@router.get("/{lot_id}/movements", response_model=List[StockMovementResponse])
def list_lot_movements(lot_id: int, db: Session = Depends(get_db)):
    """ロットの在庫変動履歴取得"""
    movements = (
        db.query(StockMovement)
        .filter(StockMovement.lot_id == lot_id)
        .order_by(StockMovement.occurred_at.desc())
        .all()
    )
    return movements


@router.post("/movements", response_model=StockMovementResponse, status_code=201)
def create_stock_movement(movement: StockMovementCreate, db: Session = Depends(get_db)):
    """
    在庫変動記録

    - 在庫変動履歴追加
    - 現在在庫更新
    """
    lot = None
    if movement.lot_id is not None:
        lot = db.query(Lot).filter(Lot.id == movement.lot_id).first()
        if not lot:
            raise HTTPException(status_code=404, detail="ロットが見つかりません")

    product_id = movement.product_id or (lot.product_code if lot else None)
    warehouse_id = movement.warehouse_id or (lot.warehouse_id if lot else None)
    if not product_id or not warehouse_id:
        raise HTTPException(
            status_code=400,
            detail="product_id と warehouse_id は必須です",
        )

    reason = movement.reason
    try:
        reason_enum = StockMovementReason(reason)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"無効な理由: {reason}")

    db_movement = StockMovement(
        product_id=product_id,
        warehouse_id=warehouse_id,
        lot_id=movement.lot_id,
        quantity_delta=movement.quantity_delta,
        reason=reason_enum,
        source_table=movement.source_table,
        source_id=movement.source_id,
        batch_id=movement.batch_id,
        created_by=movement.created_by,
    )
    db.add(db_movement)

    # 現在在庫更新
    current_stock = (
        db.query(LotCurrentStock).filter(LotCurrentStock.lot_id == movement.lot_id).first()
    )

    if current_stock:
        current_stock.current_quantity += movement.quantity_delta
        current_stock.last_updated = datetime.now()
    else:
        current_stock = LotCurrentStock(
            lot_id=movement.lot_id, current_quantity=movement.quantity_delta
        )
        db.add(current_stock)

    # マイナス在庫チェック
    if current_stock.current_quantity < 0:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=(
                "在庫不足: 現在在庫 "
                f"{current_stock.current_quantity + movement.quantity_delta}, "
                f"要求 {abs(movement.quantity_delta)}"
            ),
        )

    db.commit()
    db.refresh(db_movement)
    return db_movement
