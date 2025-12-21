from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from typing import TYPE_CHECKING, cast

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.persistence.models import (
    Lot,
    Product,
    Supplier,
    Warehouse,
)


if TYPE_CHECKING:
    from app.domain.allocation_policy import AllocationPolicy, LockMode
    from app.domain.lot import LotCandidate


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
        excluded_origin_types: list[str] | None = None,
    ) -> Sequence[Lot]:
        """Fetch lots that have stock remaining for a product.

        v2.2: Uses Lot.current_quantity - Lot.allocated_quantity directly.
        v2.3: Supports origin_type filtering.

        Args:
            product_code: Product code to filter by
            warehouse_code: Optional warehouse code filter
            min_quantity: Minimum available quantity threshold
            excluded_origin_types: List of origin_types to exclude (e.g., ['sample', 'adhoc'])
        """
        product = self.db.query(Product).filter(Product.maker_part_code == product_code).first()
        if not product:
            return []

        # First, get all active lots for this product
        stmt: Select[tuple[Lot]] = select(Lot).where(
            Lot.product_id == product.id,
            Lot.status == "active",
        )

        # Filter by origin_type
        if excluded_origin_types:
            stmt = stmt.where(Lot.origin_type.not_in(excluded_origin_types))

        if warehouse_code:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.warehouse_code == warehouse_code).first()
            )
            if warehouse:
                stmt = stmt.where(Lot.warehouse_id == warehouse.id)
            else:
                return []

        lots = list(self.db.execute(stmt).scalars().all())

        # Filter by available quantity using lot_reservations
        from app.application.services.inventory.stock_calculation import (
            get_available_quantity,
        )

        available_lots = [
            lot for lot in lots if float(get_available_quantity(self.db, lot)) > min_quantity
        ]
        return available_lots

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
            supplier_stmt = select(Supplier).where(Supplier.supplier_code == supplier_code)
            supplier = self.db.execute(supplier_stmt).scalar_one_or_none()
        if product_code:
            product_stmt = select(Product).where(Product.maker_part_code == product_code)
            product = self.db.execute(product_stmt).scalar_one_or_none()

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

    def find_allocation_candidates(
        self,
        product_id: int,
        *,
        policy: AllocationPolicy,
        lock_mode: LockMode,
        warehouse_id: int | None = None,
        exclude_expired: bool = True,
        exclude_locked: bool = True,
        include_sample: bool = False,
        include_adhoc: bool = False,
        min_available_qty: float = 0.0,
    ) -> list[LotCandidate]:
        """Fetch allocation candidates with explicit policy and locking.

        This is the SSOT implementation for allocation candidate queries.
        All allocation-related candidate fetching should go through this method.

        Args:
            product_id: Product ID to filter by
            policy: Sorting policy (FEFO or FIFO)
            lock_mode: Database locking mode
            warehouse_id: Optional warehouse filter
            exclude_expired: Exclude lots past expiry date
            exclude_locked: Exclude lots with locked_quantity > 0
            include_sample: Include sample origin lots
            include_adhoc: Include adhoc origin lots
            min_available_qty: Minimum available quantity threshold

        Returns:
            List of LotCandidate sorted by policy
        """
        from app.domain.allocation_policy import AllocationPolicy, LockMode
        from app.domain.lot import LotCandidate

        # Build base query
        stmt: Select[tuple[Lot]] = (
            select(Lot)
            .options(joinedload(Lot.product), joinedload(Lot.warehouse))
            .where(
                Lot.product_id == product_id,
                Lot.status == "active",
            )
        )

        # Warehouse filter
        if warehouse_id is not None:
            stmt = stmt.where(Lot.warehouse_id == warehouse_id)

        # Origin type filters
        excluded_origins: list[str] = []
        if not include_sample:
            excluded_origins.append("sample")
        if not include_adhoc:
            excluded_origins.append("adhoc")
        if excluded_origins:
            stmt = stmt.where(Lot.origin_type.not_in(excluded_origins))

        # Expiry filter
        if exclude_expired:
            from sqlalchemy import or_

            stmt = stmt.where(or_(Lot.expiry_date.is_(None), Lot.expiry_date >= date.today()))

        # Locked filter
        if exclude_locked:
            from sqlalchemy import or_

            stmt = stmt.where(or_(Lot.locked_quantity.is_(None), Lot.locked_quantity == 0))

        # Ordering by policy
        if policy == AllocationPolicy.FEFO:
            from sqlalchemy import nulls_last

            stmt = stmt.order_by(
                nulls_last(Lot.expiry_date.asc()),
                Lot.received_date.asc(),
                Lot.id.asc(),
            )
        else:  # FIFO
            stmt = stmt.order_by(
                Lot.received_date.asc(),
                Lot.id.asc(),
            )

        # Locking
        if lock_mode == LockMode.FOR_UPDATE:
            stmt = stmt.with_for_update(of=Lot)
        elif lock_mode == LockMode.FOR_UPDATE_SKIP_LOCKED:
            stmt = stmt.with_for_update(skip_locked=True, of=Lot)

        lots = list(self.db.execute(stmt).scalars().all())

        # Filter by available quantity and convert to LotCandidate
        from app.application.services.inventory.stock_calculation import (
            get_available_quantity,
        )

        candidates: list[LotCandidate] = []
        for lot in lots:
            available = float(get_available_quantity(self.db, lot))
            if available <= min_available_qty:
                continue

            candidates.append(
                LotCandidate(
                    lot_id=lot.id,
                    lot_code=lot.lot_number,
                    lot_number=lot.lot_number,
                    product_code=lot.product.maker_part_code if lot.product else "",
                    warehouse_code=lot.warehouse.warehouse_code if lot.warehouse else "",
                    available_qty=available,
                    expiry_date=lot.expiry_date,
                    receipt_date=lot.received_date,
                )
            )

        return candidates
