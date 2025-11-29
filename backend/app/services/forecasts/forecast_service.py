"""Forecast service for v2.4 schema (forecast_current / forecast_history)."""

from collections import defaultdict
from datetime import datetime

from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.models.forecast_models import ForecastCurrent, ForecastHistory
from app.models.orders_models import Allocation, Order, OrderLine
from app.schemas.forecasts.forecast_schema import (
    ForecastCreate,
    ForecastGroupKey,
    ForecastGroupResponse,
    ForecastHistoryResponse,
    ForecastListResponse,
    ForecastResponse,
    ForecastUpdate,
)
from app.services.common.base_service import BaseService


class ForecastService(BaseService[ForecastCurrent, ForecastCreate, ForecastUpdate]):
    """Business logic for forecast_current and forecast_history.
    
    Inherits common CRUD operations from BaseService:
    - get_by_id(forecast_id) -> ForecastCurrent (overridden as get_forecast_by_id)
    - create(payload) -> ForecastCurrent (overridden as create_forecast)
    - update(forecast_id, payload) -> ForecastCurrent (overridden as update_forecast)
    - delete(forecast_id) -> None (overridden as delete_forecast)
    
    Complex business logic (grouping, history management) is implemented below.
    """

    def __init__(self, db: Session):
        """Initialize forecast service."""
        super().__init__(db=db, model=ForecastCurrent)

    def get_forecasts(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: int | None = None,
        delivery_place_id: int | None = None,
        product_id: int | None = None,
    ) -> ForecastListResponse:
        """Get current forecasts grouped by customer × delivery_place × product."""
        query = self.db.query(ForecastCurrent).options(
            joinedload(ForecastCurrent.customer),
            joinedload(ForecastCurrent.delivery_place),
            joinedload(ForecastCurrent.product),
        )

        if customer_id is not None:
            query = query.filter(ForecastCurrent.customer_id == customer_id)
        if delivery_place_id is not None:
            query = query.filter(ForecastCurrent.delivery_place_id == delivery_place_id)
        if product_id is not None:
            query = query.filter(ForecastCurrent.product_id == product_id)

        query = query.order_by(
            ForecastCurrent.customer_id,
            ForecastCurrent.delivery_place_id,
            ForecastCurrent.product_id,
            ForecastCurrent.forecast_date,
        )

        forecasts = query.all()

        # Group by customer × delivery_place × product
        grouped: dict[tuple[int, int, int], list[ForecastCurrent]] = defaultdict(list)
        for forecast in forecasts:
            key = (forecast.customer_id, forecast.delivery_place_id, forecast.product_id)
            grouped[key].append(forecast)

        # Build response
        items: list[ForecastGroupResponse] = []
        for (cust_id, dp_id, prod_id), forecast_list in grouped.items():
            if not forecast_list:
                continue

            first = forecast_list[0]
            group_key = ForecastGroupKey(
                customer_id=cust_id,
                delivery_place_id=dp_id,
                product_id=prod_id,
                customer_code=getattr(first.customer, "customer_code", None),
                customer_name=getattr(first.customer, "customer_name", None),
                delivery_place_code=getattr(first.delivery_place, "delivery_place_code", None),
                delivery_place_name=getattr(first.delivery_place, "delivery_place_name", None),
                product_code=getattr(first.product, "maker_part_code", None),
                product_name=getattr(first.product, "product_name", None),
            )

            forecast_responses = [
                ForecastResponse(
                    id=f.id,
                    customer_id=f.customer_id,
                    delivery_place_id=f.delivery_place_id,
                    product_id=f.product_id,
                    forecast_date=f.forecast_date,
                    forecast_quantity=f.forecast_quantity,
                    unit=f.unit,
                    forecast_period=f.forecast_period,
                    snapshot_at=f.snapshot_at,
                    created_at=f.created_at,
                    updated_at=f.updated_at,
                    customer_code=getattr(f.customer, "customer_code", None),
                    customer_name=getattr(f.customer, "customer_name", None),
                    delivery_place_code=getattr(f.delivery_place, "delivery_place_code", None),
                    delivery_place_name=getattr(f.delivery_place, "delivery_place_name", None),
                    product_code=getattr(f.product, "maker_part_code", None),
                    product_name=getattr(f.product, "product_name", None),
                )
                for f in forecast_list
            ]

            # Fetch related orders for this group
            related_orders_query = (
                self.db.query(Order)
                .join(OrderLine)
                .filter(
                    and_(
                        Order.customer_id == cust_id,
                        OrderLine.product_id == prod_id,
                        OrderLine.delivery_place_id == dp_id,
                    )
                )
                .options(
                    joinedload(Order.order_lines).selectinload(OrderLine.product),
                    joinedload(Order.order_lines)
                    .selectinload(OrderLine.allocations)
                    .joinedload(Allocation.lot),
                    joinedload(Order.customer),
                )
                .distinct()
            )
            related_orders = related_orders_query.all()

            # Convert to OrderWithLinesResponse
            from app.schemas.orders.orders_schema import OrderWithLinesResponse

            related_orders_responses = [
                OrderWithLinesResponse.model_validate(order) for order in related_orders
            ]

            # Populate additional info using OrderService
            from app.services.orders.order_service import OrderService

            order_service = OrderService(self.db)
            order_service._populate_additional_info(related_orders_responses)

            items.append(
                ForecastGroupResponse(
                    group_key=group_key,
                    forecasts=forecast_responses,
                    snapshot_at=first.snapshot_at,
                    related_orders=related_orders_responses,
                )
            )

        # Apply pagination
        total = len(items)
        paginated_items = items[skip : skip + limit]

        return ForecastListResponse(items=paginated_items, total=total)

    def get_forecast_by_id(self, forecast_id: int) -> ForecastResponse | None:
        """Get single forecast entry by ID."""
        forecast = (
            self.db.query(ForecastCurrent)
            .options(
                joinedload(ForecastCurrent.customer),
                joinedload(ForecastCurrent.delivery_place),
                joinedload(ForecastCurrent.product),
            )
            .filter(ForecastCurrent.id == forecast_id)
            .first()
        )

        if not forecast:
            return None

        return ForecastResponse(
            id=forecast.id,
            customer_id=forecast.customer_id,
            delivery_place_id=forecast.delivery_place_id,
            product_id=forecast.product_id,
            forecast_date=forecast.forecast_date,
            forecast_quantity=forecast.forecast_quantity,
            unit=forecast.unit,
            forecast_period=forecast.forecast_period,
            snapshot_at=forecast.snapshot_at,
            created_at=forecast.created_at,
            updated_at=forecast.updated_at,
            customer_code=getattr(forecast.customer, "customer_code", None),
            customer_name=getattr(forecast.customer, "customer_name", None),
            delivery_place_code=getattr(forecast.delivery_place, "delivery_place_code", None),
            delivery_place_name=getattr(forecast.delivery_place, "delivery_place_name", None),
            product_code=getattr(forecast.product, "maker_part_code", None),
            product_name=getattr(forecast.product, "product_name", None),
        )

    def create_forecast(self, data: ForecastCreate) -> ForecastResponse:
        """Create a new forecast entry."""
        db_forecast = ForecastCurrent(
            customer_id=data.customer_id,
            delivery_place_id=data.delivery_place_id,
            product_id=data.product_id,
            forecast_date=data.forecast_date,
            forecast_quantity=data.forecast_quantity,
            unit=data.unit,
            forecast_period=data.forecast_period,
        )

        self.db.add(db_forecast)
        self.db.commit()
        self.db.refresh(db_forecast)

        return self.get_forecast_by_id(db_forecast.id)  # type: ignore

    def update_forecast(self, forecast_id: int, data: ForecastUpdate) -> ForecastResponse | None:
        """Update a forecast entry."""
        db_forecast = (
            self.db.query(ForecastCurrent).filter(ForecastCurrent.id == forecast_id).first()
        )

        if not db_forecast:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_forecast, key, value)

        db_forecast.updated_at = datetime.now()

        self.db.commit()
        self.db.refresh(db_forecast)

        return self.get_forecast_by_id(forecast_id)

    def delete_forecast(self, forecast_id: int) -> bool:
        """Delete a forecast entry."""
        db_forecast = (
            self.db.query(ForecastCurrent).filter(ForecastCurrent.id == forecast_id).first()
        )

        if not db_forecast:
            return False

        self.db.delete(db_forecast)
        self.db.commit()

        return True

    def get_history(
        self,
        customer_id: int | None = None,
        delivery_place_id: int | None = None,
        product_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ForecastHistoryResponse]:
        """Get forecast history."""
        query = self.db.query(ForecastHistory)

        if customer_id is not None:
            query = query.filter(ForecastHistory.customer_id == customer_id)
        if delivery_place_id is not None:
            query = query.filter(ForecastHistory.delivery_place_id == delivery_place_id)
        if product_id is not None:
            query = query.filter(ForecastHistory.product_id == product_id)

        query = query.order_by(ForecastHistory.archived_at.desc())
        history = query.offset(skip).limit(limit).all()

        return [
            ForecastHistoryResponse(
                id=h.id,
                customer_id=h.customer_id,
                delivery_place_id=h.delivery_place_id,
                product_id=h.product_id,
                forecast_date=h.forecast_date,
                forecast_quantity=h.forecast_quantity,
                unit=h.unit,
                forecast_period=h.forecast_period,
                snapshot_at=h.snapshot_at,
                archived_at=h.archived_at,
                created_at=h.created_at,
                updated_at=h.updated_at,
            )
            for h in history
        ]
