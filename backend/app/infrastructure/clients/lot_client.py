"""Lot context client interfaces and in-process implementation."""

from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal

from sqlalchemy.orm import Session

from app.application.services.inventory.lot_service import LotService
from app.application.services.inventory.stock_calculation import get_reserved_quantity
from app.domain.lot import LotCandidate
from app.infrastructure.persistence.models import LotMaster, LotReceipt, Product, Warehouse
from app.presentation.schemas.inventory.inventory_schema import LotResponse


class LotContextClient(ABC):
    """Lot Context へのアクセスインターフェース."""

    @abstractmethod
    async def get_available_lots(
        self, product_id: int, warehouse_id: int | None, min_quantity: Decimal
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
        self, product_id: int, warehouse_id: int | None, min_quantity: Decimal
    ) -> list[LotCandidate]:
        product = self.db.get(Product, product_id)
        if not product:
            return []

        warehouse_code: str | None = None
        if warehouse_id is not None:
            warehouse = self.db.get(Warehouse, warehouse_id)
            warehouse_code = warehouse.warehouse_code if warehouse else None

        lots = self.lot_service.repository.find_available_lots(
            product_code=product.maker_part_code,
            warehouse_code=warehouse_code,
            min_quantity=float(min_quantity),
        )

        candidates: list[LotCandidate] = []
        for lot in lots:
            reserved = get_reserved_quantity(self.db, lot.id)
            candidates.append(
                LotCandidate(
                    lot_id=lot.id,
                    lot_code=lot.lot_number,
                    lot_number=lot.lot_number,
                    product_code=lot.product.maker_part_code if lot.product else "",
                    warehouse_code=lot.warehouse.warehouse_code if lot.warehouse else "",
                    available_qty=float((lot.current_quantity or Decimal("0")) - reserved),
                    expiry_date=lot.expiry_date,
                    receipt_date=lot.received_date,
                )
            )
        return candidates

    async def get_lot_by_reference(self, lot_reference: str) -> LotResponse:
        lot = (
            self.db.query(LotReceipt).join(LotMaster).filter(LotMaster.lot_number == lot_reference).first()
        )
        if not lot:
            # TODO: Define specific exception for reference lookup
            raise ValueError(f"Lot not found: {lot_reference}")

        response = LotResponse.model_validate(lot)
        if lot.product:
            response.product_code = lot.product.maker_part_code
            response.product_name = lot.product.product_name
        if lot.warehouse:
            response.warehouse_code = lot.warehouse.warehouse_code
            response.warehouse_name = lot.warehouse.warehouse_name
        if lot.supplier:
            response.supplier_code = lot.supplier.supplier_code
            response.supplier_name = lot.supplier.supplier_name
        return response
