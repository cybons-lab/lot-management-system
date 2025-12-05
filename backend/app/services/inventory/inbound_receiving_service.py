"""Inbound receiving service layer."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.inbound_models import InboundPlan, InboundPlanLine
from app.models.inventory_models import Lot, StockHistory, StockTransactionType
from app.schemas.inventory.inbound_schema import (
    InboundPlanReceiveRequest,
    InboundPlanReceiveResponse,
)


class InboundReceivingService:
    """Business logic for inbound receiving and lot generation."""

    def __init__(self, db: Session):
        """
        Initialize inbound receiving service.

        Args:
            db: Database session
        """
        self.db = db

    def receive_inbound_plan(
        self, plan_id: int, request: InboundPlanReceiveRequest
    ) -> InboundPlanReceiveResponse:
        """
        Process inbound receipt and generate lots.

        Args:
            plan_id: Inbound plan ID
            request: Inbound receipt request data

        Returns:
            Inbound receipt response with created lot IDs

        Raises:
            ValueError: If plan not found or already received
        """
        # Get plan with lines and expected lots
        plan = (
            self.db.query(InboundPlan)
            .options(joinedload(InboundPlan.lines).joinedload(InboundPlanLine.expected_lots))
            .filter(InboundPlan.id == plan_id)
            .first()
        )

        if not plan:
            raise ValueError(f"Inbound plan with id={plan_id} not found")

        if plan.status == "received":
            raise ValueError(f"Inbound plan {plan.plan_number} is already received")

        if plan.status == "cancelled":
            raise ValueError(f"Inbound plan {plan.plan_number} is cancelled and cannot be received")

        created_lot_ids = []

        # Generate lots from expected lots
        # Use configured default warehouse ID
        default_warehouse_id = settings.DEFAULT_WAREHOUSE_ID

        for line in plan.lines:
            if line.expected_lots:
                # Create lots from expected lots
                for expected_lot in line.expected_lots:
                    lot_number = expected_lot.expected_lot_number or self._generate_lot_number(
                        plan.plan_number, line.product_id
                    )

                    db_lot = Lot(
                        lot_number=lot_number,
                        product_id=line.product_id,
                        warehouse_id=default_warehouse_id,
                        supplier_id=plan.supplier_id,
                        expected_lot_id=expected_lot.id,
                        received_date=request.received_at.date(),
                        expiry_date=expected_lot.expected_expiry_date,
                        current_quantity=expected_lot.expected_quantity,
                        allocated_quantity=Decimal("0"),
                        unit=line.unit,
                        status="active",
                    )

                    self.db.add(db_lot)
                    self.db.flush()

                    # Create stock history record
                    stock_history = StockHistory(
                        lot_id=db_lot.id,
                        transaction_type=StockTransactionType.INBOUND,
                        quantity_change=expected_lot.expected_quantity,
                        quantity_after=expected_lot.expected_quantity,
                        reference_type="inbound_plan",
                        reference_id=plan.id,
                        transaction_date=request.received_at,
                    )
                    self.db.add(stock_history)

                    created_lot_ids.append(db_lot.id)
            else:
                # Create a single lot from plan line (no expected lots)
                lot_number = self._generate_lot_number(plan.plan_number, line.product_id)

                db_lot = Lot(
                    lot_number=lot_number,
                    product_id=line.product_id,
                    warehouse_id=default_warehouse_id,
                    supplier_id=plan.supplier_id,
                    expected_lot_id=None,
                    received_date=request.received_at.date(),
                    expiry_date=None,
                    current_quantity=line.planned_quantity,
                    allocated_quantity=Decimal("0"),
                    unit=line.unit,
                    status="active",
                )

                self.db.add(db_lot)
                self.db.flush()

                # Create stock history record
                stock_history = StockHistory(
                    lot_id=db_lot.id,
                    transaction_type=StockTransactionType.INBOUND,
                    quantity_change=line.planned_quantity,
                    quantity_after=line.planned_quantity,
                    reference_type="inbound_plan",
                    reference_id=plan.id,
                    transaction_date=request.received_at,
                )
                self.db.add(stock_history)

                created_lot_ids.append(db_lot.id)

        # Update plan status
        plan.status = "received"  # type: ignore[assignment]
        plan.updated_at = datetime.now()

        self.db.commit()

        return InboundPlanReceiveResponse(
            success=True,
            message=f"Inbound plan {plan.plan_number} received successfully. Created {len(created_lot_ids)} lot(s).",
            created_lot_ids=created_lot_ids,
        )

    def _generate_lot_number(self, plan_number: str, product_id: int) -> str:
        """
        Generate a unique lot number.

        Args:
            plan_number: Inbound plan number
            product_id: Product ID

        Returns:
            Generated lot number
        """
        # Simple implementation: plan_number + product_id + sequence
        # Count existing lots for this plan and product
        count = (
            self.db.query(func.count(Lot.id))
            .filter(Lot.lot_number.like(f"{plan_number}-{product_id}-%"))
            .scalar()
        )

        sequence = count + 1 if count else 1

        return f"{plan_number}-{product_id}-{sequence:03d}"
