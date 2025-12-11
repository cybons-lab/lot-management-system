"""Customer master CRUD endpoints (standalone).

Supports soft delete (valid_to based) and hard delete (admin only).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    include_inactive: bool = Query(False, description="Include soft-deleted (inactive) customers"),
    db: Session = Depends(get_db),
):
    """Return customers.

    By default, only active customers (valid_to >= today) are returned.
    Set include_inactive=true to include soft-deleted customers.
    """
    service = CustomerService(db)
    return service.get_all(skip=skip, limit=limit, include_inactive=include_inactive)


@router.get("/template/download")
def download_customers_template(format: str = "csv", include_sample: bool = True):
    """Download customer import template."""
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
    existing = service.get_by_code(customer.customer_code, raise_404=False)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer with this code already exists",
        )
    try:
        return service.create(customer)
    except Exception as e:
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
def delete_customer(
    customer_code: str,
    end_date: date | None = Query(None, description="End date for soft delete"),
    db: Session = Depends(get_db),
):
    """Soft delete customer (set valid_to to end_date or today)."""
    service = CustomerService(db)
    service.delete_by_code(customer_code, end_date=end_date)
    return None


@router.delete("/{customer_code}/permanent", status_code=204)
def permanent_delete_customer(customer_code: str, db: Session = Depends(get_db)):
    """Permanently delete customer (admin only)."""
    # TODO: Add admin role check
    service = CustomerService(db)
    service.hard_delete_by_code(customer_code)
    return None


@router.post("/{customer_code}/restore", response_model=CustomerResponse)
def restore_customer(customer_code: str, db: Session = Depends(get_db)):
    """Restore a soft-deleted customer."""
    service = CustomerService(db)
    return service.restore_by_code(customer_code)


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_customers(request: CustomerBulkUpsertRequest, db: Session = Depends(get_db)):
    """Bulk upsert customers by customer_code."""
    service = CustomerService(db)
    return service.bulk_upsert(request.rows)
