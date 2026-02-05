"""User-Supplier assignment service."""

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.application.services.common.base_service import BaseService
from app.application.services.common.optimistic_lock import (
    hard_delete_with_version,
    update_with_version,
)
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

    def get_assigned_supplier_ids(self, user_id: int) -> list[int]:
        """Get list of assigned supplier IDs for a user.

        Used for supplier priority sorting in lists.
        """
        stmt = select(UserSupplierAssignment.supplier_id).where(
            UserSupplierAssignment.user_id == user_id,
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
        """Update an existing assignment with optimistic lock."""
        update_data = data.model_dump(exclude_unset=True, exclude={"version"})
        updated = update_with_version(
            self.db,
            UserSupplierAssignment,
            filters=[UserSupplierAssignment.id == assignment_id],
            update_values=update_data,
            expected_version=data.version,
            not_found_detail="Assignment not found",
        )
        return updated

    def delete_assignment(self, assignment_id: int, expected_version: int) -> None:
        """Delete an assignment with optimistic lock."""
        hard_delete_with_version(
            self.db,
            UserSupplierAssignment,
            filters=[UserSupplierAssignment.id == assignment_id],
            expected_version=expected_version,
            not_found_detail="Assignment not found",
        )
