"""Inventory service layer for inventory items (summary).

This service aggregates inventory data from the lots table in real-time,
providing product × warehouse summary information.
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
    ) -> list[InventoryItemResponse]:
        """Get inventory items from v_inventory_summary view with product and
        warehouse names.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            product_id: Filter by product ID
            warehouse_id: Filter by warehouse ID

        Returns:
            List of inventory items
        """
        # Join with products and warehouses to get names
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
            WHERE 1=1
        """
        params = {}

        if product_id is not None:
            query += " AND v.product_id = :product_id"
            params["product_id"] = product_id

        if warehouse_id is not None:
            query += " AND v.warehouse_id = :warehouse_id"
            params["warehouse_id"] = warehouse_id

        query += " ORDER BY v.product_id, v.warehouse_id LIMIT :limit OFFSET :skip"
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

        alloc_query = """
            SELECT 
                l.product_id,
                l.warehouse_id,
                a.allocation_type,
                SUM(a.allocated_quantity) as qty
            FROM allocations a
            JOIN lots l ON a.lot_id = l.id
            WHERE 1=1
              AND a.status IN ('allocated', 'provisional')
              AND l.product_id IN :product_ids
              AND l.warehouse_id IN :warehouse_ids
            GROUP BY l.product_id, l.warehouse_id, a.allocation_type
        """

        alloc_rows = self.db.execute(
            text(alloc_query),
            {
                "product_ids": tuple(set(found_products)),
                "warehouse_ids": tuple(set(found_warehouses)),
            },
        ).fetchall()

        # Map results for O(1) lookup
        # key: (product_id, warehouse_id) -> { 'soft': 0.0, 'hard': 0.0 }
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
        alloc_query = """
            SELECT 
                a.allocation_type,
                SUM(a.allocated_quantity) as qty
            FROM allocations a
            JOIN lots l ON a.lot_id = l.id
            WHERE a.status IN ('allocated', 'provisional')
              AND l.product_id = :product_id
              AND l.warehouse_id = :warehouse_id
            GROUP BY a.allocation_type
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

        return InventoryItemResponse(
            id=1,  # Dummy ID
            product_id=row.product_id,
            warehouse_id=row.warehouse_id,
            total_quantity=row.total_quantity,
            allocated_quantity=row.allocated_quantity,
            available_quantity=row.available_quantity,
            soft_allocated_quantity=Decimal(str(soft_qty)),
            hard_allocated_quantity=Decimal(str(hard_qty)),
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
                s.supplier_name,
                s.supplier_code,
                SUM(l.current_quantity) as total_quantity,
                COUNT(l.id) as lot_count,
                COUNT(DISTINCT l.product_id) as product_count
            FROM lots l
            JOIN suppliers s ON l.supplier_id = s.id
            WHERE l.current_quantity > 0 AND l.status = 'active'
            GROUP BY l.supplier_id, s.supplier_name, s.supplier_code
            ORDER BY s.supplier_code
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
                w.warehouse_name,
                w.warehouse_code,
                SUM(l.current_quantity) as total_quantity,
                COUNT(l.id) as lot_count,
                COUNT(DISTINCT l.product_id) as product_count
            FROM lots l
            JOIN warehouses w ON l.warehouse_id = w.id
            WHERE l.current_quantity > 0 AND l.status = 'active'
            GROUP BY l.warehouse_id, w.warehouse_name, w.warehouse_code
            ORDER BY w.warehouse_code
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
                p.product_name,
                p.maker_part_code as product_code,
                SUM(l.current_quantity) as total_quantity,
                SUM(l.allocated_quantity) as allocated_quantity,
                SUM(GREATEST(l.current_quantity - l.allocated_quantity - l.locked_quantity, 0)) as available_quantity,
                COUNT(l.id) as lot_count,
                COUNT(DISTINCT l.warehouse_id) as warehouse_count
            FROM lots l
            JOIN products p ON l.product_id = p.id
            WHERE l.current_quantity > 0 AND l.status = 'active'
            GROUP BY l.product_id, p.product_name, p.maker_part_code
            ORDER BY p.maker_part_code
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
