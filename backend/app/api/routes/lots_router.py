# backend/app/api/routes/lots.py
"""ロット・在庫管理のAPIエンドポイント."""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
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


@router.get("", response_model=list[LotResponse])
def list_lots(
    skip: int = 0,
    limit: int = 100,
    product_id: int | None = None,
    product_code: str | None = None,
    supplier_code: str | None = None,
    warehouse_code: str | None = None,
    expiry_from: date | None = None,
    expiry_to: date | None = None,
    with_stock: bool = True,
    db: Session = Depends(get_db),
):
    """
    ロット一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数
        product_id: 製品IDでフィルタ（優先）
        product_code: 製品コードでフィルタ
        supplier_code: 仕入先コードでフィルタ
        warehouse_code: 倉庫コードでフィルタ
        expiry_from: 有効期限開始日
        expiry_to: 有効期限終了日
        with_stock: 在庫あり(>0)のみ取得
        db: データベースセッション
    """
    query = db.query(Lot).options(joinedload(Lot.product), joinedload(Lot.warehouse))

    # フィルタ適用
    if product_id is not None:
        query = query.filter(Lot.product_id == product_id)
    elif product_code:
        # product_code から product_id を取得してフィルタ
        product = db.query(Product).filter(Product.product_code == product_code).first()
        if product:
            query = query.filter(Lot.product_id == product.id)
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
        query = query.outerjoin(LotCurrentStock, Lot.id == LotCurrentStock.lot_id).filter(
            LotCurrentStock.current_quantity > 0
        )

    # FEFO(先入先出): 有効期限昇順
    query = query.order_by(Lot.expiry_date.asc().nullslast())

    lots = query.offset(skip).limit(limit).all()

    responses: list[LotResponse] = []
    for lot in lots:
        response = LotResponse.model_validate(lot)

        if lot.product:
            response.product_name = lot.product.product_name

        if lot.current_stock:
            response.current_quantity = lot.current_stock.current_quantity
            response.last_updated = lot.current_stock.last_updated
        else:
            response.current_quantity = 0.0
            response.last_updated = None

        responses.append(response)

    return responses


@router.post("", response_model=LotResponse, status_code=201)
def create_lot(lot: LotCreate, db: Session = Depends(get_db)):
    """
    ロット新規登録.

    - ロットマスタ登録
    - 現在在庫テーブル初期化
    """
    # マスタ存在チェック
    if not lot.product_id:
        raise HTTPException(status_code=400, detail="product_id は必須です")

    product = db.query(Product).filter(Product.id == lot.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"製品ID '{lot.product_id}' が見つかりません")

    supplier = db.query(Supplier).filter(Supplier.supplier_code == lot.supplier_code).first()
    if not supplier:
        raise HTTPException(
            status_code=404,
            detail=f"仕入先コード '{lot.supplier_code}' が見つかりません",
        )

    warehouse_id: int | None = None
    if lot.warehouse_id is not None:
        warehouse = db.query(Warehouse).filter(Warehouse.id == lot.warehouse_id).first()
        if not warehouse:
            raise HTTPException(
                status_code=404,
                detail=f"倉庫ID '{lot.warehouse_id}' が見つかりません",
            )
        warehouse_id = warehouse.id
    elif lot.warehouse_code:
        warehouse = (
            db.query(Warehouse).filter(Warehouse.warehouse_code == lot.warehouse_code).first()
        )
        if not warehouse:
            raise HTTPException(
                status_code=404,
                detail=f"倉庫コード '{lot.warehouse_code}' が見つかりません",
            )
        warehouse_id = warehouse.id
    else:
        raise HTTPException(
            status_code=400,
            detail="倉庫コードまたは倉庫IDを指定してください",
        )

    # ロット作成
    lot_payload = lot.model_dump()
    lot_payload["warehouse_id"] = warehouse_id
    lot_payload.pop("warehouse_code", None)

    try:
        db_lot = Lot(**lot_payload)
        db.add(db_lot)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="DB整合性エラーが発生しました") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="DBエラーが発生しました") from exc

    db.refresh(db_lot)

    # レスポンス
    response = LotResponse.model_validate(db_lot)
    response.current_quantity = 0.0
    response.last_updated = None

    return response


@router.get("/{lot_id}", response_model=LotResponse)
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    """ロット詳細取得."""
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    response = LotResponse.model_validate(lot)
    if lot.current_stock:
        response.current_quantity = lot.current_stock.current_quantity
        response.last_updated = lot.current_stock.last_updated
    else:
        response.current_quantity = 0.0
        response.last_updated = None
    return response


@router.put("/{lot_id}", response_model=LotResponse)
def update_lot(lot_id: int, lot: LotUpdate, db: Session = Depends(get_db)):
    """ロット更新."""
    db_lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not db_lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    updates = lot.model_dump(exclude_unset=True)

    warehouse_id: int | None = None
    if "warehouse_id" in updates:
        warehouse = db.query(Warehouse).filter(Warehouse.id == updates["warehouse_id"]).first()
        if not warehouse:
            raise HTTPException(
                status_code=404,
                detail=f"倉庫ID '{updates['warehouse_id']}' が見つかりません",
            )
        warehouse_id = warehouse.id
    elif "warehouse_code" in updates:
        warehouse = (
            db.query(Warehouse)
            .filter(Warehouse.warehouse_code == updates["warehouse_code"])
            .first()
        )
        if not warehouse:
            raise HTTPException(
                status_code=404,
                detail=f"倉庫コード '{updates['warehouse_code']}' が見つかりません",
            )
        warehouse_id = warehouse.id

    updates.pop("warehouse_code", None)
    if warehouse_id is not None:
        updates["warehouse_id"] = warehouse_id

    for key, value in updates.items():
        setattr(db_lot, key, value)

    db_lot.updated_at = datetime.now()

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="DB整合性エラーが発生しました") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="DBエラーが発生しました") from exc

    db.refresh(db_lot)

    response = LotResponse.model_validate(db_lot)
    if db_lot.current_stock:
        response.current_quantity = db_lot.current_stock.current_quantity
        response.last_updated = db_lot.current_stock.last_updated

    return response


@router.delete("/{lot_id}", status_code=204)
def delete_lot(lot_id: int, db: Session = Depends(get_db)):
    """ロット削除."""
    db_lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not db_lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    db.delete(db_lot)
    db.commit()
    return None


# ===== Stock Movements =====
@router.get("/{lot_id}/movements", response_model=list[StockMovementResponse])
def list_lot_movements(lot_id: int, db: Session = Depends(get_db)):
    """ロットの在庫変動履歴取得."""
    movements = (
        db.query(StockMovement)
        .filter(StockMovement.lot_id == lot_id)
        .order_by(StockMovement.movement_date.desc())
        .all()
    )
    return movements


@router.post("/movements", response_model=StockMovementResponse, status_code=201)
def create_stock_movement(movement: StockMovementCreate, db: Session = Depends(get_db)):
    """
    在庫変動記録.

    - 在庫変動履歴追加
    - 現在在庫更新
    """
    lot = None
    if movement.lot_id is not None:
        lot = db.query(Lot).filter(Lot.id == movement.lot_id).first()
        if not lot:
            raise HTTPException(status_code=404, detail="ロットが見つかりません")

    product_id = movement.product_id or (lot.product_id if lot else None)
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

    # 現在在庫チェック（VIEW なので読み取り専用）
    if movement.lot_id:
        current_stock = (
            db.query(LotCurrentStock).filter(LotCurrentStock.lot_id == movement.lot_id).first()
        )

        # マイナス在庫チェック
        if current_stock:
            projected_quantity = current_stock.current_quantity + movement.quantity_delta
        else:
            # 既存の在庫移動がない場合
            projected_quantity = movement.quantity_delta

        if projected_quantity < 0:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=(
                    "在庫不足: 現在在庫 "
                    f"{current_stock.current_quantity if current_stock else 0}, "
                    f"要求 {abs(movement.quantity_delta)}"
                ),
            )

    db.commit()
    db.refresh(db_movement)
    return db_movement
