"""Order context client interfaces."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.application.services.orders.order_service import OrderService
from app.presentation.schemas.orders.orders_schema import (
    OrderCreate,
    OrderWithLinesResponse,
)


class OrderContextClient(ABC):
    """Order Context client abstraction."""

    @abstractmethod
    async def get_orders(self, limit: int = 100) -> list[OrderWithLinesResponse]:
        raise NotImplementedError

    @abstractmethod
    async def get_order(self, order_id: int) -> OrderWithLinesResponse:
        raise NotImplementedError

    @abstractmethod
    async def create_order(self, order: OrderCreate) -> OrderWithLinesResponse:
        raise NotImplementedError


class InProcessOrderClient(OrderContextClient):
    """In-process OrderContext client."""

    def __init__(self, service: OrderService):
        self.service = service

    async def get_orders(self, limit: int = 100) -> list[OrderWithLinesResponse]:
        return self.service.get_orders(limit=limit)

    async def get_order(self, order_id: int) -> OrderWithLinesResponse:
        return self.service.get_order_detail(order_id)

    async def create_order(self, order: OrderCreate) -> OrderWithLinesResponse:
        return self.service.create_order(order)
