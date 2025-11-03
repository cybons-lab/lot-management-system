"""
管理機能のAPIエンドポイント - サンプルデータ投入修正版（パッチ適用済）
"""

import logging
import traceback
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.database import drop_db, init_db
from app.models import (
    Allocation,
    Customer,
    Lot,
    LotCurrentStock,
    Order,
    OrderLine,
    Product,
    ReceiptHeader,
    ReceiptLine,
    StockMovement,
    StockMovementReason,
    Supplier,
    Warehouse,  # 統合された新Warehouse
)
from app.schemas import (
    DashboardStatsResponse,
    FullSampleDataRequest,
    ResponseBase,
)

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """ダッシュボード用の統計情報を返す"""

    total_stock = (
        db.query(
            func.coalesce(func.sum(LotCurrentStock.current_quantity), 0.0)
        ).scalar()
        or 0.0
    )

    total_orders = db.query(func.count(Order.id)).scalar() or 0

    unallocated_subquery = (
        db.query(OrderLine.order_id)
        .outerjoin(Allocation, Allocation.order_line_id == OrderLine.id)
        .group_by(OrderLine.id, OrderLine.order_id, OrderLine.quantity)
        .having(
            func.coalesce(func.sum(Allocation.allocated_qty), 0)
            < func.coalesce(OrderLine.quantity, 0)
        )
        .subquery()
    )

    unallocated_orders = (
        db.query(func.count(func.distinct(unallocated_subquery.c.order_id))).scalar()
        or 0
    )

    return DashboardStatsResponse(
        total_stock=float(total_stock),
        total_orders=int(total_orders),
        unallocated_orders=int(unallocated_orders),
    )


@router.post("/reset-database", response_model=ResponseBase)
def reset_database(db: Session = Depends(get_db)):
    """
    データベースリセット（開発環境のみ）
    新スキーマに対応したマスタデータを投入
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403, detail="本番環境ではデータベースのリセットはできません"
        )

    try:
        drop_db()
        init_db()

        # [修正] 新warehouseテーブルへのマスタ投入（ORM経由でAuditMixinの自動設定を有効にする）
        warehouses = [
            Warehouse(warehouse_code="WH001", warehouse_name="第一倉庫", is_active=1),
            Warehouse(warehouse_code="WH002", warehouse_name="第二倉庫", is_active=1),
            Warehouse(
                warehouse_code="WH003", warehouse_name="第三倉庫（予備）", is_active=1
            ),
        ]

        suppliers = [
            Supplier(supplier_code="SUP001", supplier_name="サプライヤーA"),
            Supplier(supplier_code="SUP002", supplier_name="サプライヤーB"),
            Supplier(supplier_code="SUP003", supplier_name="サプライヤーC"),
        ]

        customers = [
            Customer(customer_code="CUS001", customer_name="得意先A"),
            Customer(customer_code="CUS002", customer_name="得意先B"),
            Customer(customer_code="CUS003", customer_name="得意先C"),
        ]

        db.add_all([*warehouses, *suppliers, *customers])
        db.commit()

        return ResponseBase(
            success=True,
            message="データベースをリセットしました（新スキーマ対応）",
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"DBリセット失敗: {e}\n{traceback.format_exc()}"
        )


@router.post("/load-full-sample-data", response_model=ResponseBase)
def load_full_sample_data(data: FullSampleDataRequest, db: Session = Depends(get_db)):
    """
    一括サンプルデータ投入（新スキーマ対応版）

    処理順序:
    1. 製品マスタ
    2. ロット登録
    3. 入荷伝票作成（在庫変動も自動）
    4. 受注登録
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403, detail="本番環境ではサンプルデータの投入はできません"
        )

    counts = {
        "products": 0,
        "lots": 0,
        "receipts": 0,
        "orders": 0,
    }

    validation_warnings: list[str] = []

    def warn(message: str) -> None:
        validation_warnings.append(message)
        logger.warning("[sample-data] %s", message)

    try:
        # 事前に必要となるマスタを自動作成
        _ensure_suppliers(
            db,
            _collect_supplier_codes(data),
            warn,
        )
        _ensure_warehouses(
            db,
            _collect_warehouse_codes(data),
            warn,
        )
        _ensure_customers(
            db,
            _collect_customer_codes(data),
            warn,
        )

        # ==== 1. 製品マスタ ====
        if data.products:
            for p in data.products:
                existing_product = (
                    db.query(Product).filter_by(product_code=p.product_code).first()
                )
                if existing_product:
                    continue

                requires_lot_number = bool(p.requires_lot_number)

                db_product = Product(
                    product_code=p.product_code,
                    product_name=p.product_name,
                    internal_unit=p.internal_unit or "EA",
                    base_unit=getattr(p, "base_unit", "EA") or "EA",
                    requires_lot_number=1 if requires_lot_number else 0,
                )
                db.add(db_product)
                counts["products"] += 1

            db.commit()

        # ==== 2. ロット登録 ====
        if data.lots:
            for lot_data in data.lots:
                if not lot_data.warehouse_code:
                    warn(
                        f"ロット {lot_data.lot_number}: 倉庫コードが指定されていないためスキップしました"
                    )
                    continue

                # warehouse_codeからwarehouse_idを取得
                warehouse = _ensure_warehouse(db, lot_data.warehouse_code, warn)

                if not warehouse:
                    continue

                product_exists = (
                    db.query(Product)
                    .filter_by(product_code=lot_data.product_code)
                    .first()
                )
                if not product_exists:
                    warn(
                        f"ロット {lot_data.lot_number}: 製品コード '{lot_data.product_code}' が存在しないためスキップしました"
                    )
                    continue

                existing_lot = (
                    db.query(Lot)
                    .filter_by(
                        supplier_code=lot_data.supplier_code,
                        product_code=lot_data.product_code,
                        lot_number=lot_data.lot_number,
                    )
                    .first()
                )

                if existing_lot:
                    continue

                # 日付変換
                receipt_date_obj = _parse_iso_date(
                    lot_data.receipt_date, f"lot {lot_data.lot_number}", "receipt_date"
                )
                expiry_date_obj = (
                    _parse_iso_date(
                        lot_data.expiry_date,
                        f"lot {lot_data.lot_number}",
                        "expiry_date",
                    )
                    if hasattr(lot_data, "expiry_date")
                    else None
                )

                db_lot = Lot(
                    supplier_code=lot_data.supplier_code,
                    product_code=lot_data.product_code,
                    lot_number=lot_data.lot_number,
                    receipt_date=receipt_date_obj or date.today(),
                    expiry_date=expiry_date_obj,
                    warehouse_id=warehouse.id,  # IDを使用
                    lot_unit=getattr(lot_data, "lot_unit", "EA"),
                )
                db.add(db_lot)
                db.flush()

                # 現在在庫の初期化
                db_current_stock = LotCurrentStock(
                    lot_id=db_lot.id,
                    current_quantity=0.0,
                )
                db.add(db_current_stock)

                counts["lots"] += 1

            db.commit()

        # ==== 3. 入荷伝票 ====
        if data.receipts:
            for receipt_data in data.receipts:
                warehouse = _ensure_warehouse(
                    db, receipt_data.warehouse_code, warn
                )

                if not warehouse:
                    continue

                existing_receipt = (
                    db.query(ReceiptHeader)
                    .filter_by(receipt_no=receipt_data.receipt_no)
                    .first()
                )

                if existing_receipt:
                    continue

                receipt_date_obj = _parse_iso_date(
                    receipt_data.receipt_date,
                    f"receipt {receipt_data.receipt_no}",
                    "receipt_date",
                )

                db_receipt = ReceiptHeader(
                    receipt_no=receipt_data.receipt_no,
                    supplier_code=receipt_data.supplier_code,
                    warehouse_id=warehouse.id,  # IDを使用
                    receipt_date=receipt_date_obj or date.today(),
                    notes=getattr(receipt_data, "notes", None),
                )
                db.add(db_receipt)
                db.flush()

                if not receipt_data.lines:
                    warn(
                        f"入荷伝票 {receipt_data.receipt_no}: 明細が存在しないためスキップしました"
                    )
                    db.delete(db_receipt)
                    db.flush()
                    continue

                # 明細行
                line_created = False
                for line_data in receipt_data.lines:
                    if line_data.quantity is None or line_data.quantity <= 0:
                        warn(
                            f"入荷伝票 {receipt_data.receipt_no} 明細 {line_data.line_no}: 数量が正の数値ではないためスキップしました"
                        )
                        continue

                    lot_id = line_data.lot_id
                    if lot_id is None:
                        lot_number = getattr(line_data, "lot_number", None)
                        if lot_number:
                            lot_obj = (
                                db.query(Lot)
                                .filter_by(
                                    product_code=line_data.product_code,
                                    lot_number=lot_number,
                                )
                                .first()
                            )
                            if lot_obj:
                                lot_id = lot_obj.id
                            else:
                                warn(
                                    f"入荷伝票 {receipt_data.receipt_no} 明細 {line_data.line_no}: ロット番号 '{lot_number}' が見つからないためスキップしました"
                                )
                                continue
                        else:
                            warn(
                                f"入荷伝票 {receipt_data.receipt_no} 明細 {line_data.line_no}: lot_id または lot_number を指定してください"
                            )
                            continue

                    product = (
                        db.query(Product)
                        .filter_by(product_code=line_data.product_code)
                        .first()
                    )
                    if not product:
                        warn(
                            f"入荷伝票 {receipt_data.receipt_no} 明細 {line_data.line_no}: 製品コード '{line_data.product_code}' が存在しないためスキップしました"
                        )
                        continue

                    db_line = ReceiptLine(
                        header_id=db_receipt.id,
                        line_no=line_data.line_no,
                        product_code=line_data.product_code,
                        lot_id=lot_id,
                        quantity=line_data.quantity,
                        unit=line_data.unit,
                    )
                    db.add(db_line)
                    line_created = True

                    # 在庫変動記録
                    db_movement = StockMovement(
                        lot_id=lot_id,
                        warehouse_id=warehouse.id,  # IDを使用
                        movement_type=StockMovementReason.RECEIPT,
                        quantity=line_data.quantity,
                        related_id=receipt_data.receipt_no,
                    )
                    db.add(db_movement)

                    # 現在在庫更新
                    current_stock = (
                        db.query(LotCurrentStock)
                        .filter_by(lot_id=lot_id)
                        .first()
                    )
                    if current_stock:
                        current_stock.current_quantity += line_data.quantity

                if not line_created:
                    warn(
                        f"入荷伝票 {receipt_data.receipt_no}: 有効な明細が存在しないため登録を取り消しました"
                    )
                    db.delete(db_receipt)
                    db.flush()
                    continue

                counts["receipts"] += 1

            db.commit()

        # ==== 4. 受注登録 ====
        if data.orders:
            for order_data in data.orders:
                existing_order = (
                    db.query(Order).filter_by(order_no=order_data.order_no).first()
                )

                if existing_order:
                    continue

                order_date_raw = getattr(order_data, "order_date", None)
                order_date_obj = (
                    _parse_iso_date(
                        order_date_raw,
                        f"order {order_data.order_no}",
                        "order_date",
                    )
                    if order_date_raw
                    else date.today()
                )
                order_date_obj = order_date_obj or date.today()

                db_order = Order(
                    order_no=order_data.order_no,
                    customer_code=order_data.customer_code,
                    order_date=order_date_obj,
                    status="open",
                )
                db.add(db_order)
                db.flush()

                if not order_data.lines:
                    warn(
                        f"受注 {order_data.order_no}: 明細が存在しないためスキップしました"
                    )
                    db.delete(db_order)
                    db.flush()
                    continue

                line_created = False
                for line_data in order_data.lines:
                    if line_data.quantity is None or line_data.quantity <= 0:
                        warn(
                            f"受注 {order_data.order_no} 明細 {line_data.line_no}: 数量が正の数値ではないためスキップしました"
                        )
                        continue

                    product = (
                        db.query(Product)
                        .filter_by(product_code=line_data.product_code)
                        .first()
                    )
                    if not product:
                        warn(
                            f"受注 {order_data.order_no} 明細 {line_data.line_no}: 製品コード '{line_data.product_code}' が存在しないためスキップしました"
                        )
                        continue

                    due_date_obj = (
                        _parse_iso_date(
                            line_data.due_date,
                            f"order {order_data.order_no} line {line_data.line_no}",
                            "due_date",
                        )
                        if hasattr(line_data, "due_date")
                        else None
                    )

                    db_line = OrderLine(
                        order_id=db_order.id,
                        line_no=line_data.line_no,
                        product_code=line_data.product_code,
                        quantity=line_data.quantity,
                        unit=line_data.unit,
                        due_date=due_date_obj,
                    )
                    db.add(db_line)
                    line_created = True

                if not line_created:
                    warn(
                        f"受注 {order_data.order_no}: 有効な明細が存在しないため登録を取り消しました"
                    )
                    db.delete(db_order)
                    db.flush()
                    continue

                counts["orders"] += 1

            db.commit()

        response_payload = {"counts": counts}
        if validation_warnings:
            response_payload["warnings"] = validation_warnings

        return ResponseBase(
            success=True,
            message="サンプルデータを正常に投入しました",
            data=response_payload,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"サンプルデータ投入中にエラーが発生しました: {e}\n{traceback.format_exc()}",
        )


def _parse_iso_date(value, context: str, field: str) -> Optional[date]:
    """
    入力値をdateに変換し、失敗した場合は警告を記録する
    """
    if value is None:
        return None

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        raw = value.strip()
        if not raw or raw in {"-", "--"}:
            return None
        try:
            return date.fromisoformat(raw)
        except ValueError:
            logger.warning(
                f"[{context}] {field} が日付形式 (YYYY-MM-DD) ではありません: '{value}'"
            )
            return None

    logger.warning(
        f"[{context}] {field} を日付に変換できませんでした (値種別: {type(value).__name__})"
    )
    return None


def _ensure_suppliers(db: Session, supplier_codes: set[str], warn_cb) -> None:
    if not supplier_codes:
        return

    existing = (
        db.query(Supplier)
        .filter(Supplier.supplier_code.in_(supplier_codes))
        .all()
    )
    existing_codes = {s.supplier_code for s in existing}

    for code in sorted(supplier_codes - existing_codes):
        supplier = Supplier(
            supplier_code=code,
            supplier_name=f"サプライヤー_{code}（自動作成）",
        )
        db.add(supplier)
        warn_cb(f"サプライヤーマスタ '{code}' が存在しないため自動作成しました")

    if supplier_codes - existing_codes:
        db.commit()


def _ensure_customers(db: Session, customer_codes: set[str], warn_cb) -> None:
    if not customer_codes:
        return

    existing = (
        db.query(Customer)
        .filter(Customer.customer_code.in_(customer_codes))
        .all()
    )
    existing_codes = {c.customer_code for c in existing}

    for code in sorted(customer_codes - existing_codes):
        customer = Customer(
            customer_code=code,
            customer_name=f"顧客_{code}（自動作成）",
        )
        db.add(customer)
        warn_cb(f"顧客マスタ '{code}' が存在しないため自動作成しました")

    if customer_codes - existing_codes:
        db.commit()


def _ensure_warehouses(db: Session, warehouse_codes: set[str], warn_cb) -> None:
    if not warehouse_codes:
        return

    existing = (
        db.query(Warehouse)
        .filter(Warehouse.warehouse_code.in_(warehouse_codes))
        .all()
    )
    existing_codes = {w.warehouse_code for w in existing}

    for code in sorted(warehouse_codes - existing_codes):
        warehouse = Warehouse(
            warehouse_code=code,
            warehouse_name=f"倉庫_{code}（自動作成）",
            is_active=1,
        )
        db.add(warehouse)
        warn_cb(f"倉庫マスタ '{code}' が存在しないため自動作成しました")

    if warehouse_codes - existing_codes:
        db.commit()


def _ensure_warehouse(db: Session, warehouse_code: str, warn_cb) -> Optional[Warehouse]:
    if not warehouse_code:
        warn_cb("倉庫コードが指定されていません")
        return None

    warehouse = (
        db.query(Warehouse).filter_by(warehouse_code=warehouse_code).first()
    )
    if warehouse:
        return warehouse

    warehouse = Warehouse(
        warehouse_code=warehouse_code,
        warehouse_name=f"倉庫_{warehouse_code}（自動作成）",
        is_active=1,
    )
    db.add(warehouse)
    db.flush()
    warn_cb(f"倉庫マスタ '{warehouse_code}' が存在しないため自動作成しました")
    return warehouse


def _collect_supplier_codes(data: FullSampleDataRequest) -> set[str]:
    codes: set[str] = set()
    if data.lots:
        codes.update(lot.supplier_code for lot in data.lots if lot.supplier_code)
    if data.receipts:
        codes.update(
            receipt.supplier_code
            for receipt in data.receipts
            if receipt.supplier_code
        )
    return codes


def _collect_warehouse_codes(data: FullSampleDataRequest) -> set[str]:
    codes: set[str] = set()
    if data.lots:
        codes.update(
            lot.warehouse_code for lot in data.lots if getattr(lot, "warehouse_code", None)
        )
    if data.receipts:
        codes.update(
            receipt.warehouse_code
            for receipt in data.receipts
            if getattr(receipt, "warehouse_code", None)
        )
    return codes


def _collect_customer_codes(data: FullSampleDataRequest) -> set[str]:
    codes: set[str] = set()
    if data.orders:
        codes.update(
            order.customer_code for order in data.orders if order.customer_code
        )
    return codes
