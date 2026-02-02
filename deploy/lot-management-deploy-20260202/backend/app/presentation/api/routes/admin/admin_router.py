"""管理機能のAPIエンドポイント - サンプルデータ投入修正版（パッチ適用済）."""

import logging
from datetime import date
from typing import cast

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.application.services.auth.user_service import UserService
from app.application.services.system_config_service import SystemConfigService
from app.core.config import settings
from app.core.database import engine, truncate_all_tables
from app.infrastructure.persistence.models import (
    Customer,
    Role,
    Supplier,
    Warehouse,
)
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import (
    get_current_admin,
    get_current_user_optional,
)
from app.presentation.schemas.admin.admin_schema import (
    FullSampleDataRequest,
)
from app.presentation.schemas.allocations.allocations_schema import CandidateLotsResponse
from app.presentation.schemas.common.base import ResponseBase
from app.presentation.schemas.system.users_schema import UserCreate


router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


@router.post("/reset-database", response_model=ResponseBase)
def reset_database():
    # No dependencies to avoid DB session lock conflicts during TRUNCATE
    # This endpoint is dev-only and doesn't need authentication
    """データベースリセット（開発環境のみ）.

    - テーブル構造は保持したまま、全データを削除
    - alembic_versionは保持（マイグレーション履歴を維持）
    - TRUNCATE ... RESTART IDENTITY CASCADEで高速にデータをクリア.

    Note:
        開発環境ではE2Eテストのブートストラップのため認証不要。
        本番環境では403エラーを返す。
    """
    logger.info("DBリセット開始", extra={"environment": settings.ENVIRONMENT})

    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403, detail="本番環境ではデータベースのリセットはできません"
        )

    try:
        # トランザクションロックを回避するため、リクエストスコープのDBセッションは使用しない
        # db.close() も不要（Dependsで作っていないため）

        # データのみを削除（テーブル構造は保持）
        # db=None を渡すことで、truncate_all_tables内で新しいエンジン接続を使用
        logger.info("truncate_all_tables 呼び出し開始")
        truncate_all_tables(db=None)
        logger.info("truncate_all_tables 完了")

        # 新しいセッションを作成して初期データを投入
        logger.info("初期データ投入開始")

        from app.core.database import SessionLocal

        new_db = SessionLocal()
        try:
            # 初期管理者ユーザーとロールを再作成
            logger.info("_seed_admin_user 呼び出し開始")
            _seed_admin_user(new_db)
            logger.info("_seed_admin_user 完了")

            # システム設定の初期化
            logger.info("_seed_system_config 呼び出し開始")
            _seed_system_config(new_db)
            logger.info("_seed_system_config 完了")

            new_db.commit()
            logger.info("初期データ投入完了（コミット済）")
        finally:
            new_db.close()

        logger.info("DBリセット成功")
        return ResponseBase(
            success=True,
            message="データベースをリセットしました（テーブル構造は保持・管理者ユーザー・システム設定を再作成済）",
        )

    except Exception as e:
        logger.exception("DBリセット失敗", extra={"error": str(e)[:500]})
        raise  # Let global handler format the response


# NOTE: Test data generation is handled by /api/admin/test-data/generate
# which uses the refactored test_data_generator service


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

    warehouse = cast(
        Warehouse | None, db.query(Warehouse).filter_by(warehouse_code=warehouse_code).first()
    )
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
        codes.update(lot.warehouse_code for lot in data.lots if lot.warehouse_code)
    return codes


def _collect_customer_codes(data: FullSampleDataRequest) -> set[str]:
    codes: set[str] = set()
    if data.orders:  # type: ignore[attr-defined]
        codes.update(order.customer_code for order in data.orders if order.customer_code)  # type: ignore[attr-defined]
    return codes


@router.get("/diagnostics/allocatable-lots", response_model=CandidateLotsResponse)
def get_allocatable_lots(
    prod: str | None = None,
    wh: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),  # Allow anonymous access
):
    """診断API: 引当可能ロット一覧（読み取り専用）.

    v2.2: v_lot_details ビューを使用して在庫情報を取得。
    lot_current_stock ビューは廃止。

    Args:
        prod: 製品コード（任意フィルタ）
        wh: 倉庫コード（任意フィルタ）
        limit: 最大取得件数（デフォルト100）
        db: データベースセッション
        current_user: 現在のログインユーザー

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
                vld.supplier_item_id,
                p.maker_part_no AS product_code,
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
                INNER JOIN products p ON p.id = vld.supplier_item_id
            WHERE
                vld.available_quantity > 0
                AND vld.status = 'active'
                AND (vld.expiry_date IS NULL OR vld.expiry_date >= CURRENT_DATE)
                AND (:prod IS NULL OR p.maker_part_no = :prod)
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
                "supplier_item_id": row.supplier_item_id,
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

        return CandidateLotsResponse(items=items, total=len(items))  # type: ignore[arg-type]

    except Exception as e:
        logger.exception(f"診断API実行エラー: {e}")
        db.rollback()
        raise  # Let global handler format the response


@router.get("/metrics")
def get_metrics(
    current_admin=Depends(get_current_admin),  # Only admin can view metrics
):
    """パフォーマンスメトリクスを取得.

    APIエンドポイントごとのリクエスト数、エラー率、レスポンスタイムなどを返す。
    """
    from app.middleware.metrics import MetricsCollector

    collector = MetricsCollector()
    return collector.get_summary()


@router.post("/metrics/reset")
def reset_metrics(
    current_admin=Depends(get_current_admin),  # Only admin can reset metrics
):
    """パフォーマンスメトリクスをリセット.

    開発環境でのテスト用。
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403,
            detail="メトリクスのリセットは本番環境では実行できません",
        )

    from app.middleware.metrics import MetricsCollector

    collector = MetricsCollector()
    collector.reset_metrics()

    return {"message": "メトリクスをリセットしました"}


def _seed_admin_user(db: Session) -> None:
    """初期管理者ユーザーと必要なロールを作成する."""
    # 1. ロールの作成（存在しない場合）
    roles = {
        "admin": "Administrator",
        "user": "General User",
        "viewer": "Read-only Viewer",
    }

    for code, name in roles.items():
        role = db.query(Role).filter(Role.role_code == code).first()
        if not role:
            role = Role(role_code=code, role_name=name)
            db.add(role)
            logger.info(f"ロール '{code}' を作成しました")

    db.commit()

    # 2. 管理者ユーザーの作成
    # 2. 管理者ユーザーの作成
    user_service = UserService(db)
    admin_user = user_service.get_by_username("admin")

    if not admin_user:
        try:
            admin_user = user_service.create(
                UserCreate(
                    username="admin",
                    email="admin@example.com",
                    password="admin123",  # UserServiceがハッシュ化
                    display_name="System Admin",
                    is_active=True,
                )
            )
            logger.info("管理者ユーザー 'admin' を作成しました")
        except Exception as e:
            logger.error(f"管理者ユーザー作成失敗: {e}")
            # エラーでも続行（一般ユーザー作成のため）

    # 3. ロールの割り当て（admin_userが存在する場合のみ）
    if admin_user:
        current_roles = user_service.get_user_roles(admin_user.id)
        if "admin" not in current_roles:
            # adminロールを取得
            admin_role = db.query(Role).filter(Role.role_code == "admin").first()
            if admin_role:
                from app.presentation.schemas.system.users_schema import UserRoleAssignment

                user_service.assign_roles(
                    admin_user.id, UserRoleAssignment(role_ids=[admin_role.id])
                )
                logger.info("ユーザー 'admin' に 'admin' ロールを割り当てました")

    # 4. 一般ユーザーの作成（テスト用）
    # 明示的にトランザクションを区切るか検討したが、呼び出し元でコミットするため不要
    general_user = user_service.get_by_username("user")
    if not general_user:
        try:
            general_user = user_service.create(
                UserCreate(
                    username="user",
                    email="user@example.com",
                    password="user12345",  # UserServiceがハッシュ化
                    display_name="General User",
                    is_active=True,
                )
            )
            logger.info("一般ユーザー 'user' を作成しました")
        except Exception as e:
            logger.error(f"一般ユーザー作成失敗: {e}")
            # 一般ユーザー作成失敗は致命的ではないため続行

    # 5. 一般ユーザーロールの割り当て
    if general_user:
        current_user_roles = user_service.get_user_roles(general_user.id)
        if "user" not in current_user_roles:
            user_role = db.query(Role).filter(Role.role_code == "user").first()
            if user_role:
                from app.presentation.schemas.system.users_schema import UserRoleAssignment

                user_service.assign_roles(
                    general_user.id, UserRoleAssignment(role_ids=[user_role.id])
                )
                logger.info("ユーザー 'user' に 'user' ロールを割り当てました")


def _seed_system_config(db: Session) -> None:
    """システム設定の初期値を作成する."""
    config_service = SystemConfigService(db)

    # デフォルトのシステム設定
    default_configs = {
        "maintenance_mode": ("false", "メンテナンスモード（true/false）"),
        "log_level": ("INFO", "ログレベル（DEBUG/INFO/WARNING/ERROR）"),
        "enable_db_browser": ("false", "DBブラウザ機能を有効化（true/false）"),
        "page_visibility": (
            "{}",
            "ページ表示設定（JSON形式）",
        ),
        "cloud_flow_url_material_delivery": (
            "",
            "Cloud Flow URL - Material Delivery",
        ),
        "cloud_flow_url_progress_download": (
            "",
            "Cloud Flow URL - Progress Download",
        ),
    }

    for key, (value, description) in default_configs.items():
        config_service.set(key=key, value=value, description=description)
        logger.info(f"システム設定 '{key}' を初期化しました")

    db.commit()


@router.get("/diagnostics/view-check")
def check_view_definition(
    view_name: str = "v_lot_receipt_stock",
    current_admin=Depends(get_current_admin),
):
    """ビュー定義を診断（Admin専用）.

    v_lot_receipt_stock ビューに supplier_item_id 列が存在するかチェック。
    Phase1 マイグレーション後の問題診断用。

    Returns:
        {
            "view_name": "v_lot_receipt_stock",
            "has_supplier_item_id": true,
            "columns": ["lot_id", "supplier_item_id", ...],
            "message": "OK" or "NG: supplier_item_id not found"
        }
    """
    try:
        with engine.connect() as conn:
            # 列情報を取得
            result = conn.execute(
                text(
                    """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = :view_name
                ORDER BY ordinal_position
                """
                ),
                {"view_name": view_name},
            )
            columns = [row[0] for row in result.fetchall()]

            has_supplier_item_id = "supplier_item_id" in columns

            if has_supplier_item_id:
                message = "OK: supplier_item_id column exists"
            else:
                message = "NG: supplier_item_id column NOT FOUND"

            return {
                "view_name": view_name,
                "has_supplier_item_id": has_supplier_item_id,
                "column_count": len(columns),
                "columns": columns,
                "message": message,
            }

    except Exception as e:
        logger.exception(f"ビュー診断エラー: {e}")
        raise HTTPException(status_code=500, detail=f"ビュー診断に失敗しました: {str(e)}")


@router.post("/diagnostics/view-fix")
def fix_view_definition(
    view_name: str = "v_lot_receipt_stock",
    current_admin=Depends(get_current_admin),
):
    """ビュー定義を修正（Admin専用）.

    v_lot_receipt_stock ビューを正しい定義で再作成。
    Phase1 マイグレーション後にビューが古い状態になっている問題を修正。

    本番環境でも実行可能（ビューの再作成はデータ削除を伴わない）。

    Returns:
        {
            "success": true,
            "message": "View recreated successfully",
            "columns_before": [...],
            "columns_after": [...]
        }
    """
    if view_name != "v_lot_receipt_stock":
        raise HTTPException(
            status_code=400,
            detail="現在は v_lot_receipt_stock のみサポートしています",
        )

    try:
        with engine.begin() as conn:
            # 修正前の列情報を取得
            result = conn.execute(
                text(
                    """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = :view_name
                ORDER BY ordinal_position
                """
                ),
                {"view_name": view_name},
            )
            columns_before = [row[0] for row in result.fetchall()]

            # ビューを再作成
            conn.execute(text("DROP VIEW IF EXISTS v_lot_receipt_stock CASCADE"))

            create_view_sql = """
CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS lot_id,
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    COALESCE(lr.supplier_item_id, lr.supplier_item_id) AS supplier_item_id,
    COALESCE(lr.supplier_item_id, lr.supplier_item_id) AS supplier_item_id,
    si.maker_part_no AS product_code,
    si.maker_part_no,
    si.maker_part_no AS maker_part_code,
    si.display_name AS product_name,
    si.display_name,
    lr.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
    lm.supplier_id,
    s.supplier_code,
    s.supplier_name,
    COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.unit,
    lr.status,
    lr.received_quantity,
    lr.consumed_quantity,
    (lr.received_quantity - lr.consumed_quantity) AS current_quantity,
    GREATEST((lr.received_quantity - lr.consumed_quantity - lr.locked_quantity), 0) AS remaining_quantity,
    COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
    COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
    GREATEST((lr.received_quantity - lr.consumed_quantity - lr.locked_quantity - COALESCE(la.allocated_quantity, 0)), 0) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.inspection_date,
    lr.inspection_cert_number,
    lr.shipping_date,
    lr.cost_price,
    lr.sales_price,
    lr.tax_rate,
    lr.temporary_lot_key,
    lr.origin_type,
    lr.origin_reference,
    lr.receipt_key,
    lr.created_at,
    lr.updated_at,
    CASE
        WHEN lr.expiry_date IS NOT NULL THEN (lr.expiry_date - CURRENT_DATE)
        ELSE NULL
    END AS days_to_expiry
FROM
    lot_receipts lr
    JOIN lot_master lm ON lr.lot_master_id = lm.id
    LEFT JOIN supplier_items si ON COALESCE(lr.supplier_item_id, lr.supplier_item_id) = si.id
    LEFT JOIN warehouses w ON lr.warehouse_id = w.id
    LEFT JOIN suppliers s ON lm.supplier_id = s.id
    LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
    LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
WHERE
    lr.status = 'active'
            """
            conn.execute(text(create_view_sql))

            # 修正後の列情報を取得
            result = conn.execute(
                text(
                    """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = :view_name
                ORDER BY ordinal_position
                """
                ),
                {"view_name": view_name},
            )
            columns_after = [row[0] for row in result.fetchall()]

            has_supplier_item_id = "supplier_item_id" in columns_after

            logger.info(
                f"ビュー '{view_name}' を再作成しました",
                extra={
                    "columns_before_count": len(columns_before),
                    "columns_after_count": len(columns_after),
                    "has_supplier_item_id": has_supplier_item_id,
                },
            )

            return {
                "success": True,
                "message": "View recreated successfully",
                "view_name": view_name,
                "has_supplier_item_id": has_supplier_item_id,
                "columns_before": columns_before,
                "columns_after": columns_after,
            }

    except Exception as e:
        logger.exception(f"ビュー修正エラー: {e}")
        raise HTTPException(status_code=500, detail=f"ビュー修正に失敗しました: {str(e)}")


@router.get("/diagnostics/view-definition")
def get_view_definition(
    view_name: str = "v_lot_receipt_stock",
    current_admin=Depends(get_current_admin),
):
    """ビュー定義の完全な情報を取得（Admin専用）.

    ビューの定義SQL、列情報、関連テーブル情報を取得。
    開発環境と本番環境の差分確認に使用。

    Returns:
        {
            "view_name": "v_lot_receipt_stock",
            "definition": "SELECT ... FROM ...",
            "columns": [...],
            "related_tables": {...}
        }
    """
    try:
        with engine.connect() as conn:
            # ビュー定義を取得
            result = conn.execute(
                text("SELECT pg_get_viewdef(CAST(:view_name AS regclass), true)"),
                {"view_name": view_name},
            )
            view_definition = result.scalar()

            if not view_definition:
                raise HTTPException(status_code=404, detail=f"View '{view_name}' not found")

            # 列情報を取得
            result = conn.execute(
                text(
                    """
                SELECT
                    column_name,
                    data_type,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale
                FROM information_schema.columns
                WHERE table_name = :view_name
                ORDER BY ordinal_position
                """
                ),
                {"view_name": view_name},
            )
            columns = [
                {
                    "name": row[0],
                    "type": row[1],
                    "char_length": row[2],
                    "numeric_precision": row[3],
                    "numeric_scale": row[4],
                }
                for row in result.fetchall()
            ]

            # 関連テーブルの情報を取得
            related_tables = [
                "lot_receipts",
                "supplier_items",
                "lot_master",
                "warehouses",
                "suppliers",
            ]
            table_info = {}

            for table in related_tables:
                result = conn.execute(
                    text(
                        """
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_name = :table_name
                    )
                    """
                    ),
                    {"table_name": table},
                )
                exists = result.scalar()

                if exists:
                    # レコード数を取得
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()

                    # 列情報を取得
                    result = conn.execute(
                        text(
                            """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = :table_name
                        ORDER BY ordinal_position
                        """
                        ),
                        {"table_name": table},
                    )
                    table_columns = [row[0] for row in result.fetchall()]

                    table_info[table] = {
                        "exists": True,
                        "record_count": count,
                        "columns": table_columns,
                    }
                else:
                    table_info[table] = {"exists": False}

            return {
                "view_name": view_name,
                "definition": view_definition,
                "columns": columns,
                "related_tables": table_info,
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"ビュー定義取得エラー: {e}")
        raise HTTPException(status_code=500, detail=f"ビュー定義の取得に失敗しました: {str(e)}")
