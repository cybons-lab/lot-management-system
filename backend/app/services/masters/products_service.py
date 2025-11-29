"""Business logic for product operations."""

from sqlalchemy.orm import Session

from app.models import Product
from app.repositories.products_repository import ProductRepository
from app.schemas.masters.products_schema import ProductCreate, ProductUpdate
from app.services.common.base_service import BaseService


class ProductService(BaseService[Product, ProductCreate, ProductUpdate, int]):
    """Service layer orchestrating product use cases.

    Inherits common CRUD operations from BaseService:
    - get_by_id(product_id) -> Product
    - create(payload) -> Product
    - update(product_id, payload) -> Product
    - delete(product_id) -> None

    Custom business logic is implemented below.
    """

    def __init__(self, session: Session) -> None:
        super().__init__(db=session, model=Product)
        self.repository = ProductRepository(session)

    def create(self, payload: ProductCreate) -> Product:
        """Create new product with field mapping."""
        data = payload.model_dump()
        # Map schema fields to model fields
        if "product_code" in data:
            data["maker_part_code"] = data.pop("product_code")

        # Remove fields not in model
        data.pop("customer_part_no", None)
        data.pop("maker_item_code", None)
        data.pop("is_active", None)

        # Set default base_unit if not present (Model requires it)
        if "base_unit" not in data:
            data["base_unit"] = data.get("internal_unit", "CAN")

        instance = self.model(**data)
        self.db.add(instance)
        try:
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except Exception as exc:
            self.db.rollback()
            raise exc

    def update(self, id: int, payload: ProductUpdate) -> Product:
        """Update product with field mapping."""
        instance = self.get_by_id(id)
        data = payload.model_dump(exclude_unset=True)

        if "product_code" in data:
            data["maker_part_code"] = data.pop("product_code")

        # Remove fields not in model
        data.pop("customer_part_no", None)
        data.pop("maker_item_code", None)
        data.pop("is_active", None)

        for field, value in data.items():
            setattr(instance, field, value)

        try:
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except Exception as exc:
            self.db.rollback()
            raise exc

    def list_products(
        self, *, page: int, per_page: int, q: str | None
    ) -> tuple[list[Product], int]:
        """Return paginated products with optional search query.

        Args:
            page: Page number (1-indexed)
            per_page: Items per page
            q: Optional search query

        Returns:
            Tuple of (products list, total count)
        """
        return self.repository.list(page=page, per_page=per_page, q=q)
