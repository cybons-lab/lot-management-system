"""
Lot repository and service utilities with FEFO support.

v2.2: lot_current_stock 依存を削除。Lot モデルを直接使用。
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from typing import cast

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.domain.lot import FefoPolicy, LotCandidate, LotNotFoundError, StockValidator
from app.models import Lot, Product, Supplier, Warehouse


class LotRepository:
    """Data-access helpers for lot entities."""

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, lot_id: int) -> Lot | None:
        """Return a lot by its primary key."""
        stmt: Select[tuple[Lot]] = (
            select(Lot)
            .options(joinedload(Lot.product), joinedload(Lot.warehouse))
            .where(Lot.id == lot_id)
        )
        return cast(Lot | None, self.db.execute(stmt).scalar_one_or_none())

    def find_available_lots(
        self,
        product_code: str,
        warehouse_code: str | None = None,
        min_quantity: float = 0.0,
    ) -> Sequence[Lot]:
        """
        Fetch lots that have stock remaining for a product.

        v2.2: Uses Lot.current_quantity - Lot.allocated_quantity directly.
        """
        # product_codeからproduct_idに変換
        from app.models import Product

        product = self.db.query(Product).filter(Product.maker_part_code == product_code).first()
        if not product:
            return []

        stmt: Select[tuple[Lot]] = select(Lot).where(
            Lot.product_id == product.id,
            Lot.status == "active",
            (Lot.current_quantity - Lot.allocated_quantity) > min_quantity,
        )

        if warehouse_code:
            from app.models import Warehouse

            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.warehouse_code == warehouse_code).first()
            )
            if warehouse:
                stmt = stmt.where(Lot.warehouse_id == warehouse.id)
            else:
                return []

        return cast(Sequence[Lot], self.db.execute(stmt).scalars().all())

    def create(
        self,
        supplier_code: str,
        product_code: str,
        lot_number: str,
        warehouse_id: int,
        receipt_date: date | None = None,
        expiry_date: date | None = None,
    ) -> Lot:
        """Create a lot placeholder using known identifiers."""
        warehouse: Warehouse | None = self.db.get(Warehouse, warehouse_id)
        product: Product | None = None
        supplier: Supplier | None = None
        if supplier_code:
            stmt = select(Supplier).where(Supplier.supplier_code == supplier_code)
            supplier = self.db.execute(stmt).scalar_one_or_none()
        if product_code:
            stmt = select(Product).where(Product.maker_part_code == product_code)
            product = self.db.execute(stmt).scalar_one_or_none()

        lot = Lot(
            supplier_id=supplier.id if supplier else None,
            supplier_code=supplier.supplier_code if supplier else supplier_code,
            product_id=product.id if product else None,
            product_code=product.maker_part_code if product else product_code,
            lot_number=lot_number,
            warehouse_id=warehouse_id,
            warehouse_code=warehouse.warehouse_code if warehouse else None,
            received_date=receipt_date or date.today(),
            expiry_date=expiry_date,
        )
        self.db.add(lot)
        return lot


class LotService:
    """Business logic for lot operations and FEFO candidate retrieval."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = LotRepository(db)

    def get_lot(self, lot_id: int) -> Lot:
        lot = self.repository.find_by_id(lot_id)
        if not lot:
            raise LotNotFoundError(lot_id)
        return lot

    def get_fefo_candidates(
        self,
        product_code: str,
        warehouse_code: str | None = None,
        exclude_expired: bool = True,
    ) -> list[LotCandidate]:
        """
        Get FEFO candidate lots.

        v2.2: Uses Lot.current_quantity - Lot.allocated_quantity for available quantity.
        """
        lots = self.repository.find_available_lots(
            product_code=product_code,
            warehouse_code=warehouse_code,
            min_quantity=0.0,
        )

        candidates = [
            LotCandidate(
                lot_id=lot.id,
                lot_code=lot.lot_number,
                lot_number=lot.lot_number,
                product_code=lot.product.maker_part_code if lot.product else product_code,
                warehouse_code=lot.warehouse.warehouse_code if lot.warehouse else "",
                available_qty=float((lot.current_quantity - lot.allocated_quantity) or 0.0),
                expiry_date=lot.expiry_date,
                receipt_date=lot.received_date,
            )
            for lot in lots
        ]

        if exclude_expired:
            candidates, _ = FefoPolicy.filter_expired_lots(candidates)

        return FefoPolicy.sort_lots_by_fefo(candidates)

    def validate_lot_availability(self, lot_id: int, required_qty: float) -> None:
        """
        Validate lot availability.

        v2.2: Uses Lot.current_quantity - Lot.allocated_quantity directly.
        """
        lot = self.get_lot(lot_id)

        # 利用可能在庫を計算
        available_qty = float(lot.current_quantity - lot.allocated_quantity)

        StockValidator.validate_sufficient_stock(lot_id, required_qty, available_qty)
        StockValidator.validate_not_expired(lot_id, lot.expiry_date)
