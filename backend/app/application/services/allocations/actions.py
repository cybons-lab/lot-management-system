"""Allocation actions service.

This module re-exports functions from the refactored modules for backward compatibility.

The actual implementations are now in:
- commit.py: FEFO allocation commit operations
- manual.py: Manual allocation (Drag & Assign)
- cancel.py: Allocation cancellation
- confirm.py: Hard/Soft allocation confirmation
- auto.py: Auto-allocation with FEFO strategy

New code should import directly from the specific modules.
"""

from app.application.services.allocations.auto import (
    auto_allocate_bulk,
    auto_allocate_line,
)
from app.application.services.allocations.cancel import (
    bulk_cancel_allocations,
    cancel_allocation,
    cancel_allocations_for_order_line,
)
from app.application.services.allocations.commit import (
    commit_fefo_allocation,
    persist_allocation_entities,
    validate_commit_eligibility,
)
from app.application.services.allocations.confirm import (
    confirm_hard_allocation,
    confirm_hard_allocations_batch,
)
from app.application.services.allocations.manual import allocate_manually
from app.application.services.allocations.preempt import preempt_soft_allocations_for_hard


__all__ = [
    # commit.py
    "validate_commit_eligibility",
    "persist_allocation_entities",
    "commit_fefo_allocation",
    # manual.py
    "allocate_manually",
    # cancel.py
    "cancel_allocation",
    "bulk_cancel_allocations",
    "cancel_allocations_for_order_line",
    # confirm.py
    "preempt_soft_allocations_for_hard",
    "confirm_hard_allocation",
    "confirm_hard_allocations_batch",
    # auto.py
    "auto_allocate_line",
    "auto_allocate_bulk",
]
