"""管理機能のAPIエンドポイント - サンプルデータ投入修正版（パッチ適用済）."""

import logging
import traceback
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.database import truncate_all_tables
from app.models import (
    Allocation,
    Customer,
    Lot,
    Order,
    OrderLine,
    Supplier,
    Warehouse,  # 統合された新Warehouse
)
from app.schemas import (
    CandidateLotsResponse,
    DashboardStatsResponse,
    FullSampleDataRequest,
    ResponseBase,
)
from app.schemas.admin_seeds_schema import SeedRequest, SeedResponse
from app.services.seeds_service import create_seed_data


router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    ダッシュボード用の統計情報を返す.

    在庫総数は lots.current_quantity の合計値を使用。
    lot_current_stock ビューは使用しない（v2.2 以降は廃止）。
    """
    try:
        # lots テーブルから直接在庫を集計
        total_stock_result = db.execute(select(func.coalesce(func.sum(Lot.current_quantity), 0.0)))
        total_stock = total_stock_result.scalar_one()
    except SQLAlchemyError as e:
        logger.warning("在庫集計に失敗したため 0 扱いにします: %s", e)
        db.rollback()
        total_stock = 0.0

    total_orders = db.query(func.count(Order.id)).scalar() or 0

    unallocated_subquery = (
        db.query(OrderLine.order_id)
        .outerjoin(Allocation, Allocation.order_line_id == OrderLine.id)
        .group_by(OrderLine.id, OrderLine.order_id, OrderLine.order_quantity)
        .having(
            func.coalesce(func.sum(Allocation.allocated_quantity), 0)
            < func.coalesce(OrderLine.order_quantity, 0)
        )
        .subquery()
    )

    unallocated_orders = (
        db.query(func.count(func.distinct(unallocated_subquery.c.order_id))).scalar() or 0
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
    - テーブル構造は保持したまま、全データを削除
    - alembic_versionは保持（マイグレーション履歴を維持）
    - TRUNCATE ... RESTART IDENTITY CASCADEで高速にデータをクリア.
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403, detail="本番環境ではデータベースのリセットはできません"
        )

    try:
        # データのみを削除（テーブル構造は保持）
        truncate_all_tables()

        # セッションをリフレッシュ
        db.commit()

        return ResponseBase(
            success=True,
            message="データベースをリセットしました（テーブル構造は保持）",
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"DBリセット失敗: {e}\n{traceback.format_exc()}"
        )


# DEPRECATED: This endpoint has been replaced by /api/admin/simulate-seed-data
# Use the new simulation API with YAML profile support instead


@router.post("/seeds", response_model=SeedResponse)
def create_seeds(
    req: SeedRequest,
    db: Session = Depends(get_db),
) -> SeedResponse:
    """
    シードデータ生成（UPSERT方式）.

    - 既存データに追加する形でサンプルデータを投入
    - UPSERT（ON CONFLICT DO NOTHING）で重複を防止
    - dry_run=true で投入前のサマリのみ確認可能
    """
    return create_seed_data(db, req)


def _parse_iso_date(value, context: str, field: str) -> date | None:
    """入力値をdateに変換し、失敗した場合は警告を記録する."""
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
            logger.warning(f"[{context}] {field} が日付形式 (YYYY-MM-DD) ではありません: '{value}'")
            return None

    logger.warning(
        f"[{context}] {field} を日付に変換できませんでした (値種別: {type(value).__name__})"
    )
    return None


def _ensure_suppliers(db: Session, supplier_codes: set[str], warn_cb) -> None:
    if not supplier_codes:
        return

    existing = db.query(Supplier).filter(Supplier.supplier_code.in_(supplier_codes)).all()
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

    existing = db.query(Customer).filter(Customer.customer_code.in_(customer_codes)).all()
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

    existing = db.query(Warehouse).filter(Warehouse.warehouse_code.in_(warehouse_codes)).all()
    existing_codes = {w.warehouse_code for w in existing}

    for code in sorted(warehouse_codes - existing_codes):
        warehouse = Warehouse(
            warehouse_code=code,
            warehouse_name=f"倉庫_{code}（自動作成）",
            warehouse_type="internal",
        )
        db.add(warehouse)
        warn_cb(f"倉庫マスタ '{code}' が存在しないため自動作成しました")

    if warehouse_codes - existing_codes:
        db.commit()


def _ensure_warehouse(db: Session, warehouse_code: str, warn_cb) -> Warehouse | None:
    if not warehouse_code:
        warn_cb("倉庫コードが指定されていません")
        return None

    warehouse = db.query(Warehouse).filter_by(warehouse_code=warehouse_code).first()
    if warehouse:
        return warehouse

    warehouse = Warehouse(
        warehouse_code=warehouse_code,
        warehouse_name=f"倉庫_{warehouse_code}（自動作成）",
        warehouse_type="internal",
    )
    db.add(warehouse)
    db.flush()
    warn_cb(f"倉庫マスタ '{warehouse_code}' が存在しないため自動作成しました")
    return warehouse


def _collect_supplier_codes(data: FullSampleDataRequest) -> set[str]:
    codes: set[str] = set()
    if data.lots:
        codes.update(lot.supplier_code for lot in data.lots if lot.supplier_code)
    return codes


def _collect_warehouse_codes(data: FullSampleDataRequest) -> set[str]:
    codes: set[str] = set()
    if data.lots:
        codes.update(
            lot.warehouse_code for lot in data.lots if getattr(lot, "warehouse_code", None)
        )
    return codes


def _collect_customer_codes(data: FullSampleDataRequest) -> set[str]:
    codes: set[str] = set()
    if data.orders:
        codes.update(order.customer_code for order in data.orders if order.customer_code)
    return codes


@router.get("/diagnostics/allocatable-lots", response_model=CandidateLotsResponse)
def get_allocatable_lots(
    prod: str | None = None,
    wh: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    診断API: 引当可能ロット一覧（読み取り専用）.

    v2.2: v_lot_details ビューを使用して在庫情報を取得。
    lot_current_stock ビューは廃止。

    Args:
        prod: 製品コード（任意フィルタ）
        wh: 倉庫コード（任意フィルタ）
        limit: 最大取得件数（デフォルト100）
        db: データベースセッション

    Returns:
        CandidateLotsResponse: 引当可能ロット一覧

    Note:
        - 読み取り専用トランザクション
        - available_quantity > 0 のみ
        - 期限切れは除外
    """
    # 読み取り専用トランザクション設定
    db.execute(text("SET LOCAL transaction_read_only = on"))

    # クエリタイムアウト設定（10秒）
    db.execute(text("SET LOCAL statement_timeout = '10s'"))

    try:
        # メインクエリ: v_lot_details ビューを使用
        query = text(
            """
            SELECT
                vld.lot_id,
                vld.lot_number,
                vld.product_id,
                p.maker_part_code AS product_code,
                vld.warehouse_id,
                vld.warehouse_code,
                vld.current_quantity,
                vld.allocated_quantity,
                vld.available_quantity AS free_qty,
                vld.expiry_date,
                false as is_locked,
                vld.updated_at as last_updated
            FROM
                v_lot_details vld
                INNER JOIN products p ON p.id = vld.product_id
            WHERE
                vld.available_quantity > 0
                AND vld.status = 'active'
                AND (vld.expiry_date IS NULL OR vld.expiry_date >= CURRENT_DATE)
                AND (:prod IS NULL OR p.maker_part_code = :prod)
                AND (:wh IS NULL OR vld.warehouse_code = :wh)
            ORDER BY
                vld.expiry_date NULLS LAST,
                vld.lot_id
            LIMIT :limit
            """
        )

        result = db.execute(query, {"prod": prod, "wh": wh, "limit": limit})
        rows = result.fetchall()

        items = [
            {
                "lot_id": row.lot_id,
                "lot_number": row.lot_number,
                "product_id": row.product_id,
                "product_code": row.product_code,
                "warehouse_id": row.warehouse_id,
                "warehouse_code": row.warehouse_code,
                "free_qty": float(row.free_qty),
                "current_quantity": float(row.current_quantity),
                "allocated_qty": float(row.allocated_quantity),
                "expiry_date": row.expiry_date,
                "is_locked": row.is_locked or False,
                "last_updated": row.last_updated.isoformat() if row.last_updated else None,
            }
            for row in rows
        ]

        return CandidateLotsResponse(items=items, total=len(items))

    except Exception as e:
        logger.error(f"診断API実行エラー: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"診断API実行エラー: {str(e)}")
