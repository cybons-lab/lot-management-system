from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from app.application.services.inventory.inbound_service import InboundService
from app.infrastructure.persistence.models.inbound_models import InboundPlan, InboundPlanLine
from app.presentation.schemas.inventory.inbound_schema import (
    ExpectedLotCreate,
    InboundPlanCreate,
    InboundPlanLineCreate,
    InboundPlanUpdate,
)


def test_create_inbound_plan_success(db: Session, service_master_data):
    """Test creating a valid inbound plan."""
    service = InboundService(db)
    supplier = service_master_data["supplier"]
    product = service_master_data["product1"]

    plan_data = InboundPlanCreate(
        plan_number="IP-SVC-001",
        supplier_id=supplier.id,
        planned_arrival_date=date.today(),
        status="planned",
        lines=[
            InboundPlanLineCreate(
                product_group_id=product.id,
                planned_quantity=100,
                unit="EA",
                expected_lots=[
                    ExpectedLotCreate(
                        expected_lot_number="LOT-EXP-001",
                        expected_quantity=100,
                        expected_expiry_date=date.today() + timedelta(days=365),
                    )
                ],
            )
        ],
    )

    plan = service.create_inbound_plan(plan_data)

    assert plan.plan_number == "IP-SVC-001"
    assert plan.supplier_id == supplier.id
    assert len(plan.lines) == 1
    assert plan.lines[0].product_group_id == product.id
    assert len(plan.lines[0].expected_lots) == 1
    assert plan.lines[0].expected_lots[0].expected_lot_number == "LOT-EXP-001"


def test_get_inbound_plans_filtering(db: Session, service_master_data):
    """Test getting inbound plans with filters."""
    service = InboundService(db)
    supplier = service_master_data["supplier"]
    product1 = service_master_data["product1"]
    product2 = service_master_data["product2"]

    # Create test plans
    plan1 = InboundPlan(
        plan_number="IP-FILT-1",
        supplier_id=supplier.id,
        planned_arrival_date=date.today(),
        status="planned",
    )
    db.add(plan1)
    db.flush()

    line1 = InboundPlanLine(
        inbound_plan_id=plan1.id, product_group_id=product1.id, planned_quantity=10, unit="EA"
    )
    db.add(line1)

    plan2 = InboundPlan(
        plan_number="IP-FILT-2",
        supplier_id=supplier.id,
        planned_arrival_date=date.today() - timedelta(days=1),
        status="received",
    )
    db.add(plan2)
    db.flush()

    line2 = InboundPlanLine(
        inbound_plan_id=plan2.id, product_group_id=product2.id, planned_quantity=20, unit="KG"
    )
    db.add(line2)
    db.commit()

    # Test status filter
    plans, total = service.get_inbound_plans(status="planned")
    assert total >= 1
    assert any(p.plan_number == "IP-FILT-1" for p in plans)
    assert not any(p.plan_number == "IP-FILT-2" for p in plans)

    # Test product filter
    plans, total = service.get_inbound_plans(product_group_id=product1.id)
    assert any(p.plan_number == "IP-FILT-1" for p in plans)
    assert not any(p.plan_number == "IP-FILT-2" for p in plans)


def test_get_inbound_plan_by_id(db: Session, service_master_data):
    """Test getting inbound plan by ID."""
    service = InboundService(db)
    supplier = service_master_data["supplier"]

    plan = InboundPlan(
        plan_number="IP-GET-1", supplier_id=supplier.id, planned_arrival_date=date.today()
    )
    db.add(plan)
    db.commit()

    result = service.get_inbound_plan_by_id(plan.id)
    assert result is not None
    assert result.plan_number == "IP-GET-1"

    result = service.get_inbound_plan_by_id(99999)
    assert result is None


def test_update_inbound_plan(db: Session, service_master_data):
    """Test updating inbound plan."""
    service = InboundService(db)
    supplier = service_master_data["supplier"]

    plan = InboundPlan(
        plan_number="IP-UPD-1",
        supplier_id=supplier.id,
        planned_arrival_date=date.today(),
        status="planned",
    )
    db.add(plan)
    db.commit()

    update_data = InboundPlanUpdate(status="partially_received", notes="Updated notes")
    updated_plan = service.update_inbound_plan(plan.id, update_data)

    assert updated_plan.status == "partially_received"
    assert updated_plan.notes == "Updated notes"

    # Verify in DB
    db.refresh(plan)
    assert plan.status == "partially_received"


def test_delete_inbound_plan(db: Session, service_master_data):
    """Test deleting inbound plan."""
    service = InboundService(db)
    supplier = service_master_data["supplier"]
    product = service_master_data["product1"]

    plan = InboundPlan(
        plan_number="IP-DEL-1", supplier_id=supplier.id, planned_arrival_date=date.today()
    )
    db.add(plan)
    db.flush()

    line = InboundPlanLine(
        inbound_plan_id=plan.id, product_group_id=product.id, planned_quantity=10, unit="EA"
    )
    db.add(line)
    db.commit()

    assert service.delete_inbound_plan(plan.id) is True
    assert service.get_inbound_plan_by_id(plan.id) is None

    # Verify cascade delete (lines should be gone)
    lines = db.query(InboundPlanLine).filter(InboundPlanLine.inbound_plan_id == plan.id).all()
    assert len(lines) == 0


def test_create_line(db: Session, service_master_data):
    """Test creating a line for existing plan."""
    service = InboundService(db)
    supplier = service_master_data["supplier"]
    product = service_master_data["product1"]

    plan = InboundPlan(
        plan_number="IP-LINE-1", supplier_id=supplier.id, planned_arrival_date=date.today()
    )
    db.add(plan)
    db.commit()

    line_data = InboundPlanLineCreate(
        product_group_id=product.id,
        planned_quantity=50,
        unit="EA",
        expected_lots=[
            ExpectedLotCreate(
                expected_lot_number="LOT-LINE-1",
                expected_quantity=50,
                expected_expiry_date=date.today() + timedelta(days=100),
            )
        ],
    )

    line = service.create_line(plan.id, line_data)

    assert line.inbound_plan_id == plan.id
    assert line.product_group_id == product.id
    assert len(line.expected_lots) == 1
    assert line.expected_lots[0].expected_lot_number == "LOT-LINE-1"


def test_create_line_plan_not_found(db: Session, service_master_data):
    """Test creating line for non-existent plan raises error."""
    service = InboundService(db)
    product = service_master_data["product1"]

    line_data = InboundPlanLineCreate(product_group_id=product.id, planned_quantity=50, unit="EA")

    with pytest.raises(ValueError) as exc:
        service.create_line(99999, line_data)
    assert "not found" in str(exc.value)
