"""Soft Delete Mixin for master data models.

This module provides a mixin class for implementing soft delete functionality
using the valid_to date approach. Records are considered "deleted" when their
valid_to date is in the past.
"""

from datetime import date
from typing import ClassVar

from sqlalchemy import Date, text
from sqlalchemy.orm import Mapped, mapped_column


# Default value for valid_to (indefinitely valid)
INFINITE_VALID_TO = date(9999, 12, 31)


class SoftDeleteMixin:
    """Mixin for soft delete functionality using valid_to date.

    This mixin adds a `valid_to` column to the model and provides methods
    for soft deletion and checking if a record is active.

    Usage:
        class MyModel(Base, SoftDeleteMixin):
            __tablename__ = "my_table"
            id: Mapped[int] = mapped_column(primary_key=True)
            name: Mapped[str] = mapped_column(String(100))
    """

    # Class variable to track that this model supports soft delete
    __soft_delete__: ClassVar[bool] = True

    valid_to: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        server_default=text("'9999-12-31'"),
        doc="有効終了日。9999-12-31は無期限有効を示す。",
    )

    @property
    def is_active(self) -> bool:
        """Check if the record is currently active (not soft deleted).

        Returns:
            True if valid_to is in the future (after today), False otherwise.
            A record with valid_to = today is considered inactive.
        """
        return self.valid_to > date.today()

    @property
    def is_soft_deleted(self) -> bool:
        """Check if the record has been soft deleted.

        Returns:
            True if valid_to is today or in the past, False otherwise.
        """
        return self.valid_to <= date.today()

    def soft_delete(self, end_date: date | None = None) -> None:
        """Mark this record as soft deleted.

        Args:
            end_date: The date until which the record is valid.
                     Defaults to yesterday (immediately inactive).
        """
        from datetime import timedelta

        if end_date is not None:
            self.valid_to = end_date
        else:
            # Set to yesterday so the record is immediately inactive
            self.valid_to = date.today() - timedelta(days=1)

    def restore(self) -> None:
        """Restore a soft-deleted record to active status."""
        self.valid_to = INFINITE_VALID_TO

    @classmethod
    def get_active_filter(cls):
        """Get a SQLAlchemy filter expression for active records.

        Returns:
            A filter expression that can be used in queries.
            Filters to records where valid_to > today.

        Usage:
            session.query(MyModel).filter(MyModel.get_active_filter())
        """
        from sqlalchemy import func

        return cls.valid_to > func.current_date()
