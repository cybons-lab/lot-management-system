from sqlalchemy.orm import Session

from app.models.masters_models import Warehouse
from app.schemas.masters.masters_schema import WarehouseCreate, WarehouseUpdate
from app.services.common.base_service import BaseService


class WarehouseService(BaseService[Warehouse, WarehouseCreate, WarehouseUpdate, str]):
    """Service for managing warehouses."""

    def __init__(self, db: Session):
        super().__init__(db, Warehouse)
