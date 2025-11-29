"""Customer items service (得意先品番マッピング管理)."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.masters_models import CustomerItem
from app.schemas.masters.customer_items_schema import CustomerItemCreate, CustomerItemUpdate
from app.services.common.base_service import BaseService


class CustomerItemsService(BaseService[CustomerItem, CustomerItemCreate, CustomerItemUpdate]):
    """Service for managing customer item mappings.
    
    Inherits common CRUD operations from BaseService:
    - get_by_id(id) -> CustomerItem
    - create(payload) -> CustomerItem
    - update(id, payload) -> CustomerItem
    - delete(id) -> None
    
    Custom business logic for composite key operations is implemented below.
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db=db, model=CustomerItem)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: int | None = None,
        product_id: int | None = None,
    ) -> list[CustomerItem]:
        """Get all customer item mappings with optional filtering."""
        query = self.db.query(CustomerItem)

        if customer_id is not None:
            query = query.filter(CustomerItem.customer_id == customer_id)

        if product_id is not None:
            query = query.filter(CustomerItem.product_id == product_id)

        return query.offset(skip).limit(limit).all()

    def get_by_customer(self, customer_id: int) -> list[CustomerItem]:
        """Get all customer item mappings for a specific customer."""
        return self.db.query(CustomerItem).filter(CustomerItem.customer_id == customer_id).all()

    def get_by_key(self, customer_id: int, external_product_code: str) -> CustomerItem | None:
        """Get customer item mapping by composite key."""
        return (
            self.db.query(CustomerItem)
            .filter(
                CustomerItem.customer_id == customer_id,
                CustomerItem.external_product_code == external_product_code,
            )
            .first()
        )

    def update_by_key(
        self, customer_id: int, external_product_code: str, item: CustomerItemUpdate
    ) -> CustomerItem | None:
        """Update an existing customer item mapping by composite key."""
        db_item = self.get_by_key(customer_id, external_product_code)
        if not db_item:
            return None

        for key, value in item.model_dump(exclude_unset=True).items():
            setattr(db_item, key, value)

        db_item.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def delete_by_key(self, customer_id: int, external_product_code: str) -> bool:
        """Delete a customer item mapping by composite key."""
        db_item = self.get_by_key(customer_id, external_product_code)
        if not db_item:
            return False

        self.db.delete(db_item)
        self.db.commit()
        return True
