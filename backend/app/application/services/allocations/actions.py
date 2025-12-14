"""Allocation actions service.

This module re-exports functions from the refactored modules.

P3: All functions now use LotReservation exclusively.

The actual implementations are in:
- commit.py: FEFO reservation commit operations
- manual.py: Manual reservation (Drag & Assign)
- cancel.py: Reservation release/cancellation
- confirm.py: Reservation confirmation
- auto.py: Auto-reservation with FEFO strategy
"""

from app.application.services.allocations.auto import (
    auto_reserve_bulk,
    auto_reserve_line,
)
from app.application.services.allocations.cancel import (
    bulk_release_reservations,
    release_reservation,
    release_reservations_for_order_line,
)
from app.application.services.allocations.commit import (
    commit_fefo_reservation,
    persist_reservation_entities,
    validate_commit_eligibility,
)
from app.application.services.allocations.confirm import (
    confirm_reservation,
    confirm_reservations_batch,
)
from app.application.services.allocations.manual import create_manual_reservation
from app.application.services.allocations.preempt import preempt_soft_reservations_for_hard


__all__ = [
    # commit.py
    "validate_commit_eligibility",
    "persist_reservation_entities",
    "commit_fefo_reservation",
    # manual.py
    "create_manual_reservation",
    # cancel.py
    "release_reservation",
    "bulk_release_reservations",
    "release_reservations_for_order_line",
    # confirm.py
    "preempt_soft_reservations_for_hard",
    "confirm_reservation",
    "confirm_reservations_batch",
    # auto.py
    "auto_reserve_line",
    "auto_reserve_bulk",
]
