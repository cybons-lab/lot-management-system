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
