"""API v2 Reservation router."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import LotReservation
from app.presentation.api.deps import get_db
from app.presentation.schemas.common.base import BaseSchema


router = APIRouter()


class ReservationResponse(BaseSchema):
    id: int
    lot_id: int
    source_type: str
    source_id: int | None = None
    reserved_qty: float
    status: str
    expires_at: str | None = None
    confirmed_at: str | None = None
    released_at: str | None = None


@router.get("/", response_model=list[ReservationResponse])
async def list_reservations(db: Session = Depends(get_db)):
    reservations = db.query(LotReservation).order_by(LotReservation.id.desc()).all()
    return [ReservationResponse.model_validate(r) for r in reservations]


@router.get("/by-lot/{lot_id}", response_model=list[ReservationResponse])
async def reservations_by_lot(lot_id: int, db: Session = Depends(get_db)):
    reservations = (
        db.query(LotReservation)
        .filter(LotReservation.lot_id == lot_id)
        .order_by(LotReservation.id.desc())
        .all()
    )
    return [ReservationResponse.model_validate(r) for r in reservations]


@router.get("/by-source/{source_type}/{source_id}", response_model=list[ReservationResponse])
async def reservations_by_source(source_type: str, source_id: int, db: Session = Depends(get_db)):
    reservations = (
        db.query(LotReservation)
        .filter(LotReservation.source_type == source_type, LotReservation.source_id == source_id)
        .order_by(LotReservation.id.desc())
        .all()
    )
    return [ReservationResponse.model_validate(r) for r in reservations]
