"""Allocation policy definitions.

Defines policies for lot selection (FEFO/FIFO) and database locking modes.
These are used by AllocationCandidateService as the SSOT for allocation candidates.
"""

from enum import Enum


class AllocationPolicy(str, Enum):
    """Policy for ordering lots during allocation."""

    FEFO = "fefo"  # First Expired, First Out (default for perishables)
    FIFO = "fifo"  # First In, First Out (by received date)


class LockMode(str, Enum):
    """Database locking mode for candidate queries."""

    NONE = "none"  # No locking (for read-only/preview)
    FOR_UPDATE = "for_update"  # Lock rows for update
    FOR_UPDATE_SKIP_LOCKED = "for_update_skip_locked"  # Skip already-locked rows
