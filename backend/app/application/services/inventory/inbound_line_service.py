"""Inbound plan line service layer."""

from sqlalchemy.orm import Session, joinedload

from app.infrastructure.persistence.models.inbound_models import (
    ExpectedLot,
    InboundPlan,
    InboundPlanLine,
)
from app.presentation.schemas.inventory.inbound_schema import (
    ExpectedLotResponse,
    InboundPlanLineCreate,
    InboundPlanLineResponse,
)


class InboundLineService:
    """Business logic for inbound plan lines and expected lots."""

    def __init__(self, db: Session):
        """Initialize inbound line service.

        Args:
            db: Database session
        """
        self.db = db

    def map_line_to_response(self, line: InboundPlanLine) -> InboundPlanLineResponse:
        """Helper to build response object."""
        return InboundPlanLineResponse(
            id=line.id,
            inbound_plan_id=line.inbound_plan_id,
            product_group_id=line.product_group_id,
            planned_quantity=line.planned_quantity,
            unit=line.unit,
            created_at=line.created_at,
            updated_at=line.updated_at,
            expected_lots=[
                ExpectedLotResponse(
                    id=lot.id,
                    inbound_plan_line_id=lot.inbound_plan_line_id,
                    expected_lot_number=lot.expected_lot_number,
                    expected_quantity=lot.expected_quantity,
                    expected_expiry_date=lot.expected_expiry_date,
                    created_at=lot.created_at,
                    updated_at=lot.updated_at,
                )
                for lot in line.expected_lots
            ],
        )

    def get_lines_by_plan(self, plan_id: int) -> list[InboundPlanLineResponse]:
        """Get all inbound plan lines for a plan.

        Args:
            plan_id: Inbound plan ID

        Returns:
            List of inbound plan lines with expected lots
        """
        lines = (
            self.db.query(InboundPlanLine)
            .options(joinedload(InboundPlanLine.expected_lots))
            .filter(InboundPlanLine.inbound_plan_id == plan_id)
            .all()
        )

        return [self.map_line_to_response(line) for line in lines]

    def create_line(
        self, plan_id: int, line_data: InboundPlanLineCreate
    ) -> InboundPlanLineResponse:
        """Create inbound plan line (and expected lots).

        Args:
            plan_id: Inbound plan ID
            line_data: Line creation data

        Returns:
            Created inbound plan line

        Raises:
            ValueError: If plan not found
        """
        # Verify plan exists
        plan = self.db.query(InboundPlan).filter(InboundPlan.id == plan_id).first()
        if not plan:
            raise ValueError(f"Inbound plan with id={plan_id} not found")

        return self.create_line_internal(plan_id, line_data)

    def create_line_internal(
        self, plan_id: int, line_data: InboundPlanLineCreate
    ) -> InboundPlanLineResponse:
        """Internal method to create a line without re-verifying plan existence
        (for transaction reuse).
        """
        db_line = InboundPlanLine(
            inbound_plan_id=plan_id,
            product_group_id=line_data.product_group_id,
            planned_quantity=line_data.planned_quantity,
            unit=line_data.unit,
        )
        self.db.add(db_line)
        self.db.flush()  # Get line ID

        created_expected_lots = []
        if line_data.expected_lots:
            for lot_data in line_data.expected_lots:
                db_expected_lot = ExpectedLot(
                    inbound_plan_line_id=db_line.id,
                    expected_lot_number=lot_data.expected_lot_number,
                    expected_quantity=lot_data.expected_quantity,
                    expected_expiry_date=lot_data.expected_expiry_date,
                )
                self.db.add(db_expected_lot)
                created_expected_lots.append(db_expected_lot)

        db_line.expected_lots = created_expected_lots
        self.db.flush()  # Get expected lot IDs and timestamps
        return self.map_line_to_response(db_line)
