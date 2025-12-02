"""Customer master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    CustomerBulkUpsertRequest,
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)
from app.services.common.export_service import ExportService
from app.services.masters.customer_service import CustomerService


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerResponse])
def list_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Return customers."""
    service = CustomerService(db)
    return service.get_all()


@router.get("/{customer_code}", response_model=CustomerResponse)
def get_customer(customer_code: str, db: Session = Depends(get_db)):
    """Fetch a customer by code."""
    service = CustomerService(db)
    return service.get_by_id(customer_code)


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer."""
    service = CustomerService(db)
    return service.create(customer)


@router.put("/{customer_code}", response_model=CustomerResponse)
def update_customer(customer_code: str, customer: CustomerUpdate, db: Session = Depends(get_db)):
    """Update a customer."""
    service = CustomerService(db)
    return service.update(customer_code, customer)


@router.delete("/{customer_code}", status_code=204)
def delete_customer(customer_code: str, db: Session = Depends(get_db)):
    """Delete a customer."""
    service = CustomerService(db)
    service = CustomerService(db)
    service.delete(customer_code)
    return None


@router.get("/export/download")
def export_customers(format: str = "csv", db: Session = Depends(get_db)):
    """Export customers to CSV or Excel."""
    service = CustomerService(db)
    customers = service.get_all()
    # CustomerResponse has from_attributes=True, so we can use it to serialize
    data = [CustomerResponse.model_validate(c).model_dump() for c in customers]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "customers")
    return ExportService.export_to_csv(data, "customers")


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_customers(request: CustomerBulkUpsertRequest, db: Session = Depends(get_db)):
    """Bulk upsert customers by customer_code.
    
    - If a customer with the same customer_code exists, it will be updated
    - If not, a new customer will be created
    
    Returns summary with counts of created/updated/failed records.
    """
    service = CustomerService(db)
    return service.bulk_upsert(request.rows)
