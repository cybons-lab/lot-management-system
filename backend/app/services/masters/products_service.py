"""Business logic for product operations."""

from sqlalchemy.orm import Session

from app.models import Product
from app.repositories.products_repository import ProductRepository
from app.schemas.masters.products_schema import ProductCreate, ProductUpdate
from app.services.common.base_service import BaseService


class ProductService(BaseService[Product, ProductCreate, ProductUpdate]):
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
