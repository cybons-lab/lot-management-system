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
        Get inventory items from inventory_items table.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            product_id: Filter by product ID
            warehouse_id: Filter by warehouse ID

        Returns:
            List of inventory items
        """
        query = (
            self.db.query(
                Lot.product_id,
                Lot.warehouse_id,
                func.sum(Lot.current_quantity).label("total_quantity"),
                func.sum(Lot.allocated_quantity).label("allocated_quantity"),
                func.max(Lot.updated_at).label("last_updated"),
            )
            .filter(Lot.status == "active")
            .group_by(Lot.product_id, Lot.warehouse_id)
        )

        if product_id is not None:
            query = query.filter(Lot.product_id == product_id)

        if warehouse_id is not None:
            query = query.filter(Lot.warehouse_id == warehouse_id)

        # Pagination on aggregated results is tricky in pure SQL without subqueries or window functions if we want total count.
        # For simplicity in this refactor, we'll apply limit/offset to the grouped result.
        query = query.order_by(Lot.product_id, Lot.warehouse_id).offset(skip).limit(limit)

        results = query.all()

        return [
            InventoryItemResponse(
                id=idx + 1,  # Dummy ID since it's an aggregation
                product_id=row.product_id,
                warehouse_id=row.warehouse_id,
                total_quantity=row.total_quantity,
                allocated_quantity=row.allocated_quantity,
                available_quantity=row.total_quantity - row.allocated_quantity,
                last_updated=row.last_updated,
            )
            for idx, row in enumerate(results)
        ]

    def get_inventory_item_by_product_warehouse(
        self, product_id: int, warehouse_id: int
    ) -> InventoryItemResponse | None:
        """
        Get inventory item by product ID and warehouse ID.

        Args:
            product_id: Product ID
            warehouse_id: Warehouse ID

        Returns:
            Inventory item, or None if not found
        """
        result = (
            self.db.query(
                Lot.product_id,
                Lot.warehouse_id,
                func.sum(Lot.current_quantity).label("total_quantity"),
                func.sum(Lot.allocated_quantity).label("allocated_quantity"),
                func.max(Lot.updated_at).label("last_updated"),
            )
            .filter(
                Lot.product_id == product_id,
                Lot.warehouse_id == warehouse_id,
                Lot.status == "active",
            )
            .group_by(Lot.product_id, Lot.warehouse_id)
            .first()
        )

        if not result:
            return None

        return InventoryItemResponse(
            id=1,  # Dummy ID
            product_id=result.product_id,
            warehouse_id=result.warehouse_id,
            total_quantity=result.total_quantity,
            allocated_quantity=result.allocated_quantity,
            available_quantity=result.total_quantity - result.allocated_quantity,
            last_updated=result.last_updated,
        )
