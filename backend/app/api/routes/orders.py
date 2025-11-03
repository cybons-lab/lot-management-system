# backend/app/api/routes/orders.py
"""
受注管理のAPIエンドポイント
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, delete, func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.deps import get_db
from app.models import (
    Allocation,
    Customer,
    Lot,
    LotCurrentStock,
    Order,
    OrderLine,
    OrderLineWarehouseAllocation,
    Product,
    StockMovement,
    StockMovementReason,
    Warehouse,
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
from app.schemas.base import ResponseBase
from app.schemas.orders import (
    AllocationWarning,
    LotCandidateListResponse,
    LotCandidateOut,
    OrderLineOut,
    OrdersWithAllocResponse,
    SaveAllocationsRequest,
    WarehouseAllocOut,
)
from app.services.quantity import QuantityConversionError, to_internal_qty

# フォーキャストマッチング機能（オプション）
try:
    from app.services.forecast import ForecastMatcher

    FORECAST_AVAILABLE = True
except ImportError:
    FORECAST_AVAILABLE = False
    print("⚠️  ForecastMatcher not available - forecast matching will be skipped")

router = APIRouter(prefix="/orders", tags=["orders"])


# ===== リクエストスキーマ =====
class StatusUpdateRequest(BaseModel):
    """ステータス更新用のリクエストボディ"""

    status: str


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
    """倉庫配分情報 + 既引当ロット情報を含む受注明細一覧を取得"""
    query = (
        db.query(OrderLine)
        .options(
            selectinload(OrderLine.warehouse_allocations).joinedload(
                OrderLineWarehouseAllocation.warehouse
            ),
            joinedload(OrderLine.order),
            joinedload(OrderLine.product, innerjoin=False),
            joinedload(OrderLine.forecast, innerjoin=False),
            selectinload(OrderLine.allocations).joinedload(Allocation.lot),  # ← 追加
        )
        .order_by(OrderLine.id)
    )

    lines: List[OrderLine] = query.all()

    items: List[OrderLineOut] = []
    for line in lines:
        # 倉庫配分情報
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

        product_name = (
            line.product.product_name if line.product else "(製品マスタ未登録)"
        )
        customer_code = line.order.customer_code if line.order else "(受注ヘッダなし)"
        supplier_code = line.forecast.supplier_id if line.forecast else ""

        # ← 既引当ロット情報を追加
        allocated_lots = []
        if line.allocations:
            for alloc in line.allocations:
                if alloc.lot:
                    allocated_lots.append(
                        {
                            "allocation_id": alloc.id,
                            "lot_id": alloc.lot.id,
                            "lot_code": f"{alloc.lot.supplier_code}-{alloc.lot.product_code}-{alloc.lot.lot_number}",
                            "allocated_qty": alloc.allocated_qty,
                            "warehouse_code": alloc.lot.warehouse_code or "N/A",
                            "expiry_date": alloc.lot.expiry_date.isoformat()
                            if alloc.lot.expiry_date
                            else None,
                        }
                    )

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
                allocated_lots=allocated_lots,  # ← 追加
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
    if order.customer_order_no and len(order.customer_order_no) < 6:
        raise HTTPException(
            status_code=400, detail="customer_order_noは6桁以上で入力してください"
        )

    existing = db.query(Order).filter(Order.order_no == order.order_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="受注番号が既に存在します")

    customer = (
        db.query(Customer).filter(Customer.customer_code == order.customer_code).first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="得意先が見つかりません")

    order_payload = order.model_dump(exclude={"lines"})
    if order.customer_order_no:
        order_payload["customer_order_no_last6"] = order.customer_order_no[-6:]

    db_order = Order(**order_payload)
    db.add(db_order)
    db.flush()

    forecast_matcher = ForecastMatcher(db) if FORECAST_AVAILABLE else None

    if hasattr(order, "lines") and order.lines:
        for line_data in order.lines:
            product = (
                db.query(Product)
                .filter(Product.product_code == line_data.product_code)
                .first()
            )
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"製品コードが見つかりません: {line_data.product_code}",
                )

            try:
                internal_qty = to_internal_qty(
                    product=product,
                    qty_external=line_data.quantity,
                    external_unit=line_data.external_unit,
                )
            except QuantityConversionError as exc:  # pragma: no cover - 入力不備
                raise HTTPException(status_code=400, detail=str(exc)) from exc

            db_line = OrderLine(
                order_id=db_order.id,
                line_no=line_data.line_no,
                product_code=line_data.product_code,
                quantity=float(internal_qty),
                unit=product.internal_unit,
                due_date=line_data.due_date,
            )
            db.add(db_line)
            db.flush()

            if forecast_matcher and db_order.order_date:
                try:
                    forecast_matcher.apply_forecast_to_order_line(
                        order_line=db_line,
                        product_code=line_data.product_code,
                        customer_code=order.customer_code,
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
                customer_code=order.customer_code,
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
        product_id=lot.product_code,
        warehouse_id=lot.warehouse_id or lot.warehouse_code,
        lot_id=request.lot_id,
        quantity_delta=-request.allocate_qty,
        reason=StockMovementReason.ALLOCATION_HOLD,
        source_table="allocations",
        source_id=allocation.id,
        batch_id=f"allocation_{allocation.id}",
        created_by="system",
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
    allocation = (
        db.query(Allocation)
        .options(selectinload(Allocation.lot))
        .filter(Allocation.id == allocation_id)
        .first()
    )
    if not allocation:
        raise HTTPException(status_code=404, detail="引当が見つかりません")

    lot = allocation.lot
    warehouse_id = lot.warehouse_id if lot else None
    if warehouse_id is None and lot:
        warehouse_id = lot.warehouse_code
    if warehouse_id is None:
        fallback_warehouse = db.query(Warehouse).first()
        warehouse_id = (
            fallback_warehouse.warehouse_code if fallback_warehouse else "WH-DEFAULT"
        )
    movement = StockMovement(
        product_id=lot.product_code if lot else order_line.product_code,
        warehouse_id=warehouse_id,
        lot_id=allocation.lot_id,
        quantity_delta=allocation.allocated_qty,
        reason=StockMovementReason.ALLOCATION_RELEASE,
        source_table="allocations",
        source_id=allocation.id,
        batch_id=f"cancel_allocation_{allocation_id}",
        created_by="system",
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


# ===== ロット候補取得 =====
@router.get(
    "/{order_line_id}/candidate-lots",
    response_model=LotCandidateListResponse,
)
def get_candidate_lots_for_allocation(
    order_line_id: int,
    product_code: Optional[str] = None,
    customer_code: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """受注明細に対する引当候補ロットを取得"""

    warnings: list[AllocationWarning] = []

    order_line = (
        db.query(OrderLine)
        .options(joinedload(OrderLine.order), joinedload(OrderLine.product))
        .filter(OrderLine.id == order_line_id)
        .first()
    )
    if not order_line:
        raise HTTPException(status_code=404, detail="受注明細が見つかりません")

    requested_product_code = (product_code or "").strip()
    order_line_product_code = (
        order_line.product_code.strip() if order_line.product_code else ""
    )

    if (
        requested_product_code
        and order_line_product_code
        and requested_product_code != order_line_product_code
    ):
        warnings.append(
            AllocationWarning(
                code="OCR_MISMATCH",
                message="受注明細の品番と照合結果の品番が一致しません",
                meta={
                    "order_line_product_code": order_line_product_code,
                    "requested_product_code": requested_product_code,
                },
            )
        )

    target_product_code = requested_product_code or order_line_product_code
    if not target_product_code:
        warnings.append(
            AllocationWarning(
                code="OCR_MISMATCH",
                message="品番を特定できませんでした",
            )
        )
        return LotCandidateListResponse(warnings=warnings)

    product = (
        db.query(Product)
        .options(selectinload(Product.conversions))
        .filter(Product.product_code == target_product_code)
        .first()
    )

    if not product:
        warnings.append(
            AllocationWarning(
                code="OCR_MISMATCH",
                message=f"品番 {target_product_code} は製品マスタに存在しません",
                meta={"product_code": target_product_code},
            )
        )
        return LotCandidateListResponse(warnings=warnings)

    base_unit = product.base_unit or product.internal_unit or order_line.unit or "EA"

    normalized_customer_code = (customer_code or "").strip()
    if not normalized_customer_code and order_line.order:
        normalized_customer_code = order_line.order.customer_code or ""

    conversion_map: dict[str, float] = {}
    for conv in product.conversions:
        if conv.source_unit and conv.source_value and conv.internal_unit_value:
            conversion_map[conv.source_unit] = (
                conv.internal_unit_value / conv.source_value
            )

    stocked_lots: list[Lot] = (
        db.query(Lot)
        .options(joinedload(Lot.current_stock))
        .join(LotCurrentStock, Lot.id == LotCurrentStock.lot_id)
        .filter(
            and_(
                Lot.product_code == target_product_code,
                LotCurrentStock.current_quantity > 0,
            )
        )
        .order_by(Lot.expiry_date.asc().nullslast())
        .all()
    )

    total_lot_count = (
        db.query(func.count())
        .select_from(Lot)
        .filter(Lot.product_code == target_product_code)
        .scalar()
        or 0
    )

    items: list[LotCandidateOut] = []
    unit_conversion_missing = False

    for lot in stocked_lots:
        current_stock = lot.current_stock.current_quantity if lot.current_stock else 0.0
        lot_unit = lot.lot_unit or lot.inventory_unit or base_unit

        conversion_factor: Optional[float] = 1.0
        lot_unit_qty = current_stock
        available_qty = current_stock

        if lot_unit and lot_unit != base_unit:
            conversion_factor = conversion_map.get(lot_unit)
            if conversion_factor:
                available_qty = lot_unit_qty * conversion_factor
            else:
                unit_conversion_missing = True
                continue

        items.append(
            LotCandidateOut(
                lot_id=lot.id,
                lot_code=f"{lot.supplier_code}-{lot.product_code}-{lot.lot_number}",
                lot_number=lot.lot_number,
                product_code=lot.product_code,
                warehouse_code=lot.warehouse_code or "",
                available_qty=available_qty,
                base_unit=base_unit,
                lot_unit_qty=lot_unit_qty if lot_unit else None,
                lot_unit=lot_unit,
                conversion_factor=conversion_factor,
                expiry_date=lot.expiry_date.isoformat() if lot.expiry_date else None,
                mfg_date=lot.mfg_date.isoformat() if lot.mfg_date else None,
            )
        )

    if total_lot_count == 0:
        warnings.append(
            AllocationWarning(
                code="NO_INBOUND_YET",
                message=f"品番 {target_product_code} はまだ入荷登録がありません",
                meta={
                    "product_code": target_product_code,
                    "customer_code": normalized_customer_code or None,
                },
            )
        )
    elif not items:
        warnings.append(
            AllocationWarning(
                code="OUT_OF_STOCK",
                message=f"品番 {target_product_code} のロットは登録されていますが利用可能在庫がありません",
                meta={
                    "product_code": target_product_code,
                    "customer_code": normalized_customer_code or None,
                },
            )
        )

    if unit_conversion_missing:
        warnings.append(
            AllocationWarning(
                code="UNIT_CONVERSION_MISSING",
                message="単位換算が未登録のロットがあるため候補から除外しました",
                meta={"product_code": target_product_code},
            )
        )

    return LotCandidateListResponse(items=items, warnings=warnings)


# ===== ロット引当実行 =====
@router.post("/{order_line_id}/allocations")
def create_lot_allocations(
    order_line_id: int, request: dict, db: Session = Depends(get_db)
):
    """ロット引当を実行（複数ロット対応）"""
    order_line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not order_line:
        raise HTTPException(status_code=404, detail="受注明細が見つかりません")

    allocations_data = request.get("allocations", [])
    if not allocations_data:
        raise HTTPException(
            status_code=422, detail="VALIDATION_ERROR: allocations が空です"
        )

    applied = []

    try:
        for alloc in allocations_data:
            lot_id = alloc.get("lot_id")
            qty = alloc.get("qty")

            if not lot_id or not qty or qty <= 0:
                raise HTTPException(
                    status_code=422,
                    detail=f"VALIDATION_ERROR: 無効な引当データ {alloc}",
                )

            lot = db.query(Lot).filter(Lot.id == lot_id).first()
            if not lot:
                raise HTTPException(
                    status_code=404, detail=f"ロットID {lot_id} が見つかりません"
                )

            # 単位チェック
            lot_unit = lot.lot_unit or lot.inventory_unit or "EA"
            order_unit = order_line.unit or "EA"
            if lot_unit != order_unit:
                raise HTTPException(
                    status_code=422,
                    detail=f"VALIDATION_ERROR: 単位不一致 (ロット: {lot_unit}, 受注: {order_unit})",
                )

            # 在庫チェック
            current_stock = (
                db.query(LotCurrentStock)
                .filter(LotCurrentStock.lot_id == lot_id)
                .first()
            )

            if not current_stock or current_stock.current_quantity < qty:
                avail = current_stock.current_quantity if current_stock else 0.0
                raise HTTPException(
                    status_code=409,
                    detail=f"ALLOCATION_CONFLICT: 在庫不足 (利用可能: {avail}, 要求: {qty})",
                )

            # 引当レコード作成
            allocation = Allocation(
                order_line_id=order_line_id, lot_id=lot_id, allocated_qty=qty
            )
            db.add(allocation)
            db.flush()

            # 在庫変動記録
            movement = StockMovement(
                product_id=lot.product_code,
                warehouse_id=lot.warehouse_id or lot.warehouse_code,
                lot_id=lot_id,
                quantity_delta=-qty,
                reason=StockMovementReason.ALLOCATION_HOLD,
                source_table="allocations",
                source_id=allocation.id,
                batch_id=f"allocation_{allocation.id}",
                created_by="system",
            )
            db.add(movement)

            # 現在在庫更新
            current_stock.current_quantity -= qty

            applied.append(
                {"lot_id": lot_id, "qty": qty, "allocation_id": allocation.id}
            )

        db.commit()
        db.refresh(order_line)

        return {
            "success": True,
            "message": "引当が完了しました",
            "applied": applied,
            "order_line": {
                "id": order_line.id,
                "product_code": order_line.product_code,
                "quantity": order_line.quantity,
                "unit": order_line.unit,
            },
        }

    except Exception:
        db.rollback()
        raise


# ===== 引当取消 =====
@router.post("/{order_line_id}/allocations/cancel")
def cancel_lot_allocations(
    order_line_id: int, request: dict, db: Session = Depends(get_db)
):
    """ロット引当を取消"""
    order_line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not order_line:
        raise HTTPException(status_code=404, detail="受注明細が見つかりません")

    allocation_id = request.get("allocation_id")
    cancel_all = request.get("all", False)

    try:
        if cancel_all:
            allocations = (
                db.query(Allocation)
                .options(selectinload(Allocation.lot))
                .filter(Allocation.order_line_id == order_line_id)
                .all()
            )
        elif allocation_id:
            allocation = (
                db.query(Allocation)
                .options(selectinload(Allocation.lot))
                .filter(Allocation.id == allocation_id)
                .first()
            )
            if not allocation:
                raise HTTPException(
                    status_code=404, detail="引当レコードが見つかりません"
                )
            allocations = [allocation]
        else:
            raise HTTPException(
                status_code=422,
                detail="VALIDATION_ERROR: allocation_id または all を指定してください",
            )

        for alloc in allocations:
            # 在庫変動記録（戻し）
            lot = alloc.lot
            warehouse_id = lot.warehouse_id if lot else None
            if warehouse_id is None and lot:
                warehouse_id = lot.warehouse_code
            if warehouse_id is None:
                fallback_warehouse = db.query(Warehouse).first()
                warehouse_id = (
                    fallback_warehouse.warehouse_code
                    if fallback_warehouse
                    else "WH-DEFAULT"
                )
            movement = StockMovement(
                product_id=lot.product_code if lot else order_line.product_code,
                warehouse_id=warehouse_id,
                lot_id=alloc.lot_id,
                quantity_delta=alloc.allocated_qty,
                reason=StockMovementReason.ALLOCATION_RELEASE,
                source_table="allocations",
                source_id=alloc.id,
                batch_id=f"cancel_allocation_{alloc.id}",
                created_by="system",
            )
            db.add(movement)

            # 現在在庫更新
            current_stock = (
                db.query(LotCurrentStock)
                .filter(LotCurrentStock.lot_id == alloc.lot_id)
                .first()
            )
            if current_stock:
                current_stock.current_quantity += alloc.allocated_qty

            db.delete(alloc)

        db.commit()
        db.refresh(order_line)

        return {
            "success": True,
            "message": f"{len(allocations)}件の引当を取消しました",
            "order_line": {
                "id": order_line.id,
                "product_code": order_line.product_code,
                "quantity": order_line.quantity,
                "unit": order_line.unit,
            },
        }

    except Exception:
        db.rollback()
        raise


@router.patch("/{order_line_id}/status")
def update_order_line_status(
    order_line_id: int, request: StatusUpdateRequest, db: Session = Depends(get_db)
):
    """
    受注明細のステータスを更新

    - 引当完了時に "allocated" に変更
    - 出荷時に "shipped" に変更
    """
    new_status = request.status

    # 受注明細を取得
    stmt = select(OrderLine).where(OrderLine.id == order_line_id)
    order_line = db.execute(stmt).scalar_one_or_none()

    if not order_line:
        raise HTTPException(
            status_code=404, detail=f"OrderLine {order_line_id} not found"
        )

    # ステータスの検証
    valid_statuses = [
        "open",
        "allocated",
        "partially_allocated",
        "shipped",
        "completed",
    ]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    # "allocated" に変更する場合、引当数量をチェック
    if new_status == "allocated":
        # 引当済み数量を計算
        stmt_alloc = select(func.sum(Allocation.allocated_qty)).where(
            Allocation.order_line_id == order_line_id
        )
        total_allocated = db.execute(stmt_alloc).scalar() or 0.0

        # 必要数量と比較
        if total_allocated < order_line.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot set status to 'allocated': allocated quantity ({total_allocated}) is less than required quantity ({order_line.quantity})",
            )

    # ステータスを更新
    order_line.status = new_status
    db.commit()
    db.refresh(order_line)

    return {
        "success": True,
        "message": f"Order line status updated to '{new_status}'",
        "order_line_id": order_line_id,
        "new_status": new_status,
    }
