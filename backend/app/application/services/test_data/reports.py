"""Report test data generator."""

from __future__ import annotations

import calendar
import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import DeliveryPlace, Warehouse
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

from .utils import fake


def generate_monthly_report_samples(db: Session) -> None:
    """Generate sample allocation suggestions for monthly report visibility."""
    today = date.today()
    period_prefix = f"{today.year:04d}-{today.month:02d}"
    days_in_month = calendar.monthrange(today.year, today.month)[1]

    warehouse = db.query(Warehouse).order_by(Warehouse.warehouse_code.asc()).first()
    product = db.query(SupplierItem).order_by(SupplierItem.maker_part_no.asc()).first()
    delivery_places = db.query(DeliveryPlace).order_by(DeliveryPlace.id.asc()).limit(3).all()

    if not warehouse or not product or not delivery_places:
        return

    lots = (
        db.query(LotReceipt)
        .filter(
            LotReceipt.supplier_item_id == product.id,
            LotReceipt.warehouse_id == warehouse.id,
        )
        .order_by(LotReceipt.id.asc())
        .limit(2)
        .all()
    )

    if not lots:
        received_date = today - timedelta(days=3)
        expiry_date = today + timedelta(days=180)
        lot_number = fake.unique.bothify(text="REP-########")
        master = LotMaster(
            lot_number=lot_number,
            supplier_item_id=product.id,
            supplier_id=product.supplier_id,
            first_receipt_date=received_date,
            latest_expiry_date=expiry_date,
        )
        db.add(master)
        db.flush()

        lot = LotReceipt(
            lot_master_id=master.id,
            supplier_item_id=product.id,
            warehouse_id=warehouse.id,
            supplier_id=product.supplier_id,
            received_date=received_date,
            expiry_date=expiry_date,
            received_quantity=Decimal("500"),
            consumed_quantity=Decimal("0"),
            unit=product.base_unit or "pcs",
            status="active",
            locked_quantity=Decimal("0"),
        )
        db.add(lot)
        db.flush()
        lots = [lot]

    day_candidates = [5, 15, min(25, days_in_month)]

    for idx, dp in enumerate(delivery_places):
        for day in day_candidates[:2]:
            forecast_period = f"{period_prefix}-{day:02d}"
            quantity = Decimal(random.choice([50, 80, 120]))
            lot = lots[idx % len(lots)]

            suggestion = AllocationSuggestion(
                forecast_id=None,
                order_line_id=None,
                customer_id=dp.customer_id,
                delivery_place_id=dp.id,
                supplier_item_id=product.id,
                lot_id=lot.id,
                quantity=quantity,
                priority=0,
                allocation_type="soft",
                source="report_sample",
                forecast_period=forecast_period,
            )
            db.add(suggestion)

    db.commit()
