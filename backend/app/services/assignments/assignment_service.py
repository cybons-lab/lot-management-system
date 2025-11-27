"""User-Supplier assignment service."""

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.assignments.assignment_models import UserSupplierAssignment
from app.schemas.assignments.assignment_schema import (
    UserSupplierAssignmentCreate,
    UserSupplierAssignmentUpdate,
)


class AssignmentService:
    """Service for user-supplier assignments."""

    def __init__(self, db: Session):
        self.db = db

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
        assignment = UserSupplierAssignment(**data.model_dump())
        self.db.add(assignment)
        self.db.commit()
        self.db.refresh(assignment)
        return assignment

    def update_assignment(
        self, assignment_id: int, data: UserSupplierAssignmentUpdate
    ) -> UserSupplierAssignment:
        """Update an existing assignment."""
        assignment = self.db.get(UserSupplierAssignment, assignment_id)
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(assignment, key, value)

        self.db.commit()
        self.db.refresh(assignment)
        return assignment

    def delete_assignment(self, assignment_id: int) -> None:
        """Delete an assignment."""
        assignment = self.db.get(UserSupplierAssignment, assignment_id)
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        self.db.delete(assignment)
        self.db.commit()

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
        existing_primary = self.db.execute(stmt).scalar_one_or_none()

        if existing_primary:
            existing_primary.is_primary = False

        # Find or create assignment for this user
        stmt = select(UserSupplierAssignment).where(
            UserSupplierAssignment.user_id == user_id,
            UserSupplierAssignment.supplier_id == supplier_id,
        )
        assignment = self.db.execute(stmt).scalar_one_or_none()

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
