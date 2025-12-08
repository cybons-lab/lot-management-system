"""Customer master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.customer_service import CustomerService
from app.core.database import get_db
from app.presentation.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    CustomerBulkUpsertRequest,
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerResponse])
def list_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Return customers."""
    service = CustomerService(db)
    return service.get_all(skip=skip, limit=limit)


@router.get("/template/download")
def download_customers_template(format: str = "csv", include_sample: bool = True):
    """Download customer import template.

    Args:
        format: 'csv' or 'xlsx' (default: csv)
        include_sample: Whether to include a sample row (default: True)

    Returns:
        Template file for customer import
    """
    return ExportService.export_template("customers", format=format, include_sample=include_sample)


@router.get("/export/download")
def export_customers(format: str = "csv", db: Session = Depends(get_db)):
    """Export customers to CSV or Excel."""
    service = CustomerService(db)
    customers = service.get_all()
    data = [CustomerResponse.model_validate(c).model_dump() for c in customers]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "customers")
    return ExportService.export_to_csv(data, "customers")


@router.get("/{customer_code}", response_model=CustomerResponse)
def get_customer(customer_code: str, db: Session = Depends(get_db)):
    """Fetch a customer by code."""
    service = CustomerService(db)
    return service.get_by_code(customer_code)


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer."""
    service = CustomerService(db)
    # Check if exists
    existing = service.get_by_code(customer.customer_code, raise_404=False)
    if existing:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer with this code already exists",
        )
    try:
        return service.create(customer)
    except Exception as e:
        from fastapi import HTTPException, status
        from sqlalchemy.exc import IntegrityError

        if isinstance(e, IntegrityError):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Customer with this code already exists",
            )
        raise e


@router.put("/{customer_code}", response_model=CustomerResponse)
def update_customer(customer_code: str, customer: CustomerUpdate, db: Session = Depends(get_db)):
    """Update a customer."""
    service = CustomerService(db)
    return service.update_by_code(customer_code, customer)


@router.delete("/{customer_code}", status_code=204)
def delete_customer(customer_code: str, db: Session = Depends(get_db)):
    """Delete a customer."""
    service = CustomerService(db)
    service.delete_by_code(customer_code)
    return None


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_customers(request: CustomerBulkUpsertRequest, db: Session = Depends(get_db)):
    """Bulk upsert customers by customer_code.

    - If a customer with the same customer_code exists, it will be updated
    - If not, a new customer will be created

    Returns summary with counts of created/updated/failed records.
    """
    service = CustomerService(db)
    return service.bulk_upsert(request.rows)
