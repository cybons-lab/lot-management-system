"""Inventory service layer for inventory items (summary)."""

from sqlalchemy.orm import Session

from app.models.inventory_models import InventoryItem
from app.schemas.inventory.inventory_schema import InventoryItemResponse


class InventoryService:
    """Business logic for inventory items (aggregated summary)."""

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
        Get inventory items with optional filtering.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            product_id: Filter by product ID
            warehouse_id: Filter by warehouse ID

        Returns:
            List of inventory items
        """
        query = self.db.query(InventoryItem)

        if product_id is not None:
            query = query.filter(InventoryItem.product_id == product_id)

        if warehouse_id is not None:
            query = query.filter(InventoryItem.warehouse_id == warehouse_id)

        query = query.order_by(InventoryItem.product_id, InventoryItem.warehouse_id)

        items = query.offset(skip).limit(limit).all()

        return [
            InventoryItemResponse(
                id=item.id,
                product_id=item.product_id,
                warehouse_id=item.warehouse_id,
                total_quantity=item.total_quantity,
                allocated_quantity=item.allocated_quantity,
                available_quantity=item.available_quantity,
                last_updated=item.last_updated,
            )
            for item in items
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
        item = (
            self.db.query(InventoryItem)
            .filter(
                InventoryItem.product_id == product_id,
                InventoryItem.warehouse_id == warehouse_id,
            )
            .first()
        )

        if not item:
            return None

        return InventoryItemResponse(
            id=item.id,
            product_id=item.product_id,
            warehouse_id=item.warehouse_id,
            total_quantity=item.total_quantity,
            allocated_quantity=item.allocated_quantity,
            available_quantity=item.available_quantity,
            last_updated=item.last_updated,
        )
