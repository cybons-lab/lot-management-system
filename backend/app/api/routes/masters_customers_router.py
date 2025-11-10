"""Customer master CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Customer
from app.schemas import CustomerCreate, CustomerResponse, CustomerUpdate


router = APIRouter(prefix="/customers", tags=["masters"])


@router.get("", response_model=list[CustomerResponse])
def list_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Return customers."""
    customers = db.query(Customer).order_by(Customer.customer_code).offset(skip).limit(limit).all()
    return customers


@router.get("/{customer_code}", response_model=CustomerResponse)
def get_customer(customer_code: str, db: Session = Depends(get_db)):
    """Fetch a customer by code."""
    customer = db.query(Customer).filter(Customer.customer_code == customer_code).first()
    if not customer:
        raise HTTPException(status_code=404, detail="得意先が見つかりません")
    return customer


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer."""
    exists = db.query(Customer).filter(Customer.customer_code == customer.customer_code).first()
    if exists:
        raise HTTPException(status_code=400, detail="得意先コードが既に存在します")

    db_customer = Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.put("/{customer_code}", response_model=CustomerResponse)
def update_customer(customer_code: str, customer: CustomerUpdate, db: Session = Depends(get_db)):
    """Update a customer."""
    db_customer = db.query(Customer).filter(Customer.customer_code == customer_code).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="得意先が見つかりません")

    for key, value in customer.model_dump(exclude_unset=True).items():
        setattr(db_customer, key, value)

    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.delete("/{customer_code}", status_code=204)
def delete_customer(customer_code: str, db: Session = Depends(get_db)):
    """Delete a customer."""
    db_customer = db.query(Customer).filter(Customer.customer_code == customer_code).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="得意先が見つかりません")

    db.delete(db_customer)
    db.commit()
    return None
