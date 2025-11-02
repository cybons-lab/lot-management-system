# backend/app/api/routes/orders.py
"""
受注管理のAPIエンドポイント
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.deps import get_db
from app.models import (
    Allocation,
    Customer,
    Lot,
    LotCurrentStock,
    Order,
    OrderLine,
    StockMovement,
)
from app.models.warehouse import OrderLineWarehouseAllocation, Warehouse
from app.schemas import (
    DragAssignRequest,
    DragAssignResponse,
    OrderCreate,
    OrderLineResponse,
    OrderResponse,
    OrderUpdate,
    OrderWithLinesResponse,
)
from app.schemas.base import ResponseBase
from app.schemas.orders import (
    OrderLineOut,
    OrdersWithAllocResponse,
    SaveAllocationsRequest,
    WarehouseAllocOut,
)

# フォーキャストマッチング機能（オプション）
try:
    from app.services.forecast import ForecastMatcher

    FORECAST_AVAILABLE = True
except ImportError:
    FORECAST_AVAILABLE = False
    print("⚠️  ForecastMatcher not available - forecast matching will be skipped")

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=List[OrderResponse])
def list_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    customer_code: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """受注一覧取得"""
    query = db.query(Order)

    if status:
        query = query.filter(Order.status == status)
    if customer_code:
        query = query.filter(Order.customer_code == customer_code)
    if date_from:
        query = query.filter(Order.order_date >= date_from)
    if date_to:
        query = query.filter(Order.order_date <= date_to)

    orders = query.order_by(Order.order_date.desc()).offset(skip).limit(limit).all()
    return orders


# ===================================================================
# 🔽 [修正] /orders-with-allocations (静的パス) を
# 　 /{order_id} (動的パス) より「前」に定義する
# ===================================================================
@router.get("/orders-with-allocations", response_model=OrdersWithAllocResponse)
def get_orders_with_allocations(db: Session = Depends(get_db)):
    """
    倉庫配分情報を含む受注明細一覧を取得
    """
    query = (
        db.query(OrderLine)
        .options(
            # 倉庫配分 (LEFT JOIN)
            selectinload(OrderLine.warehouse_allocations).joinedload(
                OrderLineWarehouseAllocation.warehouse
            ),
            # 受注ヘッダ (INNER JOIN - 必須)
            joinedload(OrderLine.order),
            # 🔽 [修正] 'outerjoin=True' ではなく 'innerjoin=False' が正しい構文
            # 製品マスタ (LEFT JOIN)
            joinedload(OrderLine.product, innerjoin=False),
            # フォーキャスト (LEFT JOIN)
            joinedload(OrderLine.forecast, innerjoin=False),
        )
        .order_by(OrderLine.id)
    )

    lines: List[OrderLine] = query.all()

    items: List[OrderLineOut] = []
    for line in lines:
        allocs: List[WarehouseAllocOut] = []

        if line.warehouse_allocations:
            for a in line.warehouse_allocations:
                if a.warehouse:
                    allocs.append(
                        WarehouseAllocOut(
                            warehouse_code=a.warehouse.warehouse_code,
                            quantity=a.quantity,
                        )
                    )

        # 🔽 line.product や line.order が None の可能性も考慮 (innerjoin=False のため)
        product_name = (
            line.product.product_name if line.product else "(製品マスタ未登録)"
        )
        customer_code = line.order.customer_code if line.order else "(受注ヘッダなし)"

        supplier_code = line.forecast.supplier_id if line.forecast else ""
        if line.forecast:
            supplier_code = line.forecast.supplier_id

        items.append(
            OrderLineOut(
                id=line.id,
                product_code=line.product_code,
                product_name=product_name,
                customer_code=customer_code,
                supplier_code=supplier_code,
                quantity=line.quantity,
                unit=line.unit or "EA",
                warehouse_allocations=allocs,
                related_lots=[],
            )
        )

    return OrdersWithAllocResponse(items=items)


# ===================================================================
# 🔽 [修正] /{order_id} (動的パス) は静的パスの「後」に定義する
# ===================================================================
@router.get("/{order_id}", response_model=OrderWithLinesResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """受注詳細取得(明細含む)"""
    order = (
        db.query(Order)
        .options(selectinload(Order.lines).selectinload(OrderLine.lot_allocations))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="受注が見つかりません")

    # 明細に引当済数量を付与
    response = OrderWithLinesResponse.model_validate(order)
    for i, line in enumerate(order.lines):
        allocated_qty = sum(alloc.allocated_qty for alloc in line.lot_allocations)
        response.lines[i].allocated_qty = allocated_qty

    return response


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """
    受注登録
    """
    existing = db.query(Order).filter(Order.order_no == order.order_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="受注番号が既に存在します")

    customer = (
        db.query(Customer).filter(Customer.customer_code == order.customer_code).first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="得意先が見つかりません")

    db_order = Order(**order.model_dump(exclude={"lines"}))
    db.add(db_order)
    db.flush()

    forecast_matcher = ForecastMatcher(db) if FORECAST_AVAILABLE else None

    if hasattr(order, "lines") and order.lines:
        for line_data in order.lines:
            db_line = OrderLine(order_id=db_order.id, **line_data.model_dump())
            db.add(db_line)
            db.flush()

            if forecast_matcher and db_order.order_date:
                try:
                    forecast_matcher.apply_forecast_to_order_line(
                        order_line=db_line,
                        product_code=line_data.product_code,
                        client_code=order.customer_code,
                        order_date=db_order.order_date,
                    )
                except Exception as e:
                    print(
                        f"⚠️  Forecast matching failed for order {order.order_no}: {e}"
                    )

    db.commit()
    db.refresh(db_order)
    return db_order


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(order_id: int, order: OrderUpdate, db: Session = Depends(get_db)):
    """受注更新"""
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="受注が見つかりません")

    for key, value in order.model_dump(exclude_unset=True).items():
        setattr(db_order, key, value)

    db.commit()
    db.refresh(db_order)
    return db_order


@router.post("/{order_id}/re-match", response_model=OrderWithLinesResponse)
def rematch_order_forecast(order_id: int, db: Session = Depends(get_db)):
    """
    受注のフォーキャストを再マッチング
    """
    if not FORECAST_AVAILABLE:
        raise HTTPException(status_code=501, detail="ForecastMatcher が利用できません")

    order = (
        db.query(Order)
        .options(selectinload(Order.lines).selectinload(OrderLine.lot_allocations))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="受注が見つかりません")

    if not order.order_date:
        raise HTTPException(
            status_code=400, detail="受注日が設定されていないためマッチングできません"
        )

    forecast_matcher = ForecastMatcher(db)
    matched_count = 0

    for line in order.lines:
        try:
            success = forecast_matcher.apply_forecast_to_order_line(
                order_line=line,
                product_code=line.product_code,
                client_code=order.customer_code,
                order_date=order.order_date,
            )
            if success:
                matched_count += 1
        except Exception as e:
            print(f"⚠️  Re-matching failed for line {line.line_no}: {e}")

    db.commit()
    db.refresh(order)

    response = OrderWithLinesResponse.model_validate(order)
    for i, line in enumerate(order.lines):
        allocated_qty = sum(alloc.allocated_qty for alloc in line.lot_allocations)
        response.lines[i].allocated_qty = allocated_qty

    return response


# ===== Order Lines =====
@router.get("/{order_id}/lines", response_model=List[OrderLineResponse])
def list_order_lines(order_id: int, db: Session = Depends(get_db)):
    """受注明細一覧取得"""
    lines = (
        db.query(OrderLine)
        .options(selectinload(OrderLine.lot_allocations))
        .filter(OrderLine.order_id == order_id)
        .all()
    )

    result = []
    for line in lines:
        allocated_qty = sum(alloc.allocated_qty for alloc in line.lot_allocations)
        line_dict = OrderLineResponse.model_validate(line).model_dump()
        line_dict["allocated_qty"] = allocated_qty
        result.append(OrderLineResponse(**line_dict))

    return result


# ===== Drag & Drop Allocation (Lot Allocation) =====
@router.post("/allocations/drag-assign", response_model=DragAssignResponse)
def drag_assign_allocation(request: DragAssignRequest, db: Session = Depends(get_db)):
    """
    ドラッグ引当 (ロット引当)
    """
    order_line = (
        db.query(OrderLine).filter(OrderLine.id == request.order_line_id).first()
    )
    if not order_line:
        raise HTTPException(status_code=404, detail="受注明細が見つかりません")

    lot = db.query(Lot).filter(Lot.id == request.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    current_stock = (
        db.query(LotCurrentStock)
        .filter(LotCurrentStock.lot_id == request.lot_id)
        .first()
    )

    if not current_stock or current_stock.current_quantity < request.allocate_qty:
        raise HTTPException(
            status_code=400,
            detail=f"在庫不足: 現在在庫 {current_stock.current_quantity if current_stock else 0}, 要求 {request.allocate_qty}",
        )

    allocation = Allocation(
        order_line_id=request.order_line_id,
        lot_id=request.lot_id,
        allocated_qty=request.allocate_qty,
    )
    db.add(allocation)
    db.flush()

    movement = StockMovement(
        lot_id=request.lot_id,
        movement_type="allocate",
        quantity=-request.allocate_qty,
        related_id=f"allocation_{allocation.id}",
    )
    db.add(movement)

    current_stock.current_quantity -= request.allocate_qty

    db.commit()
    db.refresh(allocation)
    db.refresh(current_stock)

    return DragAssignResponse(
        success=True,
        message="引当が完了しました",
        allocated_id=allocation.id,
        remaining_lot_qty=current_stock.current_quantity,
    )


@router.delete("/allocations/{allocation_id}", status_code=204)
def cancel_allocation(allocation_id: int, db: Session = Depends(get_db)):
    """
    引当取消 (ロット引当)
    """
    allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="引当が見つかりません")

    movement = StockMovement(
        lot_id=allocation.lot_id,
        movement_type="adjust",
        quantity=allocation.allocated_qty,
        related_id=f"cancel_allocation_{allocation_id}",
    )
    db.add(movement)

    current_stock = (
        db.query(LotCurrentStock)
        .filter(LotCurrentStock.lot_id == allocation.lot_id)
        .first()
    )
    if current_stock:
        current_stock.current_quantity += allocation.allocated_qty

    db.delete(allocation)
    db.commit()
    return None


# 🔽 倉庫配分(Warehouse Allocation) 関連 🔽
# (get_orders_with_allocations は上記で移動済み)


@router.post("/{order_line_id}/warehouse-allocations", response_model=ResponseBase)
def save_warehouse_allocations(
    order_line_id: int, req: SaveAllocationsRequest, db: Session = Depends(get_db)
):
    """
    受注明細に対する倉庫配分を保存 (全置換)
    """
    line = db.get(OrderLine, order_line_id)
    if not line:
        raise HTTPException(status_code=404, detail="OrderLine not found")

    codes = [a.warehouse_code for a in req.allocations]
    wh_map = {}
    if codes:
        stmt = select(Warehouse).where(Warehouse.warehouse_code.in_(codes))
        warehouses = db.execute(stmt).scalars().all()
        wh_map = {w.warehouse_code: w for w in warehouses}

        for code in codes:
            if code not in wh_map:
                raise HTTPException(
                    status_code=400, detail=f"Warehouse code not found: {code}"
                )

    try:
        db.execute(
            delete(OrderLineWarehouseAllocation).where(
                OrderLineWarehouseAllocation.order_line_id == order_line_id
            )
        )

        for alloc_in in req.allocations:
            if alloc_in.quantity > 0:  # 数量0は保存しない (オプション)
                wh = wh_map[alloc_in.warehouse_code]

                new_alloc = OrderLineWarehouseAllocation(
                    order_line_id=order_line_id,
                    warehouse_id=wh.id,
                    quantity=alloc_in.quantity,
                )
                db.add(new_alloc)

        db.commit()

        return ResponseBase(success=True, message="配分を保存しました")

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"保存に失敗しました: {str(e)}")
