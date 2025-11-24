# backend/app/api/routes/lots.py
"""ロット・在庫管理のAPIエンドポイント."""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.inventory_models import Lot, StockMovement, StockMovementReason
from app.models.masters_models import Product, Supplier, Warehouse
from app.models.view_models import LotWithMaster
from app.schemas.inventory.inventory_schema import (
    LotCreate,
    LotLock,
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
        product_id: 製品ID
        product_code: 製品コード
        supplier_code: 仕入先コード
        warehouse_code: 倉庫コード
        expiry_from: 有効期限開始日
        expiry_to: 有効期限終了日
        with_stock: 在庫ありのみ取得するかどうか
        db: データベースセッション

    ロット一覧取得（v_lots_with_master ビュー使用）.

    製品コード・仕入先コード・倉庫コード・有効期限範囲でフィルタリング可能.
    FEFO (先入先出) 順に並べて返す.
    """
    # Use the view instead of Lot model with JOINs
    query = db.query(LotWithMaster)

    # フィルタ適用
    if product_id is not None:
        query = query.filter(LotWithMaster.product_id == product_id)
    elif product_code:
        query = query.filter(LotWithMaster.product_code == product_code)

    if supplier_code:
        # View already has supplier_name, just filter by joining suppliers table
        supplier = db.query(Supplier).filter(Supplier.supplier_code == supplier_code).first()
        if supplier:
            query = query.filter(LotWithMaster.supplier_id == supplier.id)

    if warehouse_code:
        warehouse = db.query(Warehouse).filter(Warehouse.warehouse_code == warehouse_code).first()
        if warehouse:
            query = query.filter(LotWithMaster.warehouse_id == warehouse.id)

    if expiry_from:
        query = query.filter(LotWithMaster.expiry_date >= expiry_from)
    if expiry_to:
        query = query.filter(LotWithMaster.expiry_date <= expiry_to)

    # 在庫ありのみ
    if with_stock:
        query = query.filter(
            (LotWithMaster.current_quantity - LotWithMaster.allocated_quantity) > 0
        )

    # Default sort: product_code -> supplier_name -> expiry_date (FEFO)
    query = query.order_by(
        LotWithMaster.product_code.asc(),
        LotWithMaster.supplier_name.asc(),
        LotWithMaster.expiry_date.asc().nullslast(),
    )

    lot_views = query.offset(skip).limit(limit).all()

    # Map view results to LotResponse
    responses: list[LotResponse] = []
    for lot_view in lot_views:
        response = LotResponse.model_validate(lot_view)
        # All fields are already populated from the view
        # No need for manual JOIN population
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

    # Eagerly load relationships for response
    db_lot = (
        db.query(Lot)
        .options(joinedload(Lot.product), joinedload(Lot.warehouse), joinedload(Lot.supplier))
        .filter(Lot.id == db_lot.id)
        .first()
    )

    # レスポンス（v2.2: Lot モデルから直接取得）
    response = LotResponse.model_validate(db_lot)

    # Populate joined fields
    if db_lot.product:
        response.product_name = db_lot.product.product_name
        response.product_code = db_lot.product.product_code

    if db_lot.warehouse:
        response.warehouse_name = db_lot.warehouse.warehouse_name
        response.warehouse_code = db_lot.warehouse.warehouse_code

    if db_lot.supplier:
        response.supplier_name = db_lot.supplier.supplier_name
        response.supplier_code = db_lot.supplier.supplier_code

    response.current_quantity = float(db_lot.current_quantity or 0.0)
    response.last_updated = db_lot.updated_at

    return response


@router.get("/{lot_id}", response_model=LotResponse)
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    """ロット詳細取得（v2.2: Lot モデルから直接取得）."""
    lot = (
        db.query(Lot)
        .options(joinedload(Lot.product), joinedload(Lot.warehouse), joinedload(Lot.supplier))
        .filter(Lot.id == lot_id)
        .first()
    )
    if not lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    response = LotResponse.model_validate(lot)

    # Populate joined fields
    if lot.product:
        response.product_name = lot.product.product_name
        response.product_code = lot.product.product_code

    if lot.warehouse:
        response.warehouse_name = lot.warehouse.warehouse_name
        response.warehouse_code = lot.warehouse.warehouse_code

    if lot.supplier:
        response.supplier_name = lot.supplier.supplier_name
        response.supplier_code = lot.supplier.supplier_code

    response.current_quantity = float(lot.current_quantity or 0.0)
    response.last_updated = lot.updated_at
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

    # Eagerly load relationships for response
    db_lot = (
        db.query(Lot)
        .options(joinedload(Lot.product), joinedload(Lot.warehouse), joinedload(Lot.supplier))
        .filter(Lot.id == db_lot.id)
        .first()
    )

    # v2.2: Use Lot model directly for stock quantities
    response = LotResponse.model_validate(db_lot)

    # Populate joined fields
    if db_lot.product:
        response.product_name = db_lot.product.product_name
        response.product_code = db_lot.product.product_code

    if db_lot.warehouse:
        response.warehouse_name = db_lot.warehouse.warehouse_name
        response.warehouse_code = db_lot.warehouse.warehouse_code

    if db_lot.supplier:
        response.supplier_name = db_lot.supplier.supplier_name
        response.supplier_code = db_lot.supplier.supplier_code

    response.current_quantity = float(db_lot.current_quantity or 0.0)
    response.last_updated = db_lot.updated_at

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


@router.post("/{lot_id}/lock", response_model=LotResponse)
def lock_lot(lot_id: int, lock_data: LotLock, db: Session = Depends(get_db)):
    """ロットをロックする."""
    db_lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not db_lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    db_lot.status = "locked"
    db_lot.lock_reason = lock_data.reason
    db_lot.updated_at = datetime.now()

    db.commit()

    # v2.2: Fetch from view to ensure all required fields (product_name, etc.) are present
    lot_view = db.query(LotWithMaster).filter(LotWithMaster.id == lot_id).first()
    if not lot_view:
        # Should not happen if db_lot exists, but for safety
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    return LotResponse.model_validate(lot_view)


@router.post("/{lot_id}/unlock", response_model=LotResponse)
def unlock_lot(lot_id: int, db: Session = Depends(get_db)):
    """ロットのロックを解除する."""
    db_lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not db_lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    db_lot.status = "active"
    db_lot.lock_reason = None
    db_lot.updated_at = datetime.now()

    db.commit()

    # v2.2: Fetch from view to ensure all required fields are present
    lot_view = db.query(LotWithMaster).filter(LotWithMaster.id == lot_id).first()
    if not lot_view:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    return LotResponse.model_validate(lot_view)


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

    # 現在在庫チェック（v2.2: Lot モデルから直接確認）
    if movement.lot_id:
        lot = db.query(Lot).filter(Lot.id == movement.lot_id).first()
        if not lot:
            db.rollback()
            raise HTTPException(status_code=404, detail="ロットが見つかりません")

        # マイナス在庫チェック
        projected_quantity = float(lot.current_quantity or 0.0) + movement.quantity_delta

        if projected_quantity < 0:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=(
                    f"在庫不足: 現在在庫 {lot.current_quantity or 0}, "
                    f"要求 {abs(movement.quantity_delta)}"
                ),
            )

        # Lot の current_quantity を更新
        lot.current_quantity = projected_quantity
        lot.updated_at = datetime.now()

    db.commit()
    db.refresh(db_movement)
    return db_movement
