"""User-Supplier assignment service."""

from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.application.services.common.base_service import BaseService
from app.infrastructure.persistence.models.assignments.assignment_models import (
    UserSupplierAssignment,
)
from app.presentation.schemas.assignments.assignment_schema import (
    UserSupplierAssignmentCreate,
    UserSupplierAssignmentUpdate,
)


class UserSupplierAssignmentService(
    BaseService[
        UserSupplierAssignment, UserSupplierAssignmentCreate, UserSupplierAssignmentUpdate, int
    ]
):
    """Service for user-supplier assignments.

    Inherits common CRUD operations from BaseService:
    - get_by_id(assignment_id) -> UserSupplierAssignment
    - create(payload) -> UserSupplierAssignment (overridden as create_assignment)
    - update(assignment_id, payload) -> UserSupplierAssignment (overridden as update_assignment)
    - delete(assignment_id) -> None (overridden as delete_assignment)

    Custom business logic is implemented below.
    """

    def __init__(self, db: Session):
        super().__init__(db=db, model=UserSupplierAssignment)

    def get_all(
        self, skip: int = 0, limit: int = 100, *, include_inactive: bool = False
    ) -> list[UserSupplierAssignment]:
        """Get all user-supplier assignments with related data."""
        stmt = (
            select(UserSupplierAssignment)
            .options(
                joinedload(UserSupplierAssignment.user),
                joinedload(UserSupplierAssignment.supplier),
            )
            .order_by(
                UserSupplierAssignment.supplier_id,
                UserSupplierAssignment.is_primary.desc(),
            )
        )
        result = self.db.execute(stmt)
        return list(result.unique().scalars().all())

    def get_primary_supplier_ids(self, user_id: int) -> list[int]:
        """Get list of primary supplier IDs for a user.

        Returns the supplier_id for each assignment where
        is_primary=True. Used for primary supplier priority sorting in
        lists.
        """
        stmt = select(UserSupplierAssignment.supplier_id).where(
            UserSupplierAssignment.user_id == user_id,
            UserSupplierAssignment.is_primary.is_(True),
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def get_user_suppliers(self, user_id: int) -> list[UserSupplierAssignment]:
        """Get all supplier assignments for a user."""
        stmt = (
            select(UserSupplierAssignment)
            .where(UserSupplierAssignment.user_id == user_id)
            .options(joinedload(UserSupplierAssignment.supplier))
            .order_by(UserSupplierAssignment.is_primary.desc(), UserSupplierAssignment.assigned_at)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def get_supplier_users(self, supplier_id: int) -> list[UserSupplierAssignment]:
        """Get all user assignments for a supplier."""
        stmt = (
            select(UserSupplierAssignment)
            .where(UserSupplierAssignment.supplier_id == supplier_id)
            .options(joinedload(UserSupplierAssignment.user))
            .order_by(UserSupplierAssignment.is_primary.desc(), UserSupplierAssignment.assigned_at)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def create_assignment(self, data: UserSupplierAssignmentCreate) -> UserSupplierAssignment:
        """Create a new user-supplier assignment."""
        return self.create(data)

    def update_assignment(
        self, assignment_id: int, data: UserSupplierAssignmentUpdate
    ) -> UserSupplierAssignment:
        """Update an existing assignment."""
        return self.update(assignment_id, data)

    def delete_assignment(self, assignment_id: int) -> None:
        """Delete an assignment."""
        self.delete(assignment_id)

    def set_primary_assignment(self, user_id: int, supplier_id: int) -> UserSupplierAssignment:
        """Set a user as the primary contact for a supplier.

        This allows multiple users to be primary contacts for the same supplier
        (e.g., during handover periods).

        This will:
        1. Find or create the assignment for this user
        2. Set is_primary=True for this assignment
        """
        # Find or create assignment for this user
        stmt = select(UserSupplierAssignment).where(
            UserSupplierAssignment.user_id == user_id,
            UserSupplierAssignment.supplier_id == supplier_id,
        )
        assignment = cast(UserSupplierAssignment | None, self.db.execute(stmt).scalar_one_or_none())

        if assignment:
            assignment.is_primary = True
        else:
            assignment = UserSupplierAssignment(
                user_id=user_id,
                supplier_id=supplier_id,
                is_primary=True,
            )
            self.db.add(assignment)

        self.db.commit()
        self.db.refresh(assignment)
        return assignment

    def unset_primary_assignment(self, user_id: int, supplier_id: int) -> UserSupplierAssignment:
        """Remove primary contact status from a user for a supplier.

        Args:
            user_id: User ID
            supplier_id: Supplier ID

        Returns:
            The updated assignment

        Raises:
            ValueError: If the assignment does not exist
        """
        stmt = select(UserSupplierAssignment).where(
            UserSupplierAssignment.user_id == user_id,
            UserSupplierAssignment.supplier_id == supplier_id,
        )
        assignment = cast(UserSupplierAssignment | None, self.db.execute(stmt).scalar_one_or_none())

        if not assignment:
            raise ValueError("Assignment not found")

        assignment.is_primary = False
        self.db.commit()
        self.db.refresh(assignment)
        return assignment
