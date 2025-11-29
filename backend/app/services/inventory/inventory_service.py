"""Inventory service layer for inventory items (summary).

This service aggregates inventory data from the lots table in real-time,
providing product × warehouse summary information.
"""

from sqlalchemy.orm import Session

from app.schemas.inventory.inventory_schema import InventoryItemResponse


class InventoryService:
    """Business logic for inventory items (aggregated summary from lots)."""

    def __init__(self, db: Session):
        """
        Initialize inventory service.

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
        """
        Get inventory items from v_inventory_summary view with product and warehouse names.

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

        result = self.db.execute(text(query), params).fetchall()

        return [
            InventoryItemResponse(
                id=idx + 1,  # Dummy ID
                product_id=row.product_id,
                warehouse_id=row.warehouse_id,
                total_quantity=row.total_quantity,
                allocated_quantity=row.allocated_quantity,
                available_quantity=row.available_quantity,
                last_updated=row.last_updated,
                product_name=row.product_name,
                product_code=row.product_code,
                warehouse_name=row.warehouse_name,
                warehouse_code=row.warehouse_code,
            )
            for idx, row in enumerate(result)
        ]

    def get_inventory_item_by_product_warehouse(
        self, product_id: int, warehouse_id: int
    ) -> InventoryItemResponse | None:
        """
        Get inventory item by product ID and warehouse ID with names.

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

        return InventoryItemResponse(
            id=1,  # Dummy ID
            product_id=row.product_id,
            warehouse_id=row.warehouse_id,
            total_quantity=row.total_quantity,
            allocated_quantity=row.allocated_quantity,
            available_quantity=row.available_quantity,
            last_updated=row.last_updated,
            product_name=row.product_name,
            product_code=row.product_code,
            warehouse_name=row.warehouse_name,
            warehouse_code=row.warehouse_code,
        )

    def get_inventory_by_supplier(self) -> list[dict]:
        """
        Get inventory aggregated by supplier.

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
        """
        Get inventory aggregated by warehouse.

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
        """
        Get inventory aggregated by product (across all warehouses).

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
