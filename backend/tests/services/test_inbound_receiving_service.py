from datetime import date, datetime, timedelta
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.application.services.inventory.inbound_receiving_service import InboundReceivingService
from app.infrastructure.persistence.models.inbound_models import (
    ExpectedLot,
    InboundPlan,
    InboundPlanLine,
)
from app.infrastructure.persistence.models.inventory_models import Lot, StockHistory
from app.presentation.schemas.inventory.inbound_schema import InboundPlanReceiveRequest


def test_receive_inbound_plan_with_expected_lots(db: Session, service_master_data):
    """Test receiving a plan with expected lots."""
    service = InboundReceivingService(db)
    supplier = service_master_data["supplier"]
    product = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]

    # Create plan with expected lots
    plan = InboundPlan(
        plan_number="IP-RCV-001",
        supplier_id=supplier.id,
        planned_arrival_date=date.today(),
        status="planned",
    )
    db.add(plan)
    db.flush()

    line = InboundPlanLine(
        inbound_plan_id=plan.id, product_id=product.id, planned_quantity=100, unit="EA"
    )
    db.add(line)
    db.flush()

    expected_lot = ExpectedLot(
        inbound_plan_line_id=line.id,
        expected_lot_number="LOT-RCV-001",
        expected_quantity=100,
        expected_expiry_date=date.today() + timedelta(days=365),
    )
    db.add(expected_lot)
    db.commit()

    request = InboundPlanReceiveRequest(received_at=datetime.now())

    # Mock settings.DEFAULT_WAREHOUSE_ID
    with patch(
        "app.application.services.inventory.inbound_receiving_service.settings"
    ) as mock_settings:
        mock_settings.DEFAULT_WAREHOUSE_ID = warehouse.id

        response = service.receive_inbound_plan(plan.id, request)

        assert response.success is True
        assert len(response.created_lot_ids) == 1

        # Verify lot creation
        lot = db.query(Lot).filter(Lot.id == response.created_lot_ids[0]).first()
        assert lot.lot_number == "LOT-RCV-001"
        assert lot.current_quantity == 100
        assert lot.warehouse_id == warehouse.id
        assert lot.status == "active"

        # Verify stock history
        history = db.query(StockHistory).filter(StockHistory.lot_id == lot.id).first()
        assert history.transaction_type == "inbound"
        assert history.quantity_change == 100

        # Verify plan status
        db.refresh(plan)
        assert plan.status == "received"


def test_receive_inbound_plan_without_expected_lots(db: Session, service_master_data):
    """Test receiving a plan without expected lots (auto lot generation)."""
    service = InboundReceivingService(db)
    supplier = service_master_data["supplier"]
    product = service_master_data["product1"]
    warehouse = service_master_data["warehouse"]

    # Create plan without expected lots
    plan = InboundPlan(
        plan_number="IP-RCV-AUTO",
        supplier_id=supplier.id,
        planned_arrival_date=date.today(),
        status="planned",
    )
    db.add(plan)
    db.flush()

    line = InboundPlanLine(
        inbound_plan_id=plan.id, product_id=product.id, planned_quantity=50, unit="EA"
    )
    db.add(line)
    db.commit()

    request = InboundPlanReceiveRequest(received_at=datetime.now())

    with patch(
        "app.application.services.inventory.inbound_receiving_service.settings"
    ) as mock_settings:
        mock_settings.DEFAULT_WAREHOUSE_ID = warehouse.id

        response = service.receive_inbound_plan(plan.id, request)

        assert response.success is True
        assert len(response.created_lot_ids) == 1

        lot = db.query(Lot).filter(Lot.id == response.created_lot_ids[0]).first()
        # Lot number should be generated: plan_number-product_id-001
        assert lot.lot_number == f"IP-RCV-AUTO-{product.id}-001"
        assert lot.current_quantity == 50


def test_receive_inbound_plan_not_found(db: Session):
    """Test receiving non-existent plan."""
    service = InboundReceivingService(db)
    request = InboundPlanReceiveRequest(received_at=datetime.now())

    with pytest.raises(ValueError) as exc:
        service.receive_inbound_plan(99999, request)
    assert "not found" in str(exc.value)


def test_receive_inbound_plan_already_received(db: Session, service_master_data):
    """Test receiving already received plan."""
    service = InboundReceivingService(db)
    supplier = service_master_data["supplier"]

    plan = InboundPlan(
        plan_number="IP-RCV-DONE",
        supplier_id=supplier.id,
        planned_arrival_date=date.today(),
        status="received",
    )
    db.add(plan)
    db.commit()

    request = InboundPlanReceiveRequest(received_at=datetime.now())

    with pytest.raises(ValueError) as exc:
        service.receive_inbound_plan(plan.id, request)
    assert "already received" in str(exc.value)


def test_receive_inbound_plan_cancelled(db: Session, service_master_data):
    """Test receiving cancelled plan."""
    service = InboundReceivingService(db)
    supplier = service_master_data["supplier"]

    plan = InboundPlan(
        plan_number="IP-RCV-CNCL",
        supplier_id=supplier.id,
        planned_arrival_date=date.today(),
        status="cancelled",
    )
    db.add(plan)
    db.commit()

    request = InboundPlanReceiveRequest(received_at=datetime.now())

    with pytest.raises(ValueError) as exc:
        service.receive_inbound_plan(plan.id, request)
    assert "cancelled" in str(exc.value)
