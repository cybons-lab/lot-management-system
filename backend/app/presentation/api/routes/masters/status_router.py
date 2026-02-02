"""Master status router."""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.assignments.assignment_models import (
    UserSupplierAssignment,
)
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import (
    CustomerItem,
    CustomerItemDeliverySetting,
)
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import get_current_user


router = APIRouter()


@router.get("/status")
def get_master_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get master data status including unmapped counts."""
    # Phase1: supplier_id removed from customer_items
    # All customer_items now have supplier_item_id (NOT NULL), so unmapped count is always 0
    unmapped_customer_items_count = 0

    # 2. Unmapped Products - no longer applicable as ProductGroup was removed
    # SupplierItem IS the product entity now
    # Count could be: supplier_items with no customer_items references
    unmapped_products_count = 0  # Placeholder - redefine business logic if needed

    # 3. Unmapped Customer Item Delivery Settings
    # Phase1: Check customer_items without delivery settings
    unmapped_customer_item_delivery_settings_count = (
        db.query(func.count(CustomerItem.id))
        .outerjoin(
            CustomerItemDeliverySetting,
            CustomerItem.id == CustomerItemDeliverySetting.customer_item_id,
        )
        .filter(
            CustomerItemDeliverySetting.id.is_(None),
        )
        .scalar()
    )

    # 4. Current User Assignment Check
    current_user_has_assignments = (
        db.query(UserSupplierAssignment)
        .filter(
            UserSupplierAssignment.user_id == current_user.id,
        )
        .first()
        is not None
    )

    return {
        "unmapped_customer_items_count": unmapped_customer_items_count,
        "unmapped_products_count": unmapped_products_count,
        "unmapped_customer_item_delivery_settings_count": unmapped_customer_item_delivery_settings_count,
        "current_user_has_assignments": current_user_has_assignments,
    }
