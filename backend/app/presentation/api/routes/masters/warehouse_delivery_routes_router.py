"""Warehouse Delivery Route master CRUD endpoints.

Manages transport lead times from warehouses to delivery places.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.masters_models import (
    DeliveryPlace,
    Warehouse,
    WarehouseDeliveryRoute,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.presentation.schemas.masters.warehouse_delivery_routes_schema import (
    TransportLeadTimeResponse,
    WarehouseDeliveryRouteCreate,
    WarehouseDeliveryRouteResponse,
    WarehouseDeliveryRouteUpdate,
)


router = APIRouter(prefix="/warehouse-delivery-routes", tags=["warehouse-delivery-routes"])


def _build_response(route: WarehouseDeliveryRoute) -> dict:
    """Build response dict with denormalized fields."""
    return {
        "id": route.id,
        "warehouse_id": route.warehouse_id,
        "delivery_place_id": route.delivery_place_id,
        "product_group_id": route.product_group_id,
        "transport_lead_time_days": route.transport_lead_time_days,
        "is_active": route.is_active,
        "notes": route.notes,
        "created_at": route.created_at,
        "updated_at": route.updated_at,
        "warehouse_code": route.warehouse.warehouse_code if route.warehouse else None,
        "warehouse_name": route.warehouse.warehouse_name if route.warehouse else None,
        "delivery_place_code": (
            route.delivery_place.delivery_place_code if route.delivery_place else None
        ),
        "delivery_place_name": (
            route.delivery_place.delivery_place_name if route.delivery_place else None
        ),
        "product_name": route.product_group.display_name if route.product_group else None,
        "maker_part_code": route.product_group.maker_part_no if route.product_group else None,
    }


@router.get("", response_model=list[WarehouseDeliveryRouteResponse])
def list_routes(
    warehouse_id: int | None = Query(None, description="Filter by warehouse ID"),
    delivery_place_id: int | None = Query(None, description="Filter by delivery place ID"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List warehouse delivery routes with optional filters."""
    query = select(WarehouseDeliveryRoute)

    if warehouse_id is not None:
        query = query.where(WarehouseDeliveryRoute.warehouse_id == warehouse_id)
    if delivery_place_id is not None:
        query = query.where(WarehouseDeliveryRoute.delivery_place_id == delivery_place_id)
    if is_active is not None:
        query = query.where(WarehouseDeliveryRoute.is_active == is_active)

    query = query.offset(skip).limit(limit)
    routes = db.execute(query).scalars().all()

    return [_build_response(r) for r in routes]


@router.get("/lookup", response_model=TransportLeadTimeResponse)
def lookup_lead_time(
    warehouse_id: int = Query(..., description="Warehouse ID"),
    delivery_place_id: int = Query(..., description="Delivery place ID"),
    product_group_id: int | None = Query(None, description="Product ID (optional)"),
    db: Session = Depends(get_db),
):
    """Lookup transport lead time with fallback logic.

    Priority:
    1. Route with matching warehouse + delivery_place + product
    2. Route default (warehouse + delivery_place + product_group_id=NULL)
    3. Warehouse default (default_transport_lead_time_days)
    4. Not found
    """
    # 1. Try product-specific route
    if product_group_id is not None:
        route = db.execute(
            select(WarehouseDeliveryRoute).where(
                and_(
                    WarehouseDeliveryRoute.warehouse_id == warehouse_id,
                    WarehouseDeliveryRoute.delivery_place_id == delivery_place_id,
                    WarehouseDeliveryRoute.product_group_id == product_group_id,
                    WarehouseDeliveryRoute.is_active == True,  # noqa: E712
                )
            )
        ).scalar_one_or_none()

        if route:
            return TransportLeadTimeResponse(
                transport_lead_time_days=route.transport_lead_time_days,
                source="route_product",
            )

    # 2. Try route default (product_group_id=NULL)
    route = db.execute(
        select(WarehouseDeliveryRoute).where(
            and_(
                WarehouseDeliveryRoute.warehouse_id == warehouse_id,
                WarehouseDeliveryRoute.delivery_place_id == delivery_place_id,
                WarehouseDeliveryRoute.product_group_id.is_(None),
                WarehouseDeliveryRoute.is_active == True,  # noqa: E712
            )
        )
    ).scalar_one_or_none()

    if route:
        return TransportLeadTimeResponse(
            transport_lead_time_days=route.transport_lead_time_days,
            source="route_default",
        )

    # 3. Try warehouse default
    warehouse = db.execute(
        select(Warehouse).where(Warehouse.id == warehouse_id)
    ).scalar_one_or_none()

    if warehouse and warehouse.default_transport_lead_time_days is not None:
        return TransportLeadTimeResponse(
            transport_lead_time_days=warehouse.default_transport_lead_time_days,
            source="warehouse_default",
        )

    # 4. Not found
    return TransportLeadTimeResponse(
        transport_lead_time_days=None,
        source="not_found",
    )


@router.get("/{route_id}", response_model=WarehouseDeliveryRouteResponse)
def get_route(route_id: int, db: Session = Depends(get_db)):
    """Get warehouse delivery route by ID."""
    route = db.execute(
        select(WarehouseDeliveryRoute).where(WarehouseDeliveryRoute.id == route_id)
    ).scalar_one_or_none()

    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route with id {route_id} not found",
        )

    return _build_response(route)


@router.post("", response_model=WarehouseDeliveryRouteResponse, status_code=201)
def create_route(
    data: WarehouseDeliveryRouteCreate,
    db: Session = Depends(get_db),
):
    """Create warehouse delivery route."""
    # Validate warehouse exists and is not supplier type
    warehouse = db.execute(
        select(Warehouse).where(Warehouse.id == data.warehouse_id)
    ).scalar_one_or_none()

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse with id {data.warehouse_id} not found",
        )

    if warehouse.warehouse_type == "supplier":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create transport route for supplier warehouse (direct shipment)",
        )

    # Validate delivery place exists
    dp = db.execute(
        select(DeliveryPlace).where(DeliveryPlace.id == data.delivery_place_id)
    ).scalar_one_or_none()

    if not dp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery place with id {data.delivery_place_id} not found",
        )

    # Validate product if specified
    if data.product_group_id is not None:
        product = db.execute(
            select(SupplierItem).where(SupplierItem.id == data.product_group_id)
        ).scalar_one_or_none()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {data.product_group_id} not found",
            )

    # Check for duplicate
    existing_query = select(WarehouseDeliveryRoute).where(
        and_(
            WarehouseDeliveryRoute.warehouse_id == data.warehouse_id,
            WarehouseDeliveryRoute.delivery_place_id == data.delivery_place_id,
        )
    )

    if data.product_group_id is not None:
        existing_query = existing_query.where(
            WarehouseDeliveryRoute.product_group_id == data.product_group_id
        )
    else:
        existing_query = existing_query.where(WarehouseDeliveryRoute.product_group_id.is_(None))

    existing = db.execute(existing_query).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Route with this warehouse, delivery place, and product already exists",
        )

    route = WarehouseDeliveryRoute(
        warehouse_id=data.warehouse_id,
        delivery_place_id=data.delivery_place_id,
        product_group_id=data.product_group_id,
        transport_lead_time_days=data.transport_lead_time_days,
        is_active=data.is_active,
        notes=data.notes,
    )

    db.add(route)
    db.commit()
    db.refresh(route)

    return _build_response(route)


@router.put("/{route_id}", response_model=WarehouseDeliveryRouteResponse)
def update_route(
    route_id: int,
    data: WarehouseDeliveryRouteUpdate,
    db: Session = Depends(get_db),
):
    """Update warehouse delivery route."""
    route = db.execute(
        select(WarehouseDeliveryRoute).where(WarehouseDeliveryRoute.id == route_id)
    ).scalar_one_or_none()

    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route with id {route_id} not found",
        )

    # exclude_unset=True: フィールドが送信されなかった場合は除外
    # さらに、NOT NULLカラム (transport_lead_time_days, is_active) に
    # null が明示的に送られた場合も除外し、500エラーを防止
    update_data = data.model_dump(exclude_unset=True)

    # transport_lead_time_days と is_active は NOT NULL カラムなのでNoneをスキップ
    if update_data.get("transport_lead_time_days") is None:
        update_data.pop("transport_lead_time_days", None)
    if update_data.get("is_active") is None:
        update_data.pop("is_active", None)

    for field, value in update_data.items():
        setattr(route, field, value)

    route.updated_at = utcnow()

    db.commit()
    db.refresh(route)

    return _build_response(route)


@router.delete("/{route_id}", status_code=204)
def delete_route(route_id: int, db: Session = Depends(get_db)):
    """Delete warehouse delivery route."""
    route = db.execute(
        select(WarehouseDeliveryRoute).where(WarehouseDeliveryRoute.id == route_id)
    ).scalar_one_or_none()

    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route with id {route_id} not found",
        )

    db.delete(route)
    db.commit()

    return None
