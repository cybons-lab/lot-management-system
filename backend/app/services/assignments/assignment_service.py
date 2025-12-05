"""User-Supplier assignment service."""

from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.assignments.assignment_models import UserSupplierAssignment
from app.schemas.assignments.assignment_schema import (
    UserSupplierAssignmentCreate,
    UserSupplierAssignmentUpdate,
)
from app.services.common.base_service import BaseService


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

        This will:
        1. Remove primary flag from any existing primary user for this supplier
        2. Create or update the assignment for this user to be primary
        """
        # Remove existing primary for this supplier
        stmt = select(UserSupplierAssignment).where(
            UserSupplierAssignment.supplier_id == supplier_id,
            UserSupplierAssignment.is_primary == True,  # noqa: E712
        )
        existing_primary = cast(
            UserSupplierAssignment | None, self.db.execute(stmt).scalar_one_or_none()
        )

        if existing_primary:
            existing_primary.is_primary = False

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
