"""Allocation Candidate Service - SSOT for allocation candidate extraction.

This service is the single source of truth for fetching allocation candidates.
All allocation-related candidate queries should go through this service.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.domain.allocation_policy import AllocationPolicy, LockMode
from app.domain.lot import LotCandidate
from app.infrastructure.persistence.repositories.lot_repository import LotRepository


if TYPE_CHECKING:
    pass


class AllocationCandidateService:
    """SSOT entry point for allocation candidate extraction.

    This service provides a unified interface for fetching allocation candidates
    across all use cases (preview, auto-allocation, manual allocation, etc.).

    Usage:
        service = AllocationCandidateService(db)
        candidates = service.get_candidates(
            product_id=123,
            policy=AllocationPolicy.FEFO,
            lock_mode=LockMode.NONE,
        )
    """

    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
        self._repo = LotRepository(db)

    def get_candidates(
        self,
        product_id: int,
        *,
        policy: AllocationPolicy,
        lock_mode: LockMode = LockMode.NONE,
        warehouse_id: int | None = None,
        exclude_expired: bool = True,
        exclude_locked: bool = True,
        include_sample: bool = False,
        include_adhoc: bool = False,
        min_available_qty: float = 0.0,
    ) -> list[LotCandidate]:
        """Fetch allocation candidates with explicit policy and locking.

        Args:
            product_id: Product ID to filter by
            policy: Sorting policy (FEFO or FIFO) - REQUIRED
            lock_mode: Database locking mode (default: NONE)
            warehouse_id: Optional warehouse filter
            exclude_expired: Exclude lots past expiry date (default: True)
            exclude_locked: Exclude lots with locked_quantity > 0 (default: True)
            include_sample: Include sample origin lots (default: False)
            include_adhoc: Include adhoc origin lots (default: False)
            min_available_qty: Minimum available quantity threshold (default: 0.0)

        Returns:
            List of LotCandidate sorted by policy
        """
        return self._repo.find_allocation_candidates(
            product_id=product_id,
            policy=policy,
            lock_mode=lock_mode,
            warehouse_id=warehouse_id,
            exclude_expired=exclude_expired,
            exclude_locked=exclude_locked,
            include_sample=include_sample,
            include_adhoc=include_adhoc,
            min_available_qty=min_available_qty,
        )

    def get_candidates_for_products(
        self,
        product_ids: list[int],
        *,
        policy: AllocationPolicy,
        lock_mode: LockMode = LockMode.NONE,
        exclude_expired: bool = True,
        exclude_locked: bool = True,
        include_sample: bool = False,
        include_adhoc: bool = False,
        min_available_qty: float = 0.0,
    ) -> dict[int, list[LotCandidate]]:
        """Fetch allocation candidates for multiple products.

        Convenience method for batch operations.

        Args:
            product_ids: List of product IDs to fetch candidates for
            policy: Sorting policy (FEFO or FIFO) - REQUIRED
            lock_mode: Database locking mode (default: NONE)
            exclude_expired: Exclude lots past expiry date (default: True)
            exclude_locked: Exclude lots with locked_quantity > 0 (default: True)
            include_sample: Include sample origin lots (default: False)
            include_adhoc: Include adhoc origin lots (default: False)
            min_available_qty: Minimum available quantity threshold (default: 0.0)

        Returns:
            Dict mapping product_id to list of LotCandidate
        """
        result: dict[int, list[LotCandidate]] = {}
        for product_id in product_ids:
            candidates = self.get_candidates(
                product_id=product_id,
                policy=policy,
                lock_mode=lock_mode,
                exclude_expired=exclude_expired,
                exclude_locked=exclude_locked,
                include_sample=include_sample,
                include_adhoc=include_adhoc,
                min_available_qty=min_available_qty,
            )
            if candidates:
                result[product_id] = candidates
        return result
