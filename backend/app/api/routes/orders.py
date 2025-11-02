# backend/app/api/routes/orders.py
"""
受注管理のAPIエンドポイント
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

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
from app.schemas import (
    DragAssignRequest,
    DragAssignResponse,
    OrderCreate,
    OrderLineResponse,
    OrderResponse,
    OrderUpdate,
    OrderWithLinesResponse,
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


@router.get("/{order_id}", response_model=OrderWithLinesResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """受注詳細取得(明細含む)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="受注が見つかりません")

    # 明細に引当済数量を付与
    response = OrderWithLinesResponse.model_validate(order)
    for i, line in enumerate(order.lines):
        allocated_qty = (
            db.query(func.sum(Allocation.allocated_qty))
            .filter(Allocation.order_line_id == line.id)
            .scalar()
            or 0.0
        )
        response.lines[i].allocated_qty = allocated_qty

    return response


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """
    受注登録

    🔽 [変更] フォーキャストマッチング機能を追加
    """
    # 重複チェック
    existing = db.query(Order).filter(Order.order_no == order.order_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="受注番号が既に存在します")

    # 得意先チェック
    customer = (
        db.query(Customer).filter(Customer.customer_code == order.customer_code).first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="得意先が見つかりません")

    # 受注ヘッダ作成
    db_order = Order(**order.model_dump())
    db.add(db_order)
    db.flush()

    # 🔽 [追加] フォーキャストマッチャー初期化
    forecast_matcher = ForecastMatcher(db) if FORECAST_AVAILABLE else None

    # 受注明細作成（OrderCreateにlinesがある場合）
    if hasattr(order, "lines") and order.lines:
        for line_data in order.lines:
            db_line = OrderLine(order_id=db_order.id, **line_data.model_dump())
            db.add(db_line)
            db.flush()

            # 🔽 [追加] フォーキャストマッチング実行
            if forecast_matcher and db_order.order_date:
                try:
                    forecast_matcher.apply_forecast_to_order_line(
                        order_line=db_line,
                        product_code=line_data.product_code,
                        client_code=order.customer_code,
                        order_date=db_order.order_date,
                    )
                except Exception as e:
                    # マッチング失敗は警告のみ
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


# 🔽 [追加] 再マッチングエンドポイント
@router.post("/{order_id}/re-match", response_model=OrderWithLinesResponse)
def rematch_order_forecast(order_id: int, db: Session = Depends(get_db)):
    """
    受注のフォーキャストを再マッチング

    用途:
    - フォーキャストバージョン更新時の再計算
    - マッチング結果の修正
    """
    if not FORECAST_AVAILABLE:
        raise HTTPException(status_code=501, detail="ForecastMatcher が利用できません")

    order = db.query(Order).filter(Order.id == order_id).first()
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

    # レスポンス作成
    response = OrderWithLinesResponse.model_validate(order)
    for i, line in enumerate(order.lines):
        allocated_qty = (
            db.query(func.sum(Allocation.allocated_qty))
            .filter(Allocation.order_line_id == line.id)
            .scalar()
            or 0.0
        )
        response.lines[i].allocated_qty = allocated_qty

    return response


# ===== Order Lines =====
@router.get("/{order_id}/lines", response_model=List[OrderLineResponse])
def list_order_lines(order_id: int, db: Session = Depends(get_db)):
    """受注明細一覧取得"""
    lines = db.query(OrderLine).filter(OrderLine.order_id == order_id).all()

    # 引当済数量を付与
    result = []
    for line in lines:
        allocated_qty = (
            db.query(func.sum(Allocation.allocated_qty))
            .filter(Allocation.order_line_id == line.id)
            .scalar()
            or 0.0
        )

        line_dict = OrderLineResponse.model_validate(line).model_dump()
        line_dict["allocated_qty"] = allocated_qty
        result.append(OrderLineResponse(**line_dict))

    return result


# ===== Drag & Drop Allocation =====
@router.post("/allocations/drag-assign", response_model=DragAssignResponse)
def drag_assign_allocation(request: DragAssignRequest, db: Session = Depends(get_db)):
    """
    ドラッグ引当

    処理フロー:
    1. 受注明細とロットの存在チェック
    2. ロット在庫チェック
    3. 引当レコード作成
    4. 在庫変動(allocate)記録
    5. 現在在庫更新
    """
    # 受注明細チェック
    order_line = (
        db.query(OrderLine).filter(OrderLine.id == request.order_line_id).first()
    )
    if not order_line:
        raise HTTPException(status_code=404, detail="受注明細が見つかりません")

    # ロットチェック
    lot = db.query(Lot).filter(Lot.id == request.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    # 現在在庫チェック
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

    # 引当作成
    allocation = Allocation(
        order_line_id=request.order_line_id,
        lot_id=request.lot_id,
        allocated_qty=request.allocate_qty,
    )
    db.add(allocation)
    db.flush()

    # 在庫変動記録(引当 = マイナス)
    movement = StockMovement(
        lot_id=request.lot_id,
        movement_type="allocate",
        quantity=-request.allocate_qty,  # マイナス数量
        related_id=f"allocation_{allocation.id}",
    )
    db.add(movement)

    # 現在在庫更新
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
    引当取消

    在庫を元に戻す
    """
    allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="引当が見つかりません")

    # 在庫変動記録(取消 = プラス)
    movement = StockMovement(
        lot_id=allocation.lot_id,
        movement_type="adjust",
        quantity=allocation.allocated_qty,  # プラス数量
        related_id=f"cancel_allocation_{allocation_id}",
    )
    db.add(movement)

    # 現在在庫更新
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
