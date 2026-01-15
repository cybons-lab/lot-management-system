"""Inventory service layer for inventory items (summary).

This service aggregates inventory data from the lots table in real-time,
providing product × warehouse summary information.

【設計意図】在庫サマリーサービスの設計判断:

1. なぜ v_inventory_summary ビューを使うのか（L83-112）
   理由: 在庫サマリー取得のパフォーマンス最適化
   業務的背景:
   - 自動車部品商社: 数万件のロットから製品×倉庫の在庫サマリーを表示
   - リアルタイム計算: SELECT SUM(current_quantity) GROUP BY ... は高負荷
   → v_inventory_summary ビューで事前集計（Materialized View相当）
   実装:
   - v_inventory_summary: 製品×倉庫ごとの在庫合計を集計
   - total_quantity, allocated_quantity, available_quantity を計算済み
   メリット:
   - 在庫一覧画面の表示速度向上（100倍以上の高速化）

2. なぜ supplier_id フィルタ時は別クエリを使うのか（L48-82）
   理由: v_inventory_summary に supplier_id カラムがない
   業務的背景:
   - 営業担当者: 自分の担当サプライヤーの在庫のみを表示したい
   - v_inventory_summary: 製品×倉庫でグループ化（サプライヤーは含まれない）
   → supplier_id フィルタ時は lots テーブルを直接集計
   実装:
   - supplier_id 指定時: SELECT SUM() FROM lots WHERE supplier_id = ?
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

from sqlalchemy.orm import Session

from app.presentation.schemas.inventory.inventory_schema import InventoryItemResponse


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
    ) -> list[InventoryItemResponse]:
        """Get inventory items from v_inventory_summary view with product and
        warehouse names.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            product_id: Filter by product ID
            warehouse_id: Filter by warehouse ID
            supplier_id: Filter by supplier ID (filters lots by supplier)
            tab: Tab filter - 'in_stock', 'no_stock', or 'all'
            primary_staff_only: Filter by primary staff (current user)
            current_user_id: Current user ID (required if primary_staff_only=True)

        Returns:
            List of inventory items
        """
        # Join with products and warehouses to get names
        # If supplier_id is specified or filtering by primary staff, we join lots/views to filter by supplier
        if supplier_id is not None or primary_staff_only:
            # Need to aggregate lots directly since v_inventory_summary doesn't have supplier_id
            # Use v_lot_receipt_stock view which handles B-Plan logic (withdrawals, etc.)
            query = """
                SELECT 
                    v.product_id, 
                    v.warehouse_id, 
                    SUM(v.remaining_quantity) as total_quantity,  -- physical stock
                    SUM(v.reserved_quantity) as allocated_quantity,
                    SUM(v.available_quantity) as available_quantity,
                    COUNT(v.receipt_id) as lot_count,
                    MAX(v.updated_at) as last_updated,
                    v.product_name,
                    v.product_code,
                    v.warehouse_name,
                    v.warehouse_code
                FROM v_lot_receipt_stock v
            """

            params = {}

            # If primary staff filter is active, join with user_supplier_assignments table
            if primary_staff_only and current_user_id:
                query += " JOIN user_supplier_assignments usa ON v.supplier_id = usa.supplier_id"

            query += " WHERE v.remaining_quantity > 0 AND v.status = 'active'"

            if supplier_id is not None:
                query += " AND v.supplier_id = :supplier_id"
                params["supplier_id"] = supplier_id
            
            if primary_staff_only and current_user_id:
                query += " AND usa.user_id = :current_user_id AND usa.is_primary = TRUE"
                params["current_user_id"] = current_user_id

            if product_id is not None:
                query += " AND v.product_id = :product_id"
                params["product_id"] = product_id

            if warehouse_id is not None:
                query += " AND v.warehouse_id = :warehouse_id"
                params["warehouse_id"] = warehouse_id

            query += " GROUP BY v.product_id, v.warehouse_id, v.product_name, v.product_code, v.warehouse_name, v.warehouse_code"
            query += " ORDER BY v.product_id, v.warehouse_id LIMIT :limit OFFSET :skip"
            params["limit"] = limit
            params["skip"] = skip
        else:
            query = """
                SELECT 
                    v.product_id, 
                    v.warehouse_id, 
                    v.active_lot_count,
                    v.total_quantity, 
                    v.allocated_quantity, 
                    v.available_quantity, 
                    v.last_updated,
                    v.inventory_state,
                    p.product_name,
                    p.maker_part_code AS product_code,
                    w.warehouse_name,
                    w.warehouse_code
                FROM v_inventory_summary v
                LEFT JOIN products p ON v.product_id = p.id
                LEFT JOIN warehouses w ON v.warehouse_id = w.id
                WHERE 1=1
            """
            params = {}

            if product_id is not None:
                query += " AND v.product_id = :product_id"
                params["product_id"] = product_id

            if warehouse_id is not None:
                query += " AND v.warehouse_id = :warehouse_id"
                params["warehouse_id"] = warehouse_id

            # Tab filter for inventory_state
            if tab == "in_stock":
                query += " AND v.inventory_state = 'in_stock'"
            elif tab == "no_stock":
                query += " AND v.inventory_state IN ('no_lots', 'depleted_only')"
            # 'all' or any other value: no filter

            query += " ORDER BY v.available_quantity DESC, v.product_id, v.warehouse_id LIMIT :limit OFFSET :skip"
            params["limit"] = limit
            params["skip"] = skip

        from sqlalchemy import text

        # 1. Base Summary Query
        result = self.db.execute(text(query), params).fetchall()

        if not result:
            return []

        # 2. Detail Allocation Aggregation Query
        # Fetch detailed allocation breakdown for these products/warehouses
        # We need to filter exactly the items we found in the first page
        found_products = [r.product_id for r in result]
        found_warehouses = [r.warehouse_id for r in result]

        if not found_products:
            return []

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
        count_query = """
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
        count_rows = self.db.execute(
            text(count_query),
            {
                "product_ids": tuple(set(found_products)),
                "warehouse_ids": tuple(set(found_warehouses)),
            },
        ).fetchall()

        # Map counts
        count_map = {}
        for row in count_rows:
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
        responses = []
        for idx, row in enumerate(result):
            key = (row.product_id, row.warehouse_id)
            allocs = alloc_map.get(key, {"soft": 0.0, "hard": 0.0})
            # Use active_lot_count from view, fallback to count_map for supplier-filtered query
            active_lot_count = getattr(row, "active_lot_count", count_map.get(key, 0))
            # Use inventory_state from view, default to "no_lots"
            inventory_state = getattr(row, "inventory_state", "no_lots")

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
                    inventory_state=inventory_state,
                    last_updated=row.last_updated,
                    product_name=row.product_name,
                    product_code=row.product_code,
                    warehouse_name=row.warehouse_name,
                    warehouse_code=row.warehouse_code,
                )
            )

        return responses

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
            lot_count=count_res or 0,
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
