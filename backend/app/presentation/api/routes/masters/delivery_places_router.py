"""Delivery place CRUD endpoints.

Supports soft delete (validity period-based deletion) for delivery_places.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models import Customer, DeliveryPlace
from app.presentation.schemas.masters.masters_schema import (
    DeliveryPlaceCreate,
    DeliveryPlaceResponse,
    DeliveryPlaceUpdate,
)


router = APIRouter(prefix="/delivery-places", tags=["delivery-places"])


@router.get("", response_model=list[DeliveryPlaceResponse])
def list_delivery_places(
    skip: int = 0,
    limit: int = 100,
    customer_id: int | None = Query(None, description="Filter by customer ID"),
    include_inactive: bool = Query(False, description="Include soft-deleted places"),
    db: Session = Depends(get_db),
):
    """Return delivery places, optionally filtered by customer_id."""
    query = db.query(DeliveryPlace)

    # Filter out soft-deleted records by default
    if not include_inactive:
        query = query.filter(DeliveryPlace.valid_to > func.current_date())

    if customer_id is not None:
        query = query.filter(DeliveryPlace.customer_id == customer_id)

    places = query.order_by(DeliveryPlace.id).offset(skip).limit(limit).all()
    return places


@router.get("/{delivery_place_id}", response_model=DeliveryPlaceResponse)
def get_delivery_place(delivery_place_id: int, db: Session = Depends(get_db)):
    """Get a delivery place by ID."""
    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")
    return place


@router.post("", response_model=DeliveryPlaceResponse, status_code=status.HTTP_201_CREATED)
def create_delivery_place(data: DeliveryPlaceCreate, db: Session = Depends(get_db)):
    """Create a new delivery place."""
    # Check customer exists
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")

    # Check unique delivery_place_code
    existing = (
        db.query(DeliveryPlace)
        .filter(DeliveryPlace.delivery_place_code == data.delivery_place_code)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Delivery place code already exists")

    place = DeliveryPlace(**data.model_dump())
    db.add(place)
    db.commit()
    db.refresh(place)
    return place


@router.put("/{delivery_place_id}", response_model=DeliveryPlaceResponse)
def update_delivery_place(
    delivery_place_id: int, data: DeliveryPlaceUpdate, db: Session = Depends(get_db)
):
    """Update a delivery place."""
    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")

    update_data = data.model_dump(exclude_unset=True)

    # If updating customer_id, verify customer exists
    if "customer_id" in update_data and update_data["customer_id"]:
        customer = db.query(Customer).filter(Customer.id == update_data["customer_id"]).first()
        if not customer:
            raise HTTPException(status_code=400, detail="Customer not found")

    for field, value in update_data.items():
        setattr(place, field, value)

    db.commit()
    db.refresh(place)
    return place


@router.delete("/{delivery_place_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_place(
    delivery_place_id: int,
    end_date: date | None = Query(None, description="Valid until date (defaults to yesterday)"),
    db: Session = Depends(get_db),
):
    """Soft delete a delivery place by setting valid_to date."""
    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")

    # Use SoftDeleteMixin method
    place.soft_delete(end_date)
    db.commit()
    return None


@router.delete("/{delivery_place_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanent_delete_delivery_place(
    delivery_place_id: int,
    db: Session = Depends(get_db),
):
    """Permanently delete a delivery place (admin only).

    Only allowed if the place has no references in other tables.
    """
    # TODO: Add admin role check

    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")

    # Check for references in forecast_current, customer_items, etc.
    # This would fail on FK constraint if references exist
    try:
        db.delete(place)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="この納入先は他のデータから参照されているため削除できません",
        )
    return None


@router.post("/{delivery_place_id}/restore", response_model=DeliveryPlaceResponse)
def restore_delivery_place(
    delivery_place_id: int,
    db: Session = Depends(get_db),
):
    """Restore a soft-deleted delivery place."""
    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")

    # Use SoftDeleteMixin method
    place.restore()
    db.commit()
    db.refresh(place)
    return place
