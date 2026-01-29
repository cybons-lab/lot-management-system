"""Forecast import service layer."""

from collections import defaultdict

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.forecast_models import ForecastCurrent, ForecastHistory
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    DeliveryPlace,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.presentation.schemas.forecasts.forecast_schema import (
    ForecastBulkImportItem,
    ForecastBulkImportSummary,
)


class ForecastImportService:
    """Business logic for forecast bulk import."""

    def __init__(self, db: Session):
        """Initialize forecast import service."""
        self.db = db

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
        products = self.db.query(SupplierItem).all()
        for p in products:
            code_to_id["product"][p.maker_part_no] = p.id

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

            product_group_id = code_to_id["product"].get(item.product_code)
            if product_group_id is None:
                errors.append(f"Row {i + 1}: Unknown product_code '{item.product_code}'")
                skipped_count += 1
                continue

            key = (customer_id, delivery_place_id, product_group_id)
            grouped[key].append(item)

        # Process each group
        snapshot_at = utcnow()

        for (customer_id, delivery_place_id, product_group_id), group_items in grouped.items():
            if replace_existing:
                # Archive existing forecasts
                existing = (
                    self.db.query(ForecastCurrent)
                    .filter(
                        and_(
                            ForecastCurrent.customer_id == customer_id,
                            ForecastCurrent.delivery_place_id == delivery_place_id,
                            ForecastCurrent.product_group_id == product_group_id,
                        )
                    )
                    .all()
                )

                for existing_fc in existing:
                    # Move to history
                    history = ForecastHistory(
                        customer_id=existing_fc.customer_id,
                        delivery_place_id=existing_fc.delivery_place_id,
                        product_group_id=existing_fc.product_group_id,
                        forecast_date=existing_fc.forecast_date,
                        forecast_quantity=existing_fc.forecast_quantity,
                        unit=existing_fc.unit,
                        forecast_period=existing_fc.forecast_period,
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
                    product_group_id=code_to_id["product"][item.product_code],
                    forecast_date=item.forecast_date,
                    forecast_quantity=item.forecast_quantity,
                    unit=item.unit,
                    forecast_period=item.forecast_period,
                    snapshot_at=snapshot_at,
                )
                self.db.add(db_forecast)
                imported_count += 1

        self.db.commit()

        # Trigger allocation suggestion regeneration
        if imported_count > 0:
            # Import here to avoid circular dependency
            from app.application.services.allocations.suggestion import (
                AllocationSuggestionService,
            )

            # Collect unique periods
            periods = list({item.forecast_period for item in items})
            if periods:
                service = AllocationSuggestionService(self.db)
                service.regenerate_for_periods(periods)

        return ForecastBulkImportSummary(
            imported_count=imported_count,
            archived_count=archived_count,
            skipped_count=skipped_count,
            errors=errors,
        )
