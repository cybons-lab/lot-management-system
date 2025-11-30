"""Customer items service (得意先品番マッピング管理)."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.masters_models import CustomerItem
from app.schemas.masters.customer_items_schema import CustomerItemCreate, CustomerItemUpdate
from app.services.common.base_service import BaseService


class CustomerItemsService(BaseService[CustomerItem, CustomerItemCreate, CustomerItemUpdate, int]):
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
    ) -> list[dict]:
        """Get all customer item mappings with optional filtering and enriched data."""
        from app.models.masters_models import Customer, Product, Supplier
        from sqlalchemy import select

        # Build query with JOINs to get related names
        query = (
            select(
                CustomerItem,
                Customer.customer_code,
                Customer.customer_name,
                Product.product_name,
                Supplier.supplier_code,
                Supplier.supplier_name,
            )
            .join(Customer, CustomerItem.customer_id == Customer.id)
            .join(Product, CustomerItem.product_id == Product.id)
            .outerjoin(Supplier, CustomerItem.supplier_id == Supplier.id)
        )

        if customer_id is not None:
            query = query.filter(CustomerItem.customer_id == customer_id)

        if product_id is not None:
            query = query.filter(CustomerItem.product_id == product_id)

        results = self.db.execute(query.offset(skip).limit(limit)).all()

        # Convert to dict with enriched data
        return [
            {
                "customer_id": r.CustomerItem.customer_id,
                "customer_code": r.customer_code,
                "customer_name": r.customer_name,
                "external_product_code": r.CustomerItem.external_product_code,
                "product_id": r.CustomerItem.product_id,
                "product_name": r.product_name,
                "supplier_id": r.CustomerItem.supplier_id,
                "supplier_code": r.supplier_code,
                "supplier_name": r.supplier_name,
                "base_unit": r.CustomerItem.base_unit,
                "pack_unit": r.CustomerItem.pack_unit,
                "pack_quantity": float(r.CustomerItem.pack_quantity) if r.CustomerItem.pack_quantity else None,
                "special_instructions": r.CustomerItem.special_instructions,
                "created_at": r.CustomerItem.created_at.isoformat() if r.CustomerItem.created_at else None,
                "updated_at": r.CustomerItem.updated_at.isoformat() if r.CustomerItem.updated_at else None,
            }
            for r in results
        ]

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
