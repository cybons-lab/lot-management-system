"""Inventory service layer for inventory items (summary).

This service aggregates inventory data from the lots table in real-time,
providing product × warehouse summary information.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.inventory_models import Lot
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
        Get inventory items from v_inventory_summary view.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            product_id: Filter by product ID
            warehouse_id: Filter by warehouse ID

        Returns:
            List of inventory items
        """
        # Use raw SQL or map a model to the view.
        # Here we use raw SQL for simplicity as we haven't defined a SQLAlchemy model for the view yet.
        # Alternatively, we could define a read-only model.
        
        # Construct query
        query = "SELECT product_id, warehouse_id, total_quantity, allocated_quantity, available_quantity, last_updated FROM v_inventory_summary WHERE 1=1"
        params = {}

        if product_id is not None:
            query += " AND product_id = :product_id"
            params["product_id"] = product_id

        if warehouse_id is not None:
            query += " AND warehouse_id = :warehouse_id"
            params["warehouse_id"] = warehouse_id

        query += " ORDER BY product_id, warehouse_id LIMIT :limit OFFSET :skip"
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
            )
            for idx, row in enumerate(result)
        ]

    def get_inventory_item_by_product_warehouse(
        self, product_id: int, warehouse_id: int
    ) -> InventoryItemResponse | None:
        """
        Get inventory item by product ID and warehouse ID using view.

        Args:
            product_id: Product ID
            warehouse_id: Warehouse ID

        Returns:
            Inventory item, or None if not found
        """
        query = """
            SELECT product_id, warehouse_id, total_quantity, allocated_quantity, available_quantity, last_updated
            FROM v_inventory_summary
            WHERE product_id = :product_id AND warehouse_id = :warehouse_id
        """
        from sqlalchemy import text
        row = self.db.execute(text(query), {"product_id": product_id, "warehouse_id": warehouse_id}).fetchone()

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
        )
