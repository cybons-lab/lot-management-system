"""Lot context client interfaces and in-process implementation."""

from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal

from sqlalchemy.orm import Session

from app.application.services.inventory.lot_service import LotService
from app.domain.lot import LotCandidate
from app.infrastructure.persistence.models import LotMaster, LotReceipt, Product, Warehouse
from app.presentation.schemas.inventory.inventory_schema import LotResponse


class LotContextClient(ABC):
    """Lot Context へのアクセスインターフェース."""

    @abstractmethod
    async def get_available_lots(
        self, supplier_item_id: int, warehouse_id: int | None, min_quantity: Decimal
    ) -> list[LotCandidate]:
        """利用可能ロットを FEFO 順で取得."""
        raise NotImplementedError

    @abstractmethod
    async def get_lot_by_reference(self, lot_reference: str) -> LotResponse:
        """lot_number からロット情報を取得."""
        raise NotImplementedError


class InProcessLotClient(LotContextClient):
    """同一プロセス内での実装（現時点）."""

    def __init__(self, lot_service: LotService):
        self.lot_service = lot_service
        self.db: Session = lot_service.db

    async def get_available_lots(
        self, supplier_item_id: int, warehouse_id: int | None, min_quantity: Decimal
    ) -> list[LotCandidate]:
        product = self.db.get(Product, supplier_item_id)
        if not product:
            return []

        warehouse_code: str | None = None
        if warehouse_id is not None:
            warehouse = self.db.get(Warehouse, warehouse_id)
            warehouse_code = warehouse.warehouse_code if warehouse else None

        candidates = self.lot_service.get_fefo_candidates(
            product_code=product.maker_part_no,
            warehouse_code=warehouse_code,
            exclude_expired=True,
        )

        if min_quantity > 0:
            candidates = [c for c in candidates if c.available_qty >= float(min_quantity)]

        return candidates

    async def get_lot_by_reference(self, lot_reference: str) -> LotResponse:
        # First find the lot to get ID
        lot = (
            self.db.query(LotReceipt)
            .join(LotMaster)
            .filter(LotMaster.lot_number == lot_reference)
            .first()
        )
        if not lot:
            # TODO: Define specific exception for reference lookup
            raise ValueError(f"Lot not found: {lot_reference}")

        # Then use get_lot_details to get full view model
        return self.lot_service.get_lot_details(lot.id)
