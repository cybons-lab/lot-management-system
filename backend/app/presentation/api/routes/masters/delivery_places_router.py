"""Delivery place CRUD endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models import DeliveryPlace


router = APIRouter(prefix="/delivery-places", tags=["delivery-places"])


@router.get("")
def list_delivery_places(
    skip: int = 0,
    limit: int = 100,
    customer_id: int | None = Query(None, description="Filter by customer ID"),
    db: Session = Depends(get_db),
):
    """Return delivery places, optionally filtered by customer_id."""
    query = db.query(DeliveryPlace)

    if customer_id is not None:
        query = query.filter(DeliveryPlace.customer_id == customer_id)

    places = query.offset(skip).limit(limit).all()

    return [
        {
            "id": p.id,
            "delivery_place_code": p.delivery_place_code,
            "delivery_place_name": p.delivery_place_name,
            "customer_id": p.customer_id,
            "jiku_code": p.jiku_code,
        }
        for p in places
    ]
