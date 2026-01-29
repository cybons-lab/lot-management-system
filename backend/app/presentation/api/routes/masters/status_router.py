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
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import get_current_user


router = APIRouter()


@router.get("/status")
def get_master_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get master data status including unmapped counts."""
    # 1. Unmapped Customer Items (No supplier assigned)
    unmapped_customer_items_count = (
        db.query(func.count(CustomerItem.customer_id))
        .filter(CustomerItem.supplier_id.is_(None))
        .scalar()
    )

    # 2. Unmapped Products (No supplier assigned in SupplierItem)
    # products table LEFT JOIN supplier_items table
    unmapped_products_count = (
        db.query(func.count(Product.id))
        .outerjoin(SupplierItem, Product.id == SupplierItem.product_group_id)
        .filter(SupplierItem.id.is_(None))
        .scalar()
    )

    # 3. Unmapped Customer Item Delivery Settings
    # customer_items table LEFT JOIN customer_item_delivery_settings
    # JOIN condition: customer_item_id (after migration)
    unmapped_customer_item_delivery_settings_count = (
        db.query(func.count(CustomerItem.id))
        .outerjoin(
            CustomerItemDeliverySetting,
            CustomerItem.id == CustomerItemDeliverySetting.customer_item_id,
        )
        .filter(
            CustomerItemDeliverySetting.id.is_(None),
            CustomerItem.supplier_id.isnot(None),
        )
        .scalar()
    )

    # 4. Current User Primary Assignment Check
    current_user_has_primary_assignments = (
        db.query(UserSupplierAssignment)
        .filter(
            UserSupplierAssignment.user_id == current_user.id,
            UserSupplierAssignment.is_primary.is_(True),
        )
        .first()
        is not None
    )

    return {
        "unmapped_customer_items_count": unmapped_customer_items_count,
        "unmapped_products_count": unmapped_products_count,
        "unmapped_customer_item_delivery_settings_count": unmapped_customer_item_delivery_settings_count,
        "current_user_has_primary_assignments": current_user_has_primary_assignments,
    }
