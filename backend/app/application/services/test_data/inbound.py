import random
from datetime import date, timedelta
from decimal import Decimal
from typing import cast

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inbound_models import (
    ExpectedLot,
    InboundPlan,
    InboundPlanLine,
    InboundPlanStatus,
)
from app.infrastructure.persistence.models.inventory_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import Supplier
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

from .scenarios.lt_scenarios import LT_SCENARIOS
from .utils import fake


def generate_inbound_plans(
    db: Session,
    products: list[SupplierItem],
    suppliers: list[Supplier],
    options: object = None,
    calendar: object = None,
):
    """Generate inbound plans: some in the future (planned), some in the past (received)."""
    if not products or not suppliers:
        return

    today = date.today()

    lt_variance_enabled = False
    if options and hasattr(options, "include_lt_variance") and options.include_lt_variance:
        lt_variance_enabled = True

    # Determine history length
    history_months = 6
    if options and hasattr(options, "history_months"):
        history_months = options.history_months

    # 1. Link Past Plans to Existing Lots (100% coverage)
    lots = db.query(LotReceipt).all()
    if lots:
        for lot in lots:
            # Skip if already linked (though clear_data should handle it)
            if lot.expected_lot:
                continue

            supplier = db.query(Supplier).filter(Supplier.id == lot.supplier_id).first()
            if not supplier:
                supplier = random.choice(suppliers)

            arrival_date = lot.received_date

            # LT Variance logic
            planned_date = arrival_date
            if (
                lt_variance_enabled or random.random() < 0.15
            ):  # 15% random chance even if option off, or force if on
                scenario_key = random.choice(list(LT_SCENARIOS.keys()))
                scenario = LT_SCENARIOS[scenario_key]
                variance = cast(int, scenario.get("variance", 0))
                planned_date = arrival_date - timedelta(days=variance)

            # Adjust planned_date to business day if calendar is provided
            if calendar and hasattr(calendar, "adjust_date"):
                planned_date = calendar.adjust_date(planned_date)

            plan = InboundPlan(
                plan_number=fake.unique.bothify(text="IP-PAST-#####"),
                sap_po_number=fake.unique.bothify(text="PO-#####"),
                supplier_id=supplier.id,
                planned_arrival_date=planned_date,
                status=InboundPlanStatus.RECEIVED,
                notes="Generated from lot history (Existing Lot)",
            )
            db.add(plan)
            db.flush()

            # Original quantity usually matches current unless consumed
            # Estimate original qty = current + consumed
            original_qty = lot.current_quantity + lot.consumed_quantity

            line = InboundPlanLine(
                inbound_plan_id=plan.id,
                supplier_item_id=lot.supplier_item_id,
                planned_quantity=original_qty,
                unit="pcs",
            )
            db.add(line)
            db.flush()

            expected = ExpectedLot(
                inbound_plan_line_id=line.id,
                expected_lot_number=lot.lot_number,
                expected_quantity=original_qty,
                expected_expiry_date=lot.expiry_date,
            )
            db.add(expected)
            db.flush()

            # Link ExpectedLot back to Lot
            lot.expected_lot = expected

    # 2. Generate "Ghost" Past Plans (Simulating archived lots)
    # To fill up the history list as requested (5 times a month * 6 months = 30 records)
    # We generate these without linked LotReceipts (as if they were archived/deleted)

    # Target: approx 3-5 plans per month per product? No, that's too many lines.
    # Target: approx 5 plans per month TOTAL or per Supplier?
    # User said "5 times a month... 30 records".
    # Let's generate ~5 plans per month for the system (spread across products).
    # If history_months = 24, that's 120 plans.

    # Scale based on options
    scale_factor = 1
    if options and getattr(options, "scale", "small") == "medium":
        scale_factor = 3
    elif options and getattr(options, "scale", "small") == "large":
        scale_factor = 10

    plans_per_month = 5 * scale_factor
    total_ghost_plans = plans_per_month * history_months

    # Limit for safety
    if total_ghost_plans > 500 and getattr(options, "scale", "small") != "large":
        total_ghost_plans = 500

    for _ in range(total_ghost_plans):
        supplier = random.choice(suppliers)
        # Random date in history
        days_ago = random.randint(1, history_months * 30)
        plan_date = today - timedelta(days=days_ago)

        if calendar and hasattr(calendar, "adjust_date"):
            plan_date = calendar.adjust_date(plan_date)

        # 10% Cancelled
        status = InboundPlanStatus.RECEIVED
        if random.random() < 0.1:
            status = InboundPlanStatus.CANCELLED

        plan = InboundPlan(
            plan_number=fake.unique.bothify(text="IP-HIST-#####"),
            sap_po_number=fake.unique.bothify(text="PO-H#####"),
            supplier_id=supplier.id,
            planned_arrival_date=plan_date,
            status=status,
            notes="Generated history (Archived/Ghost)",
        )
        db.add(plan)
        db.flush()

        # Add lines
        num_lines = random.randint(1, 3)
        selected_products = random.sample(products, num_lines)
        for p in selected_products:
            line = InboundPlanLine(
                inbound_plan_id=plan.id,
                supplier_item_id=p.id,
                planned_quantity=Decimal(str(random.randint(50, 500))),
                unit="pcs",
            )
            db.add(line)

    # 3. Future Planned Plans
    # Scale with history_months/scale too
    num_future_plans = 10 * scale_factor

    for _ in range(num_future_plans):
        supplier = random.choice(suppliers)
        # Next 3 months max
        arrival_date = today + timedelta(days=random.randint(1, 90))

        if calendar and hasattr(calendar, "adjust_date"):
            arrival_date = calendar.adjust_date(arrival_date)

        plan = InboundPlan(
            plan_number=fake.unique.bothify(text="IP-FUT-#####"),
            sap_po_number=fake.unique.bothify(text="PO-F#####"),
            supplier_id=supplier.id,
            planned_arrival_date=arrival_date,
            status=InboundPlanStatus.PLANNED,
            notes=fake.sentence(),
        )
        db.add(plan)
        db.flush()

        # 1-3 lines per plan
        num_lines = random.randint(1, 3)
        selected_products = random.sample(products, num_lines)

        for p in selected_products:
            qty = Decimal(str(random.randint(100, 500)))
            line = InboundPlanLine(
                inbound_plan_id=plan.id, supplier_item_id=p.id, planned_quantity=qty, unit="pcs"
            )
            db.add(line)
            db.flush()

            # Link ExpectedLot (50% chance)
            if random.random() < 0.5:
                expected = ExpectedLot(
                    inbound_plan_line_id=line.id,
                    expected_lot_number=fake.bothify(text="EXP-LOT-#####"),
                    expected_quantity=qty,
                    expected_expiry_date=arrival_date + timedelta(days=90),
                )
                db.add(expected)

    db.commit()
    print(
        f"[INFO] Generated inbound plans (Past: {len(lots) + total_ghost_plans}, Future: {num_future_plans})"
    )
