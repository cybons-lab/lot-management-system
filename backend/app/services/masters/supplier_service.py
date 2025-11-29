from sqlalchemy.orm import Session

from app.models.masters_models import Supplier
from app.schemas.masters.masters_schema import SupplierCreate, SupplierUpdate
from app.services.common.base_service import BaseService


class SupplierService(BaseService[Supplier, SupplierCreate, SupplierUpdate, str]):
    """Service for managing suppliers."""

    def __init__(self, db: Session):
        super().__init__(db, Supplier)
