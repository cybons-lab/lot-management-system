"""Time utilities for consistent UTC timestamp handling.

This module provides helpers for generating timezone-aware UTC timestamps.
All persisted timestamps in the application should use these helpers.
"""

from datetime import UTC, datetime


def utcnow() -> datetime:
    """Return the current time as a timezone-aware UTC datetime.

    Use this instead of datetime.now() or datetime.utcnow() for all
    persisted timestamps to ensure timezone consistency.

    Returns:
        datetime: Current time in UTC with timezone info attached.
    """
    return datetime.now(UTC)
