"""Inventory context client interfaces."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.application.services.inventory.inventory_service import InventoryService
from app.presentation.schemas.inventory.inventory_schema import InventoryItemResponse


class InventoryContextClient(ABC):
    """Inventory Context client abstraction."""

    @abstractmethod
    async def get_inventory_summary(
        self, product_id: int, warehouse_id: int
    ) -> InventoryItemResponse | None:
        raise NotImplementedError

    @abstractmethod
    async def list_inventory(self, skip: int = 0, limit: int = 100) -> list[InventoryItemResponse]:
        raise NotImplementedError


class InProcessInventoryClient(InventoryContextClient):
    """In-process InventoryContext client."""

    def __init__(self, service: InventoryService):
        self.service = service

    async def get_inventory_summary(
        self, product_id: int, warehouse_id: int
    ) -> InventoryItemResponse | None:
        return self.service.get_inventory_item_by_product_warehouse(product_id, warehouse_id)

    async def list_inventory(self, skip: int = 0, limit: int = 100) -> list[InventoryItemResponse]:
        response = self.service.get_inventory_items(skip=skip, limit=limit)
        return response.items
