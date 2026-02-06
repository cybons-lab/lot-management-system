"""Inbound receiving service layer."""

from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.inbound_models import (
    InboundPlan,
    InboundPlanLine,
    InboundPlanStatus,
)
from app.infrastructure.persistence.models.inventory_models import (
    LotReceipt,
    StockMovement,
    StockTransactionType,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster
from app.presentation.schemas.inventory.inbound_schema import (
    InboundPlanReceiveRequest,
    InboundPlanReceiveResponse,
)


class InboundReceivingService:
    """Business logic for inbound receiving and lot generation."""

    def __init__(self, db: Session):
        """Initialize inbound receiving service.

        Args:
            db: Database session
        """
        self.db = db

    def receive_inbound_plan(
        self, plan_id: int, request: InboundPlanReceiveRequest
    ) -> InboundPlanReceiveResponse:
        """Process inbound receipt and generate lots.

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
                    # expected_lot_number が空の場合は None に設定（TMP番号は生成しない）
                    if (
                        not expected_lot.expected_lot_number
                        or expected_lot.expected_lot_number.strip() == ""
                    ):
                        lot_number = None
                    else:
                        lot_number = expected_lot.expected_lot_number

                    # Get or Create LotMaster
                    lm = self._get_or_create_lot_master(
                        lot_number, line.supplier_item_id, plan.supplier_id
                    )

                    db_lot = LotReceipt(
                        lot_master_id=lm.id,
                        supplier_item_id=line.supplier_item_id,
                        warehouse_id=default_warehouse_id,
                        supplier_id=plan.supplier_id,
                        expected_lot_id=expected_lot.id,
                        received_date=request.received_at.date(),
                        expiry_date=expected_lot.expected_expiry_date,
                        received_quantity=expected_lot.expected_quantity,
                        consumed_quantity=Decimal("0"),
                        unit=line.unit,
                        status="active",
                    )

                    self.db.add(db_lot)
                    self.db.flush()

                    # Create stock history record
                    stock_history = StockMovement(
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
                lot_number = self._generate_lot_number(plan.plan_number, line.supplier_item_id)

                # Get or Create LotMaster
                lm = self._get_or_create_lot_master(
                    lot_number, line.supplier_item_id, plan.supplier_id
                )

                db_lot = LotReceipt(
                    lot_master_id=lm.id,
                    supplier_item_id=line.supplier_item_id,
                    warehouse_id=default_warehouse_id,
                    supplier_id=plan.supplier_id,
                    expected_lot_id=None,
                    received_date=request.received_at.date(),
                    expiry_date=None,
                    received_quantity=line.planned_quantity,
                    consumed_quantity=Decimal("0"),
                    unit=line.unit,
                    status="active",
                )

                self.db.add(db_lot)
                self.db.flush()

                # Create stock history record
                stock_history = StockMovement(
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
        plan.status = InboundPlanStatus.RECEIVED
        plan.updated_at = utcnow()

        self.db.commit()

        return InboundPlanReceiveResponse(
            success=True,
            message=f"Inbound plan {plan.plan_number} received successfully. Created {len(created_lot_ids)} lot(s).",
            created_lot_ids=created_lot_ids,
        )

    def _generate_lot_number(self, plan_number: str, supplier_item_id: int) -> str:
        """Generate a unique lot number.

        Args:
            plan_number: Inbound plan number
            supplier_item_id: Product ID
        """
        # Simple implementation: plan_number + supplier_item_id + sequence
        # Count existing lots for this plan and product
        count = (
            self.db.query(func.count(LotReceipt.id))
            .join(LotMaster)
            .filter(LotMaster.lot_number.like(f"{plan_number}-{supplier_item_id}-%"))
            .scalar()
        )

        sequence = count + 1 if count else 1

        return f"{plan_number}-{supplier_item_id}-{sequence:03d}"

    def _get_or_create_lot_master(
        self, lot_number: str | None, supplier_item_id: int, supplier_id: int
    ) -> LotMaster:
        """Get existing LotMaster or create a new one.

        lot_numberがNoneの場合は常に新規作成（同じNullロットを共有しない）
        """
        lm = None
        if lot_number is not None:
            lm = (
                self.db.query(LotMaster)
                .filter(
                    LotMaster.lot_number == lot_number,
                    LotMaster.supplier_item_id == supplier_item_id,
                )
                .first()
            )

        if not lm:
            lm = LotMaster(
                lot_number=lot_number,
                supplier_item_id=supplier_item_id,
                supplier_id=supplier_id,
            )
            self.db.add(lm)
            self.db.flush()

        return lm
