"""
FEFO allocation service (excluding locked lots).

v2.2: lot_current_stock 依存を削除。Lot モデルを直接使用。

Refactored: God functions split into smaller, reusable functions.
"""

from __future__ import annotations

from .cancellation import cancel_allocation
from .commit import (
    commit_fefo_allocation,
    persist_allocation_entities,
    validate_commit_eligibility,
)
from .manual import allocate_manually
from .preview import (
    build_preview_result,
    calculate_line_allocations,
    load_order_for_preview,
    preview_fefo_allocation,
    validate_preview_eligibility,
)
from .schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
    FefoCommitResult,
    FefoLinePlan,
    FefoLotPlan,
    FefoPreviewResult,
)
from .tracing import allocate_with_tracing
from .utils import (
    _existing_allocated_qty,
    _load_order,
    _lot_candidates,
    _resolve_next_div,
    update_order_allocation_status,
    update_order_line_status,
)


__all__ = [
    "FefoLotPlan",
    "FefoLinePlan",
    "FefoPreviewResult",
    "FefoCommitResult",
    "AllocationCommitError",
    "AllocationNotFoundError",
    "_load_order",
    "_existing_allocated_qty",
    "_resolve_next_div",
    "_lot_candidates",
    "validate_preview_eligibility",
    "load_order_for_preview",
    "calculate_line_allocations",
    "build_preview_result",
    "preview_fefo_allocation",
    "validate_commit_eligibility",
    "persist_allocation_entities",
    "update_order_line_status",
    "update_order_allocation_status",
    "commit_fefo_allocation",
    "cancel_allocation",
    "allocate_manually",
    "allocate_with_tracing",
]
