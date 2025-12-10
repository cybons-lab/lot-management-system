"""API v2 Order router."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.orders.order_import_service import (
    OrderImportService,
    OrderLineInput,
)
from app.application.services.orders.order_service import OrderService
from app.core.database import get_db
from app.presentation.schemas.common.base import BaseSchema
from app.presentation.schemas.orders.orders_schema import (
    OrderCreate,
    OrderWithLinesResponse,
)
from pydantic import Field

router = APIRouter()


class OrderImportLine(BaseSchema):
    customer_order_no: str = Field(..., max_length=20)
    quantity: Decimal
    unit: str
    requested_date: date | None = None
    delivery_date: date | None = None
    customer_order_line_no: str | None = None


class OrderImportRequest(BaseSchema):
    customer_code: str
    product_code: str
    order_date: date
    order_id: int
    delivery_place_id: int
    lines: list[OrderImportLine]
    source_file_name: str | None = None


class OrderImportResponse(BaseSchema):
    order_group_id: int | None = None
    created_line_ids: list[int] = Field(default_factory=list)
    skipped_customer_order_nos: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


@router.get("/", response_model=list[OrderWithLinesResponse])
async def list_orders(
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    customer_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    order_type: str | None = None,
    db: Session = Depends(get_db),
):
    service = OrderService(db)
    return service.get_orders(
        skip=skip,
        limit=limit,
        status=status,
        customer_code=customer_code,
        date_from=date_from,
        date_to=date_to,
        order_type=order_type,
    )


@router.get("/{order_id}", response_model=OrderWithLinesResponse)
async def get_order(order_id: int, db: Session = Depends(get_db)):
    service = OrderService(db)
    return service.get_order_detail(order_id)


@router.post("/", response_model=OrderWithLinesResponse, status_code=status.HTTP_201_CREATED)
async def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    service = OrderService(db)
    created = service.create_order(order)
    db.commit()
    return created


@router.post("/import", response_model=OrderImportResponse)
async def import_orders(payload: OrderImportRequest, db: Session = Depends(get_db)):
    service = OrderImportService(db)
    line_inputs = [
        OrderLineInput(
            customer_order_no=line.customer_order_no,
            quantity=line.quantity,
            unit=line.unit,
            requested_date=line.requested_date,
            delivery_date=line.delivery_date,
            customer_order_line_no=line.customer_order_line_no,
        )
        for line in payload.lines
    ]

    result = service.import_order_lines(
        customer_code=payload.customer_code,
        product_code=payload.product_code,
        order_date=payload.order_date,
        lines=line_inputs,
        order_id=payload.order_id,
        delivery_place_id=payload.delivery_place_id,
        source_file_name=payload.source_file_name,
        skip_existing=True,
    )

    db.commit()

    if result.errors:
        raise HTTPException(status_code=400, detail=result.errors)

    return OrderImportResponse(
        order_group_id=result.order_group.id if result.order_group else None,
        created_line_ids=[line.id for line in result.created_lines],
        skipped_customer_order_nos=result.skipped_lines,
        errors=result.errors,
    )
