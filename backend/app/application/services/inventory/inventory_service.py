"""Inventory service layer for inventory items (summary).

This service aggregates inventory data from the lots table in real-time,
providing product × warehouse summary information.

【設計意図】在庫サマリーサービスの設計判断:

1. なぜ v_inventory_summary ビューを使うのか（L83-112）
   理由: 在庫サマリー取得のパフォーマンス最適化 + SSOT整合
   業務的背景:
   - 自動車部品商社: 数万件のロットから製品×倉庫の在庫サマリーを表示
   - リアルタイム計算: SELECT SUM(current_quantity) GROUP BY ... は高負荷
   → v_inventory_summary ビューで事前集計（Materialized View相当）
   実装:
   - v_inventory_summary: v_lot_receipt_stock を基準に集計
   - total_quantity, allocated_quantity, available_quantity を計算済み
   - available = on_hand - locked - confirmed（予約/activeは減算しない）
   メリット:
   - 在庫一覧画面の表示速度向上（100倍以上の高速化）

2. なぜ supplier_id フィルタ時は別クエリを使うのか（L48-82）
   理由: v_inventory_summary に supplier_id カラムがない
   業務的背景:
   - 営業担当者: 自分の担当サプライヤーの在庫のみを表示したい
   - v_inventory_summary: 製品×倉庫でグループ化（サプライヤーは含まれない）
   → supplier_id フィルタ時は v_lot_receipt_stock を直接集計
   実装:
   - supplier_id 指定時: SELECT SUM() FROM v_lot_receipt_stock WHERE supplier_id = ?
   - 未指定時: SELECT FROM v_inventory_summary
   トレードオフ:
   - supplier_id フィルタ時は若干遅い（リアルタイム集計）
   → ただし、フィルタにより対象ロット数が減るため、実用上問題なし

3. なぜ2段階クエリ（サマリー + 引当内訳）を使うのか（L116-163）
   理由: ソフト/ハード引当の内訳を追加取得
   業務的背景:
   - v_inventory_summary: allocated_quantity（合計のみ）
   - 業務要件: ソフト引当とハード引当を区別して表示
   → 2段階クエリで引当内訳を追加取得
   実装:
   - クエリ1: v_inventory_summary で基本情報取得
   - クエリ2: lot_reservations で引当内訳取得（soft/hard別）
   メリット:
   - v_inventory_summary を変更せずに、引当内訳を追加取得
   → ビューの再作成が不要

4. なぜ O(1) ルックアップ用の辞書を作るのか（L164-174）
   理由: N×M の突合を高速化
   パフォーマンス:
   - N件の在庫サマリー × M件の引当内訳 → O(N×M) = 遅い
   - 辞書化: {(product_id, warehouse_id): {soft, hard}} → O(1) ルックアップ
   実装:
   - alloc_map: キー = (product_id, warehouse_id)、値 = {soft, hard}
   - ループ内で alloc_map.get(key) → O(1) で取得
   メリット:
   - 100件の在庫×100件の引当でも、200回のループで完了

5. なぜ CASE式で allocation_type を判定するのか（L137-153）
   理由: lot_reservations.status を soft/hard に変換
   業務ルール:
   - status = 'active': ソフト引当（仮引当、キャンセル可能）
   - status = 'confirmed': ハード引当（確定引当、キャンセル不可）
   → CASE式でソフト/ハード区分を計算
   実装:
   - CASE WHEN r.status = 'active' THEN 'soft' WHEN r.status = 'confirmed' THEN 'hard'
   → SQL側で集計時に区分
   メリット:
   - アプリケーション側で分類する必要がない（SQLで完結）

6. なぜ複数の集計メソッドがあるのか（L290-406）
   理由: 多様な業務視点での在庫分析
   メソッド:
   - get_inventory_by_supplier(): サプライヤー別在庫集計
   - get_inventory_by_warehouse(): 倉庫別在庫集計
   - get_inventory_by_product(): 製品別在庫集計（全倉庫合計）
   用途:
   - サプライヤー別: 「仕入先Aの在庫が多すぎる」を把握
   - 倉庫別: 「倉庫Bの在庫が少ない」を把握
   - 製品別: 「製品Xの在庫が全社で不足」を把握
   → 経営判断・発注計画に活用

7. なぜ COALESCE で NULL を 0 に変換するのか（L372-381）
   理由: 引当がない製品でも正しく集計
   問題:
   - 引当がない製品: SUM(r.reserved_qty) → NULL
   - NULL + 数値 = NULL → 計算結果が NULL になる
   解決:
   - COALESCE(..., 0): NULL を 0 に変換
   → allocated_quantity = 0、available_quantity = total_quantity - 0
   業務影響:
   - 引当がない新規入荷製品も、正しく在庫として表示

8. なぜ IN句でフィルタするのか（L146-147）
   理由: 最初のクエリで取得した製品×倉庫のみを対象
   パフォーマンス:
   - 全引当レコードを取得すると、膨大な行数（数十万件）
   → IN句でページング対象のみに絞る
   実装:
   - found_products: 最初のクエリで取得した製品IDリスト
   - WHERE l.product_id IN :product_ids AND l.warehouse_id IN :warehouse_ids
   メリット:
   - 100件の在庫サマリーに対して、100件分の引当のみ取得

9. なぜ text() で生SQLを使うのか（L50-117, L214-264）
   理由: SQLAlchemy ORM では表現困難なクエリ
   背景:
   - ビュー（v_inventory_summary）に対するJOIN
   - 複雑なGROUP BY + SUM集計
   → 生SQLの方が可読性が高く、パフォーマンスも良い
   実装:
   - text(query): SQLクエリ文字列を直接実行
   - params: プレースホルダーでSQLインジェクション対策
   トレードオフ:
   - ORM の型安全性は失われる → 結果をマッピングする際に注意

10. なぜ product × warehouse の組み合わせを集計するのか
    理由: 自動車部品商社の在庫管理要件
    業務的背景:
    - 同じ製品でも、倉庫ごとに在庫数が異なる
    - 例: 製品A（東京倉庫: 100個、大阪倉庫: 50個）
    → 製品×倉庫の組み合わせで在庫を管理
    用途:
    - 「東京倉庫の製品Aが不足」→ 大阪倉庫から転送
    - 「大阪倉庫の製品Bが過剰」→ 東京倉庫へ移動
    → 倉庫間の在庫バランス調整
"""

from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.assignments.assignment_models import (
    UserSupplierAssignment,
)
from app.infrastructure.persistence.models.masters_models import Product, Supplier, Warehouse
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.presentation.schemas.inventory.inventory_schema import (
    InventoryFilterOption,
    InventoryFilterOptions,
    InventoryItemResponse,
    InventoryListResponse,
    InventoryState,
)


class InventoryService:
    """Business logic for inventory items (aggregated summary from lots)."""

    def __init__(self, db: Session):
        """Initialize inventory service.

        Args:
            db: Database session
        """
        self.db = db

    def get_inventory_items(
        self,
        skip: int = 0,
        limit: int = 100,
        product_id: int | None = None,
        warehouse_id: int | None = None,
        supplier_id: int | None = None,
        tab: str = "all",
        primary_staff_only: bool = False,
        current_user_id: int | None = None,
        group_by: str = "product_warehouse",
    ) -> InventoryListResponse:
        """Get inventory items from v_lot_receipt_stock view with grouping.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            product_id: Filter by product ID
            warehouse_id: Filter by warehouse ID
            supplier_id: Filter by supplier ID (filters lots by supplier)
            tab: Tab filter - 'in_stock', 'no_stock', or 'all'
            primary_staff_only: Filter by primary staff (current user)
            current_user_id: Current user ID (required if primary_staff_only=True)
            group_by: Grouping mode - 'product_warehouse' (default) or 'supplier_product_warehouse'

        Returns:
            InventoryListResponse containing items and total count
        """
        from sqlalchemy import text

        total = 0

        # Always use v_lot_receipt_stock view which handles B-Plan logic
        # and includes supplier information needed for group_by modes

        # Base logic for WHERE clause
        where_clauses = ["v.remaining_quantity > 0", "v.status = 'active'"]
        params: dict[str, int | str] = {}

        if supplier_id is not None:
            where_clauses.append("v.supplier_id = :supplier_id")
            params["supplier_id"] = supplier_id

        if product_id is not None:
            where_clauses.append("v.product_id = :product_id")
            params["product_id"] = product_id

        if warehouse_id is not None:
            where_clauses.append("v.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id

        # JOIN for primary_staff_only filter
        join_assignment = ""
        if primary_staff_only and current_user_id:
            join_assignment = (
                " JOIN user_supplier_assignments usa ON v.supplier_id = usa.supplier_id"
            )
            where_clauses.append("usa.user_id = :current_user_id")
            where_clauses.append("usa.is_primary = TRUE")
            params["current_user_id"] = current_user_id

        where_str = " AND ".join(where_clauses)

        # HAVING clause for tab filter
        having_clause = ""
        if tab == "in_stock":
            having_clause = " HAVING SUM(v.available_quantity) > 0"
        elif tab == "no_stock":
            having_clause = " HAVING SUM(v.available_quantity) = 0"

        # Determine GROUP BY based on group_by parameter
        use_supplier_grouping = group_by == "supplier_product_warehouse"

        if use_supplier_grouping:
            # Supplier × Product × Warehouse grouping (supplier-centric view)
            group_by_cols = "v.supplier_id, v.product_id, v.warehouse_id"
            group_by_full = f"{group_by_cols}, v.product_name, v.product_code, v.warehouse_name, v.warehouse_code, v.supplier_name, v.supplier_code"
            select_supplier = ", v.supplier_id, v.supplier_name, v.supplier_code"
            order_by = "v.supplier_id, v.product_id, v.warehouse_id"
        else:
            # Product × Warehouse grouping (default, aggregates across suppliers)
            group_by_cols = "v.product_id, v.warehouse_id"
            group_by_full = f"{group_by_cols}, v.product_name, v.product_code, v.warehouse_name, v.warehouse_code"
            select_supplier = ""
            order_by = "v.product_id, v.warehouse_id"

        # --- Total Count Query ---
        count_query = f"""
            SELECT COUNT(*) FROM (
                SELECT 1 FROM v_lot_receipt_stock v
                {join_assignment}
                WHERE {where_str}
                GROUP BY {group_by_cols}
                {having_clause}
            ) as sub
        """
        total = self.db.execute(text(count_query), params).scalar() or 0

        # --- Data Query ---
        query = f"""
            SELECT 
                v.product_id, 
                v.warehouse_id, 
                SUM(v.remaining_quantity) as total_quantity,
                SUM(v.reserved_quantity) as allocated_quantity,
                SUM(v.available_quantity) as available_quantity,
                COUNT(v.receipt_id) as lot_count,
                MAX(v.updated_at) as last_updated,
                v.product_name,
                v.product_code,
                v.warehouse_name,
                v.warehouse_code
                {select_supplier}
            FROM v_lot_receipt_stock v
            {join_assignment}
            WHERE {where_str}
            GROUP BY {group_by_full}
            {having_clause}
            ORDER BY {order_by}
            LIMIT :limit OFFSET :skip
        """
        params["limit"] = limit
        params["skip"] = skip

        # 1. Base Summary Query
        result = self.db.execute(text(query), params).fetchall()

        responses = []
        if result:
            # 2. Detail Allocation Aggregation Query
            # Fetch detailed allocation breakdown for these products/warehouses
            # We need to filter exactly the items we found in the first page
            found_products = [r.product_id for r in result]
            found_warehouses = [r.warehouse_id for r in result]

            # P3: allocations table replaced by lot_reservations
            # soft = active, hard = confirmed
            alloc_query = """
                SELECT 
                    r.lot_id,
                    l.product_id,
                    l.warehouse_id,
                    CASE 
                        WHEN r.status = 'active' THEN 'soft'
                        WHEN r.status = 'confirmed' THEN 'hard'
                        ELSE 'soft'
                    END as allocation_type,
                    SUM(r.reserved_qty) as qty
                FROM lot_reservations r
                JOIN v_lot_receipt_stock l ON l.receipt_id = r.lot_id
                WHERE r.status IN ('active', 'confirmed')
                  AND l.product_id IN :product_ids
                  AND l.warehouse_id IN :warehouse_ids
                GROUP BY r.lot_id, l.product_id, l.warehouse_id, 
                    CASE 
                        WHEN r.status = 'active' THEN 'soft'
                        WHEN r.status = 'confirmed' THEN 'hard'
                        ELSE 'soft'
                    END
            """

            alloc_rows = self.db.execute(
                text(alloc_query),
                {
                    "product_ids": tuple(set(found_products)),
                    "warehouse_ids": tuple(set(found_warehouses)),
                },
            ).fetchall()

            # 2b. Lot Count Aggregation Query
            # IMPORTANT: This must match the /api/lots endpoint's default behavior
            # which is with_stock=True (current_quantity > 0)
            count_query_details = """
                SELECT
                    v.product_id,
                    v.warehouse_id,
                    COUNT(v.receipt_id) as lot_count
                FROM v_lot_receipt_stock v
                WHERE v.product_id IN :product_ids
                  AND v.warehouse_id IN :warehouse_ids
                  AND v.remaining_quantity > 0 AND v.status = 'active'
                GROUP BY v.product_id, v.warehouse_id
            """
            count_rows_details = self.db.execute(
                text(count_query_details),
                {
                    "product_ids": tuple(set(found_products)),
                    "warehouse_ids": tuple(set(found_warehouses)),
                },
            ).fetchall()

            # Map counts
            count_map = {}
            for row in count_rows_details:
                key = (row.product_id, row.warehouse_id)
                count_map[key] = row.lot_count
            alloc_map = {}
            for row in alloc_rows:
                key = (row.product_id, row.warehouse_id)
                if key not in alloc_map:
                    alloc_map[key] = {"soft": 0.0, "hard": 0.0}

                atype = row.allocation_type  # 'soft' or 'hard'
                if atype in alloc_map[key]:
                    alloc_map[key][atype] += float(row.qty)

            # 3. Construct Response
            for idx, row in enumerate(result):
                key = (row.product_id, row.warehouse_id)
                allocs = alloc_map.get(key, {"soft": 0.0, "hard": 0.0})
                # Use active_lot_count from view, fallback to count_map for supplier-filtered query
                active_lot_count = getattr(row, "active_lot_count", count_map.get(key, 0))

                # Compute inventory_state from available data if not in result
                if hasattr(row, "inventory_state") and row.inventory_state:
                    inventory_state = row.inventory_state
                else:
                    # Determine state based on available_quantity and lot_count
                    available_qty = float(row.available_quantity or 0)
                    lot_cnt = active_lot_count or 0
                    if lot_cnt == 0:
                        inventory_state = "no_lots"
                    elif available_qty > 0:
                        inventory_state = "in_stock"
                    else:
                        inventory_state = "depleted_only"

                responses.append(
                    InventoryItemResponse(
                        id=idx + 1,
                        product_id=row.product_id,
                        warehouse_id=row.warehouse_id,
                        total_quantity=row.total_quantity,
                        allocated_quantity=row.allocated_quantity,
                        available_quantity=row.available_quantity,
                        soft_allocated_quantity=Decimal(str(allocs["soft"])),
                        hard_allocated_quantity=Decimal(str(allocs["hard"])),
                        active_lot_count=active_lot_count,
                        inventory_state=InventoryState(inventory_state),
                        last_updated=row.last_updated,
                        product_name=row.product_name,
                        product_code=row.product_code,
                        warehouse_name=row.warehouse_name,
                        warehouse_code=row.warehouse_code,
                        # Supplier fields (present when group_by='supplier_product_warehouse')
                        supplier_id=getattr(row, "supplier_id", None),
                        supplier_name=getattr(row, "supplier_name", None),
                        supplier_code=getattr(row, "supplier_code", None),
                    )
                )

        return InventoryListResponse(
            items=responses, total=total, page=skip // limit + 1 if limit > 0 else 1, size=limit
        )

    def get_inventory_item_by_product_warehouse(
        self, product_id: int, warehouse_id: int
    ) -> InventoryItemResponse | None:
        """Get inventory item by product ID and warehouse ID with names.

        Args:
            product_id: Product ID
            warehouse_id: Warehouse ID

        Returns:
            Inventory item, or None if not found
        """
        query = """
            SELECT 
                v.product_id, 
                v.warehouse_id, 
                v.total_quantity, 
                v.allocated_quantity, 
                v.available_quantity, 
                v.last_updated,
                p.product_name,
                p.maker_part_code AS product_code,
                w.warehouse_name,
                w.warehouse_code
            FROM v_inventory_summary v
            LEFT JOIN products p ON v.product_id = p.id
            LEFT JOIN warehouses w ON v.warehouse_id = w.id
            WHERE v.product_id = :product_id AND v.warehouse_id = :warehouse_id
        """
        from sqlalchemy import text

        row = self.db.execute(
            text(query), {"product_id": product_id, "warehouse_id": warehouse_id}
        ).fetchone()

        if not row:
            return None

        # Get Allocation breakdown
        # P3: allocations table replaced by lot_reservations
        alloc_query = """
            SELECT 
                CASE 
                    WHEN r.status = 'active' THEN 'soft'
                    WHEN r.status = 'confirmed' THEN 'hard'
                    ELSE 'soft'
                END as allocation_type,
                SUM(r.reserved_qty) as qty
            FROM lot_reservations r
            JOIN v_lot_receipt_stock l ON l.receipt_id = r.lot_id
            WHERE r.status IN ('active', 'confirmed')
              AND l.product_id = :product_id
              AND l.warehouse_id = :warehouse_id
            GROUP BY 
                CASE 
                    WHEN r.status = 'active' THEN 'soft'
                    WHEN r.status = 'confirmed' THEN 'hard'
                    ELSE 'soft'
                END
        """
        alloc_rows = self.db.execute(
            text(alloc_query), {"product_id": product_id, "warehouse_id": warehouse_id}
        ).fetchall()

        soft_qty = 0.0
        hard_qty = 0.0
        for ar in alloc_rows:
            if ar.allocation_type == "soft":
                soft_qty += float(ar.qty)
            elif ar.allocation_type == "hard":
                hard_qty += float(ar.qty)

        # Get count (must match /api/lots default behavior: with_stock=True)
        count_query = """
            SELECT COUNT(receipt_id) as cnt FROM v_lot_receipt_stock 
            WHERE product_id = :pid AND warehouse_id = :wid 
            AND remaining_quantity > 0 AND status = 'active'
        """
        count_res = self.db.execute(
            text(count_query), {"pid": product_id, "wid": warehouse_id}
        ).scalar()

        return InventoryItemResponse(
            id=1,  # Dummy ID
            product_id=row.product_id,
            warehouse_id=row.warehouse_id,
            total_quantity=row.total_quantity,
            allocated_quantity=row.allocated_quantity,
            available_quantity=row.available_quantity,
            soft_allocated_quantity=Decimal(str(soft_qty)),
            hard_allocated_quantity=Decimal(str(hard_qty)),
            active_lot_count=count_res or 0,
            last_updated=row.last_updated,
            product_name=row.product_name,
            product_code=row.product_code,
            warehouse_name=row.warehouse_name,
            warehouse_code=row.warehouse_code,
        )

    def get_inventory_by_supplier(self) -> list[dict]:
        """Get inventory aggregated by supplier.

        Returns:
            List of dictionaries matching InventoryBySupplierResponse
        """
        query = """
            SELECT 
                l.supplier_id,
                l.supplier_name,
                l.supplier_code,
                SUM(l.remaining_quantity) as total_quantity,
                COUNT(l.receipt_id) as lot_count,
                COUNT(DISTINCT l.product_id) as product_count
            FROM v_lot_receipt_stock l
            WHERE l.remaining_quantity > 0 AND l.status = 'active' AND l.supplier_id IS NOT NULL
            GROUP BY l.supplier_id, l.supplier_name, l.supplier_code
            ORDER BY l.supplier_code
        """
        from sqlalchemy import text

        result = self.db.execute(text(query)).fetchall()
        return [
            {
                "supplier_id": row.supplier_id,
                "supplier_name": row.supplier_name,
                "supplier_code": row.supplier_code,
                "total_quantity": row.total_quantity,
                "lot_count": row.lot_count,
                "product_count": row.product_count,
            }
            for row in result
        ]

    def get_inventory_by_warehouse(self) -> list[dict]:
        """Get inventory aggregated by warehouse.

        Returns:
            List of dictionaries matching InventoryByWarehouseResponse
        """
        query = """
            SELECT 
                l.warehouse_id,
                l.warehouse_name,
                l.warehouse_code,
                SUM(l.remaining_quantity) as total_quantity,
                COUNT(l.receipt_id) as lot_count,
                COUNT(DISTINCT l.product_id) as product_count
            FROM v_lot_receipt_stock l
            WHERE l.remaining_quantity > 0 AND l.status = 'active'
            GROUP BY l.warehouse_id, l.warehouse_name, l.warehouse_code
            ORDER BY l.warehouse_code
        """
        from sqlalchemy import text

        result = self.db.execute(text(query)).fetchall()
        return [
            {
                "warehouse_id": row.warehouse_id,
                "warehouse_name": row.warehouse_name,
                "warehouse_code": row.warehouse_code,
                "total_quantity": row.total_quantity,
                "lot_count": row.lot_count,
                "product_count": row.product_count,
            }
            for row in result
        ]

    def get_inventory_by_product(self) -> list[dict]:
        """Get inventory aggregated by product (across all warehouses).

        Returns:
            List of dictionaries matching InventoryByProductResponse
        """
        query = """
            SELECT 
                l.product_id,
                l.product_name,
                l.product_code,
                SUM(l.remaining_quantity) as total_quantity,
                SUM(l.reserved_quantity) as allocated_quantity,
                SUM(l.available_quantity) as available_quantity,
                COUNT(l.receipt_id) as lot_count,
                COUNT(DISTINCT l.warehouse_id) as warehouse_count
            FROM v_lot_receipt_stock l
            WHERE l.remaining_quantity > 0 AND l.status = 'active'
            GROUP BY l.product_id, l.product_name, l.product_code
            ORDER BY l.product_code
        """
        from sqlalchemy import text

        result = self.db.execute(text(query)).fetchall()
        return [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "product_code": row.product_code,
                "total_quantity": row.total_quantity,
                "allocated_quantity": row.allocated_quantity,
                "available_quantity": row.available_quantity,
                "lot_count": row.lot_count,
                "warehouse_count": row.warehouse_count,
            }
            for row in result
        ]

    def get_filter_options(
        self,
        product_id: int | None = None,
        warehouse_id: int | None = None,
        supplier_id: int | None = None,
        tab: str = "all",
        primary_staff_only: bool = False,
        current_user_id: int | None = None,
        mode: str = "stock",
    ) -> InventoryFilterOptions:
        """Get filter options based on current selection (Mutual Filtering).

        Args:
            product_id: Currently selected product ID
            warehouse_id: Currently selected warehouse ID
            supplier_id: Currently selected supplier ID
            tab: Tab filter - 'in_stock', 'no_stock', or 'all'
            primary_staff_only: Filter by primary staff (current user)
            current_user_id: Current user ID (required if primary_staff_only=True)
            mode: Candidate source mode ("stock" or "master")

        Returns:
            FilterOptions containing compatible products, suppliers, and warehouses
        """
        if mode not in ("stock", "master"):
            raise ValueError("mode must be 'stock' or 'master'")

        if mode == "master":
            return self._get_filter_options_from_master(
                product_id=product_id,
                warehouse_id=warehouse_id,
                supplier_id=supplier_id,
                primary_staff_only=primary_staff_only,
                current_user_id=current_user_id,
                effective_tab=tab,
            )

        effective_tab = tab
        if tab == "no_stock":
            # Stock mode is defined by in-stock reality; coerce to in_stock for consistency.
            effective_tab = "in_stock"
            tab = "in_stock"

        return self._get_filter_options_from_stock(
            product_id=product_id,
            warehouse_id=warehouse_id,
            supplier_id=supplier_id,
            tab=tab,
            primary_staff_only=primary_staff_only,
            current_user_id=current_user_id,
            effective_tab=effective_tab,
        )

    def _get_filter_options_from_master(
        self,
        product_id: int | None = None,
        warehouse_id: int | None = None,
        supplier_id: int | None = None,
        primary_staff_only: bool = False,
        current_user_id: int | None = None,
        effective_tab: str = "all",
    ) -> InventoryFilterOptions:
        """Get filter options based on master relationships (legacy behavior)."""
        # 1. Products (filtered by supplier if selected)
        p_stmt = select(Product.id, Product.maker_part_code, Product.product_name).where(
            Product.valid_to >= "9999-12-31"
        )
        if supplier_id:
            # Filter products supplied by this supplier
            p_stmt = (
                p_stmt.join(SupplierItem, SupplierItem.product_id == Product.id)
                .where(SupplierItem.supplier_id == supplier_id)
                .where(SupplierItem.valid_to >= "9999-12-31")
            )

        p_rows = self.db.execute(p_stmt).all()
        products = [
            InventoryFilterOption(id=r.id, code=r.maker_part_code, name=r.product_name)
            for r in p_rows
        ]

        # 2. Suppliers (filtered by product if selected)
        s_stmt = select(Supplier.id, Supplier.supplier_code, Supplier.supplier_name).where(
            Supplier.valid_to >= "9999-12-31"
        )
        if primary_staff_only and current_user_id:
            s_stmt = (
                s_stmt.join(
                    UserSupplierAssignment,
                    UserSupplierAssignment.supplier_id == Supplier.id,
                )
                .where(UserSupplierAssignment.user_id == current_user_id)
                .where(UserSupplierAssignment.is_primary.is_(True))
            )
        if product_id:
            # Filter suppliers supplying this product
            s_stmt = (
                s_stmt.join(SupplierItem, SupplierItem.supplier_id == Supplier.id)
                .where(SupplierItem.product_id == product_id)
                .where(SupplierItem.valid_to >= "9999-12-31")
            )

        s_rows = self.db.execute(s_stmt).all()
        suppliers = [
            InventoryFilterOption(id=r.id, code=r.supplier_code, name=r.supplier_name)
            for r in s_rows
        ]

        # 3. Warehouses (Active only)
        w_stmt = select(Warehouse.id, Warehouse.warehouse_code, Warehouse.warehouse_name).where(
            Warehouse.valid_to >= "9999-12-31"
        )

        w_rows = self.db.execute(w_stmt).all()
        warehouses = [
            InventoryFilterOption(id=r.id, code=r.warehouse_code, name=r.warehouse_name)
            for r in w_rows
        ]

        return InventoryFilterOptions(
            products=products,
            suppliers=suppliers,
            warehouses=warehouses,
            effective_tab=effective_tab,
        )

    def _get_filter_options_from_stock(
        self,
        product_id: int | None = None,
        warehouse_id: int | None = None,
        supplier_id: int | None = None,
        tab: str = "all",
        primary_staff_only: bool = False,
        current_user_id: int | None = None,
        effective_tab: str = "all",
    ) -> InventoryFilterOptions:
        """Get filter options based on stock reality (active lots with remaining > 0)."""
        where_clauses = ["v.remaining_quantity > 0", "v.status = 'active'"]
        params: dict[str, int | str] = {}

        if product_id is not None:
            where_clauses.append("v.product_id = :product_id")
            params["product_id"] = product_id

        if warehouse_id is not None:
            where_clauses.append("v.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id

        if supplier_id is not None:
            where_clauses.append("v.supplier_id = :supplier_id")
            params["supplier_id"] = supplier_id

        join_assignment = ""
        if primary_staff_only and current_user_id:
            join_assignment = (
                "JOIN user_supplier_assignments usa ON v.supplier_id = usa.supplier_id"
            )
            where_clauses.append("usa.user_id = :current_user_id")
            where_clauses.append("usa.is_primary = TRUE")
            params["current_user_id"] = current_user_id

        where_str = " AND ".join(where_clauses)
        having_clause = ""
        if tab == "in_stock":
            having_clause = "HAVING SUM(v.available_quantity) > 0"
        elif tab == "no_stock":
            having_clause = "HAVING SUM(v.available_quantity) = 0"

        stock_base_cte = f"""
            WITH stock_base AS (
                SELECT
                    v.product_id,
                    v.supplier_id,
                    v.warehouse_id,
                    SUM(v.available_quantity) as available_quantity
                FROM v_lot_receipt_stock v
                {join_assignment}
                WHERE {where_str}
                GROUP BY v.product_id, v.supplier_id, v.warehouse_id
                {having_clause}
            )
        """

        # supplier_id may be NULL in stock data; exclude NULL from candidates for now.
        candidates_query = (
            stock_base_cte
            + """
            SELECT
                'product' AS kind,
                p.id AS id,
                p.maker_part_code AS code,
                p.product_name AS name
            FROM stock_base sb
            JOIN products p ON sb.product_id = p.id
            WHERE p.valid_to >= '9999-12-31'
            GROUP BY p.id, p.maker_part_code, p.product_name

            UNION ALL

            SELECT
                'supplier' AS kind,
                s.id AS id,
                s.supplier_code AS code,
                s.supplier_name AS name
            FROM stock_base sb
            JOIN suppliers s ON sb.supplier_id = s.id
            WHERE sb.supplier_id IS NOT NULL
              AND s.valid_to >= '9999-12-31'
            GROUP BY s.id, s.supplier_code, s.supplier_name

            UNION ALL

            SELECT
                'warehouse' AS kind,
                w.id AS id,
                w.warehouse_code AS code,
                w.warehouse_name AS name
            FROM stock_base sb
            JOIN warehouses w ON sb.warehouse_id = w.id
            WHERE w.valid_to >= '9999-12-31'
            GROUP BY w.id, w.warehouse_code, w.warehouse_name

            ORDER BY kind, code
            """
        )

        rows = self.db.execute(text(candidates_query), params).fetchall()

        products: list[InventoryFilterOption] = []
        suppliers: list[InventoryFilterOption] = []
        warehouses: list[InventoryFilterOption] = []

        for row in rows:
            option = InventoryFilterOption(id=row.id, code=row.code, name=row.name)
            if row.kind == "product":
                products.append(option)
            elif row.kind == "supplier":
                suppliers.append(option)
            elif row.kind == "warehouse":
                warehouses.append(option)

        return InventoryFilterOptions(
            products=products,
            suppliers=suppliers,
            warehouses=warehouses,
            effective_tab=effective_tab,
        )
