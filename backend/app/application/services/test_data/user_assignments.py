"""User-Supplier assignment test data generator."""

import random

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.assignments.assignment_models import (
    UserSupplierAssignment,
)
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import Supplier


def generate_user_supplier_assignments(db: Session) -> None:
    """Generate UserSupplierAssignment test data.

    Assigns users to suppliers for permission filtering and responsibility management.
    """
    users = db.query(User).all()
    suppliers = db.query(Supplier).limit(20).all()

    if not users or not suppliers:
        return

    # For each user, assign 1-5 suppliers
    for user in users:
        num_suppliers = random.randint(1, min(5, len(suppliers)))
        assigned_suppliers = random.sample(suppliers, num_suppliers)

        # First assignment is primary
        for idx, supplier in enumerate(assigned_suppliers):
            # Check for duplicate
            existing = (
                db.query(UserSupplierAssignment)
                .filter_by(user_id=user.id, supplier_id=supplier.id)
                .first()
            )
            if existing:
                continue

            assignment = UserSupplierAssignment(
                user_id=user.id,
                supplier_id=supplier.id,
                is_primary=(idx == 0),  # First one is primary
            )
            db.add(assignment)

    # Edge case: User with 10+ assignments (if enough suppliers)
    if len(suppliers) >= 10 and users:
        power_user = users[0]
        for supplier in suppliers[:10]:
            existing = (
                db.query(UserSupplierAssignment)
                .filter_by(user_id=power_user.id, supplier_id=supplier.id)
                .first()
            )
            if not existing:
                assignment = UserSupplierAssignment(
                    user_id=power_user.id,
                    supplier_id=supplier.id,
                    is_primary=False,
                )
                db.add(assignment)

    db.commit()
