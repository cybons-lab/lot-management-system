from sqlalchemy.orm import Session

from app.models.masters_models import Customer
from app.schemas.masters.masters_schema import CustomerCreate, CustomerUpdate
from app.services.common.base_service import BaseService


class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate, str]):
    """Service for managing customers."""

    def __init__(self, db: Session):
        super().__init__(db, Customer)
