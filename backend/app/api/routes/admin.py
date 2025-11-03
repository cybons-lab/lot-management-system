# backend/app/api/routes/admin.py
"""
管理機能のAPIエンドポイント
ヘルスチェック、データベースリセット等
"""

import logging
import traceback
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.database import drop_db, init_db
from app.models import (
    Lot,
    LotCurrentStock,
    Order,
    OrderLine,
    Product,
    ReceiptHeader,
    ReceiptLine,
    StockMovement,
)

# 🔽 [追加] 新しい Warehouse モデルもインポート
from app.schemas import (
    DashboardStatsResponse,
    FullSampleDataRequest,
    ResponseBase,
)
from app.schemas.integration import OcrOrderRecord

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    ヘルスチェック
    """
    try:
        # DB接続確認
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "database": db_status,
    }


@router.post("/reset-database", response_model=ResponseBase)
def reset_database(db: Session = Depends(get_db)):
    """
    データベースリセット
    (開発環境のみ)
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403, detail="本番環境ではデータベースのリセットはできません"
        )

    try:
        drop_db()
        init_db()

        # AdminPage.tsx の load_full_sample_data がマスタも投入するが、
        # ここでも最低限のマスタを投入しておく（init-sample-dataの簡易版）

        # 🔽 [修正] 既存のマスタデータ
        sample_masters_old = """
        INSERT OR IGNORE INTO warehouses (warehouse_code, warehouse_name, is_active) VALUES
        ('WH001', '第一倉庫', 1), ('WH002', '第二倉庫', 1);
        INSERT OR IGNORE INTO suppliers (supplier_code, supplier_name) VALUES
        ('SUP001', 'サプライヤーA'), ('SUP002', 'サプライヤーB');
        INSERT OR IGNORE INTO customers (customer_code, customer_name) VALUES
        ('CUS001', '得意先A'), ('CUS002', '得意先B');
        """
        for statement in sample_masters_old.split(";"):
            if statement.strip():
                db.execute(text(statement))

        # 🔽 [ここから追加]
        # 新しい 'warehouse' テーブル (IDが主キー) にもデータを投入
        sample_masters_new = """
        INSERT OR IGNORE INTO warehouse (warehouse_code, warehouse_name) VALUES
        ('WH001', '第一倉庫 (新)'), 
        ('WH002', '第二倉庫 (新)'),
        ('WH003', '予備倉庫 (新)');
        """
        for statement in sample_masters_new.split(";"):
            if statement.strip():
                db.execute(text(statement))
        # 🔼 [追加ここまで]

        db.commit()

        return ResponseBase(success=True, message="データベースをリセットしました")

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"DBリセット失敗: {e}\n{traceback.format_exc()}"
        )


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    ダッシュボード用の統計情報を取得
    """
    try:
        # 1. 総在庫数 (LotCurrentStock の合計)
        total_stock_result = db.query(
            func.sum(LotCurrentStock.current_quantity)
        ).scalar()

        # 2. 総受注数 (Order の総数)
        total_orders = db.query(Order).count()

        # 3. 未引当受注数 (Order の 'open' ステータス)
        unallocated_orders = db.query(Order).filter(Order.status == "open").count()

        return DashboardStatsResponse(
            total_stock=total_stock_result or 0.0,
            total_orders=total_orders or 0,
            unallocated_orders=unallocated_orders or 0,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"統計情報の取得中にエラーが発生しました: {str(e)}"
        )


@router.post("/load-full-sample-data", response_model=ResponseBase)
def load_full_sample_data(data: FullSampleDataRequest, db: Session = Depends(get_db)):
    """
    一括サンプルデータ投入

    マスタ -> ロット -> 入荷 -> 受注 の順でデータを投入する
    本番環境では無効化されます
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403, detail="本番環境ではサンプルデータの投入はできません"
        )

    # 既存のマスタデータを投入 (SETUP_GUIDE.md にあるもの)
    try:
        # 🔽 [修正] 既存のマスタデータ
        sample_masters_old = """
        INSERT OR IGNORE INTO warehouses (warehouse_code, warehouse_name, is_active) VALUES
        ('WH001', '第一倉庫', 1), ('WH002', '第二倉庫', 1);
        INSERT OR IGNORE INTO suppliers (supplier_code, supplier_name) VALUES
        ('SUP001', 'サプライヤーA'), ('SUP002', 'サプライヤーB');
        INSERT OR IGNORE INTO customers (customer_code, customer_name) VALUES
        ('CUS001', '得意先A'), ('CUS002', '得意先B');
        """
        for statement in sample_masters_old.split(";"):
            if statement.strip():
                db.execute(text(statement))

        # 🔽 [ここから追加]
        # 新しい 'warehouse' テーブル (IDが主キー) にもデータを投入
        sample_masters_new = """
        INSERT OR IGNORE INTO warehouse (warehouse_code, warehouse_name) VALUES
        ('WH001', '第一倉庫 (新)'), 
        ('WH002', '第二倉庫 (新)'),
        ('WH003', '予備倉庫 (新)');
        """
        for statement in sample_masters_new.split(";"):
            if statement.strip():
                db.execute(text(statement))
        # 🔼 [追加ここまで]

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"サンプルマスタ投入中にエラー: {e}\n{traceback.format_exc()}",
        )

    counts = {
        "products": 0,
        "lots": 0,
        "receipts": 0,
        "orders": 0,
    }

    validation_warnings: list[str] = []

    def _parse_iso_date(value, context: str, field: str) -> Optional[date]:
        """入力値をdateに変換し、失敗した場合は警告を記録する"""

        if value is None:
            validation_warnings.append(f"[{context}] {field} が未設定です")
            return None

        if isinstance(value, date):
            return value

        if isinstance(value, str):
            raw = value.strip()
            if not raw or raw in {"-", "--"}:
                validation_warnings.append(
                    f"[{context}] {field} が欠落しています (値: '{value}')"
                )
                return None
            try:
                return date.fromisoformat(raw)
            except ValueError:
                validation_warnings.append(
                    f"[{context}] {field} が日付形式 (YYYY-MM-DD) ではありません: '{value}'"
                )
                return None

        validation_warnings.append(
            f"[{context}] {field} を日付に変換できませんでした (値種別: {type(value).__name__})"
        )
        return None

    parsed_orders: list[tuple[OcrOrderRecord, date, list[dict]]] = []
    if data.orders:
        for o_idx, o_data in enumerate(data.orders):
            context = f"order[{o_idx}] {o_data.order_no}" if o_data.order_no else f"order[{o_idx}]"

            if not o_data.order_no:
                validation_warnings.append(f"[{context}] order_no は必須です")
            if not o_data.customer_code:
                validation_warnings.append(f"[{context}] customer_code は必須です")

            order_date_obj = _parse_iso_date(o_data.order_date, context, "order_date")
            if order_date_obj is None:
                order_date_obj = date.today()
                validation_warnings.append(
                    f"[{context}] order_date を {order_date_obj.isoformat()} で補完しました"
                )

            parsed_lines: list[dict] = []
            for line_idx, line in enumerate(o_data.lines or []):
                line_ctx = f"{context} line[{line_idx}]"

                if not getattr(line, "product_code", None):
                    validation_warnings.append(
                        f"[{line_ctx}] product_code は必須です"
                    )

                quantity = getattr(line, "quantity", None)
                if quantity is None or quantity <= 0:
                    validation_warnings.append(
                        f"[{line_ctx}] quantity が未設定または0以下です (値: {quantity})"
                    )

                unit = getattr(line, "unit", None)
                if not unit:
                    unit = "EA"
                    validation_warnings.append(
                        f"[{line_ctx}] unit が未設定のため 'EA' を補完しました"
                    )

                due_date_obj = _parse_iso_date(line.due_date, line_ctx, "due_date")
                if due_date_obj is None:
                    due_date_obj = order_date_obj
                    validation_warnings.append(
                        f"[{line_ctx}] due_date を {due_date_obj.isoformat()} で補完しました"
                    )

                line_data = line.model_dump()
                line_data["due_date"] = due_date_obj
                line_data["unit"] = unit
                parsed_lines.append(line_data)

            if not parsed_lines:
                validation_warnings.append(f"[{context}] 有効な明細行がありません")
            else:
                parsed_orders.append((o_data, order_date_obj, parsed_lines))

    try:
        # 1. 製品 (Products)
        if data.products:
            for p_data in data.products:
                existing = (
                    db.query(Product)
                    .filter_by(product_code=p_data.product_code)
                    .first()
                )
                if not existing:
                    db_product = Product(**p_data.model_dump())
                    db.add(db_product)
                    counts["products"] += 1
            db.commit()

        # 2. ロット (Lots) - この時点では在庫0
        # (Pydanticスキーマが 'date' 型なので自動変換される)
        if data.lots:
            for l_data in data.lots:
                existing_lot = (
                    db.query(Lot)
                    .filter_by(
                        supplier_code=l_data.supplier_code,
                        product_code=l_data.product_code,
                        lot_number=l_data.lot_number,
                    )
                    .first()
                )
                if existing_lot:
                    continue

                db_lot = Lot(**l_data.model_dump())
                db.add(db_lot)
                db.flush()

                current_stock = LotCurrentStock(lot_id=db_lot.id, current_quantity=0.0)
                db.add(current_stock)
                counts["lots"] += 1
            db.commit()

        # 3. 入荷 (Receipts) - 在庫を増やす
        # (Pydanticスキーマが 'date' 型なので自動変換される)
        if data.receipts:
            for r_data in data.receipts:
                existing_receipt = (
                    db.query(ReceiptHeader)
                    .filter_by(receipt_no=r_data.receipt_no)
                    .first()
                )
                if existing_receipt:
                    continue

                db_header = ReceiptHeader(
                    receipt_no=r_data.receipt_no,
                    supplier_code=r_data.supplier_code,
                    warehouse_code=r_data.warehouse_code,
                    receipt_date=r_data.receipt_date,  # Pydanticが 'date' に変換済み
                )
                db.add(db_header)
                db.flush()

                for line in r_data.lines:
                    db_line = ReceiptLine(
                        header_id=db_header.id,
                        line_no=line.line_no,
                        product_code=line.product_code,
                        lot_id=line.lot_id,
                        quantity=line.quantity,
                        unit=line.unit,
                    )
                    db.add(db_line)

                    movement = StockMovement(
                        lot_id=line.lot_id,
                        movement_type="receipt",
                        quantity=line.quantity,
                        related_id=f"receipt_{db_header.id}_line_{line.line_no}",
                    )
                    db.add(movement)

                    stock = (
                        db.query(LotCurrentStock).filter_by(lot_id=line.lot_id).first()
                    )
                    if stock:
                        stock.current_quantity += line.quantity
                    else:
                        stock = LotCurrentStock(
                            lot_id=line.lot_id, current_quantity=line.quantity
                        )
                        db.add(stock)

                counts["receipts"] += 1
            db.commit()

        # 4. 受注 (Orders) - OCR取込のロジックを簡易的に再現
        if parsed_orders:
            for o_data, order_date_obj, parsed_lines in parsed_orders:
                existing_order = (
                    db.query(Order).filter_by(order_no=o_data.order_no).first()
                )
                if existing_order:
                    continue

                db_order = Order(
                    order_no=o_data.order_no,
                    customer_code=o_data.customer_code,
                    order_date=order_date_obj,
                    status="open",
                )

                db.add(db_order)
                db.flush()

                for line_data in parsed_lines:
                    db_line = OrderLine(order_id=db_order.id, **line_data)
                    db.add(db_line)

                counts["orders"] += 1
            db.commit()

        if validation_warnings:
            for msg in validation_warnings:
                logger.warning("[sample-data] %s", msg)

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
        # 開発中は詳細なエラーを返す
        raise HTTPException(
            status_code=500,
            detail=f"サンプルデータ投入中にエラーが発生しました: {e}\n{traceback.format_exc()}",
        )
