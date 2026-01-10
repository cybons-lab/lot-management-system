import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inbound_models import ExpectedLot, InboundPlan, InboundPlanLine, InboundPlanStatus
from app.infrastructure.persistence.models.inventory_models import Lot
from app.infrastructure.persistence.models.masters_models import Product, Supplier

from .utils import fake


def generate_inbound_plans(db: Session, products: list[Product], suppliers: list[Supplier]):
    """Generate inbound plans: some in the future (planned), some in the past (received).
    """
    if not products or not suppliers:
        return

    today = date.today()
    
    # 1. Past Received Plans (Last 30 days)
    # We create plans and link them to existing Lots to simulate history
    lots = db.query(Lot).all()
    if lots:
        # Pick 30% of lots to have an inbound history
        for lot in random.sample(lots, int(len(lots) * 0.3)):
            supplier = db.query(Supplier).filter(Supplier.id == lot.supplier_id).first()
            if not supplier:
                supplier = random.choice(suppliers)

            arrival_date = lot.received_date
            
            plan = InboundPlan(
                plan_number=fake.unique.bothify(text="IP-PAST-#####"),
                sap_po_number=fake.unique.bothify(text="PO-#####"),
                supplier_id=supplier.id,
                planned_arrival_date=arrival_date,
                status=InboundPlanStatus.RECEIVED,
                notes="Generated from lot history"
            )
            db.add(plan)
            db.flush()

            line = InboundPlanLine(
                inbound_plan_id=plan.id,
                product_id=lot.product_id,
                planned_quantity=lot.current_quantity + Decimal("50.0"), # Original was more
                unit="pcs"
            )
            db.add(line)
            db.flush()

            expected = ExpectedLot(
                inbound_plan_line_id=line.id,
                expected_lot_number=lot.lot_number,
                expected_quantity=lot.current_quantity + Decimal("50.0"),
                expected_expiry_date=lot.expiry_date
            )
            db.add(expected)
            db.flush()
            
            # Link ExpectedLot back to Lot (1:1)
            lot.expected_lot = expected

    # 2. Future Planned Plans (Next 30 days)
    num_future_plans = 10
    for i in range(num_future_plans):
        supplier = random.choice(suppliers)
        arrival_date = today + timedelta(days=random.randint(5, 30))
        
        plan = InboundPlan(
            plan_number=fake.unique.bothify(text="IP-FUT-#####"),
            sap_po_number=fake.unique.bothify(text="PO-F#####"),
            supplier_id=supplier.id,
            planned_arrival_date=arrival_date,
            status=InboundPlanStatus.PLANNED,
            notes=fake.sentence()
        )
        db.add(plan)
        db.flush()

        # 1-3 lines per plan
        num_lines = random.randint(1, 3)
        selected_products = random.sample(products, num_lines)
        
        for p in selected_products:
            qty = Decimal(str(random.randint(100, 500)))
            line = InboundPlanLine(
                inbound_plan_id=plan.id,
                product_id=p.id,
                planned_quantity=qty,
                unit="pcs"
            )
            db.add(line)
            db.flush()

            expected = ExpectedLot(
                inbound_plan_line_id=line.id,
                expected_lot_number=fake.bothify(text="EXP-LOT-#####"),
                expected_quantity=qty,
                expected_expiry_date=arrival_date + timedelta(days=90)
            )
            db.add(expected)

    db.commit()
    print(f"[INFO] Generated inbound plans (past and future)")
