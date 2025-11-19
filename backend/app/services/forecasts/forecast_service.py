"""Forecast service for v2.4 schema (forecast_current / forecast_history)."""

from collections import defaultdict
from datetime import datetime

from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.models.forecast_models import ForecastCurrent, ForecastHistory
from app.models.masters_models import Customer, DeliveryPlace, Product
from app.schemas.forecasts.forecast_schema import (
    ForecastBulkImportItem,
    ForecastBulkImportSummary,
    ForecastCreate,
    ForecastGroupKey,
    ForecastGroupResponse,
    ForecastHistoryResponse,
    ForecastListResponse,
    ForecastResponse,
    ForecastUpdate,
)


class ForecastService:
    """Business logic for forecast_current and forecast_history."""

    def __init__(self, db: Session):
        """Initialize forecast service."""
        self.db = db

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

            items.append(
                ForecastGroupResponse(
                    group_key=group_key,
                    forecasts=forecast_responses,
                    snapshot_at=first.snapshot_at,
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
                snapshot_at=h.snapshot_at,
                archived_at=h.archived_at,
                created_at=h.created_at,
                updated_at=h.updated_at,
            )
            for h in history
        ]

    def bulk_import(
        self, items: list[ForecastBulkImportItem], replace_existing: bool = True
    ) -> ForecastBulkImportSummary:
        """Bulk import forecasts from CSV-like data.

        When replace_existing is True:
        1. Move existing forecast_current rows to forecast_history
        2. Insert new snapshot into forecast_current
        """
        errors: list[str] = []
        imported_count = 0
        archived_count = 0
        skipped_count = 0

        # Resolve codes to IDs
        code_to_id: dict[str, dict[str, int]] = {
            "customer": {},
            "delivery_place": {},
            "product": {},
        }

        # Load all customers
        customers = self.db.query(Customer).all()
        for c in customers:
            code_to_id["customer"][c.customer_code] = c.id

        # Load all delivery places
        delivery_places = self.db.query(DeliveryPlace).all()
        for dp in delivery_places:
            code_to_id["delivery_place"][dp.delivery_place_code] = dp.id

        # Load all products
        products = self.db.query(Product).all()
        for p in products:
            code_to_id["product"][p.maker_part_code] = p.id

        # Group items by customer × delivery_place × product
        grouped: dict[tuple[int, int, int], list[ForecastBulkImportItem]] = defaultdict(list)

        for i, item in enumerate(items):
            # Resolve codes to IDs
            customer_id = code_to_id["customer"].get(item.customer_code)
            if customer_id is None:
                errors.append(f"Row {i + 1}: Unknown customer_code '{item.customer_code}'")
                skipped_count += 1
                continue

            delivery_place_id = code_to_id["delivery_place"].get(item.delivery_place_code)
            if delivery_place_id is None:
                errors.append(
                    f"Row {i + 1}: Unknown delivery_place_code '{item.delivery_place_code}'"
                )
                skipped_count += 1
                continue

            product_id = code_to_id["product"].get(item.product_code)
            if product_id is None:
                errors.append(f"Row {i + 1}: Unknown product_code '{item.product_code}'")
                skipped_count += 1
                continue

            key = (customer_id, delivery_place_id, product_id)
            grouped[key].append(item)

        # Process each group
        snapshot_at = datetime.now()

        for (customer_id, delivery_place_id, product_id), group_items in grouped.items():
            if replace_existing:
                # Archive existing forecasts
                existing = (
                    self.db.query(ForecastCurrent)
                    .filter(
                        and_(
                            ForecastCurrent.customer_id == customer_id,
                            ForecastCurrent.delivery_place_id == delivery_place_id,
                            ForecastCurrent.product_id == product_id,
                        )
                    )
                    .all()
                )

                for existing_fc in existing:
                    # Move to history
                    history = ForecastHistory(
                        customer_id=existing_fc.customer_id,
                        delivery_place_id=existing_fc.delivery_place_id,
                        product_id=existing_fc.product_id,
                        forecast_date=existing_fc.forecast_date,
                        forecast_quantity=existing_fc.forecast_quantity,
                        unit=existing_fc.unit,
                        snapshot_at=existing_fc.snapshot_at,
                        created_at=existing_fc.created_at,
                        updated_at=existing_fc.updated_at,
                    )
                    self.db.add(history)
                    self.db.delete(existing_fc)
                    archived_count += 1

            # Insert new forecasts
            for item in group_items:
                db_forecast = ForecastCurrent(
                    customer_id=customer_id,
                    delivery_place_id=delivery_place_id,
                    product_id=code_to_id["product"][item.product_code],
                    forecast_date=item.forecast_date,
                    forecast_quantity=item.forecast_quantity,
                    unit=item.unit,
                    snapshot_at=snapshot_at,
                )
                self.db.add(db_forecast)
                imported_count += 1

        self.db.commit()

        return ForecastBulkImportSummary(
            imported_count=imported_count,
            archived_count=archived_count,
            skipped_count=skipped_count,
            errors=errors,
        )
