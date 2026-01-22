"""Base service for SmartRead services."""

from __future__ import annotations

from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class SmartReadBaseService:
    """Base class for SmartRead services to provide common attributes and type hints."""

    def __init__(self, session: Session) -> None:
        """Initialize with DB session.

        Args:
            session: DB session
        """
        self.session = session
