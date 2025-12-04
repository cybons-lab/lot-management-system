"""Inbound plan service layer."""

from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models.inbound_models import ExpectedLot, InboundPlan, InboundPlanLine
from app.schemas.inventory.inbound_schema import (
    ExpectedLotResponse,
    InboundPlanCreate,
    InboundPlanDetailResponse,
    InboundPlanLineCreate,
    InboundPlanLineResponse,
    InboundPlanResponse,
    InboundPlanUpdate,
)


class InboundService:
    """Business logic for inbound planning and receiving."""

    def __init__(self, db: Session):
        """
        Initialize inbound service.

        Args:
            db: Database session
        """
        self.db = db

    # ===== Inbound Plan Operations =====

    def get_inbound_plans(
        self,
        skip: int = 0,
        limit: int = 100,
        supplier_id: int | None = None,
        product_id: int | None = None,
        status: str | None = None,
    ) -> tuple[list[InboundPlan], int]:
        """
        Get inbound plans with optional filtering.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            supplier_id: Filter by supplier ID
            product_id: Filter by product ID
            status: Filter by status (planned/partially_received/received/cancelled)

        Returns:
            Tuple of (list of inbound plans, total count)
        """
        query = self.db.query(InboundPlan).options(joinedload(InboundPlan.lines))

        if supplier_id is not None:
            query = query.filter(InboundPlan.supplier_id == supplier_id)

        if product_id is not None:
            query = query.join(InboundPlan.lines).filter(InboundPlanLine.product_id == product_id)

        if status is not None:
            query = query.filter(InboundPlan.status == status)

        # Distinct is needed if joining with lines to avoid duplicates
        if product_id is not None:
            query = query.distinct()

        # Count total before applying pagination (using subquery without joinedload)
        count_query = self.db.query(InboundPlan)
        if supplier_id is not None:
            count_query = count_query.filter(InboundPlan.supplier_id == supplier_id)
        if product_id is not None:
            count_query = (
                count_query.join(InboundPlan.lines)
                .filter(InboundPlanLine.product_id == product_id)
                .distinct()
            )
        if status is not None:
            count_query = count_query.filter(InboundPlan.status == status)
        total = count_query.count()

        query = query.order_by(InboundPlan.planned_arrival_date.desc())
        plans = query.offset(skip).limit(limit).all()

        return plans, total

    def get_inbound_plan_by_id(self, plan_id: int) -> InboundPlanDetailResponse | None:
        """
        Get inbound plan by ID with associated lines and expected lots.

        Args:
            plan_id: Inbound plan ID

        Returns:
            Inbound plan with lines and expected lots, or None if not found
        """
        plan = (
            self.db.query(InboundPlan)
            .options(joinedload(InboundPlan.lines).joinedload(InboundPlanLine.expected_lots))
            .filter(InboundPlan.id == plan_id)
            .first()
        )

        if not plan:
            return None

        # Convert to response schema
        return InboundPlanDetailResponse(
            id=plan.id,
            plan_number=plan.plan_number,
            supplier_id=plan.supplier_id,
            planned_arrival_date=plan.planned_arrival_date,
            status=plan.status,
            notes=plan.notes,
            created_at=plan.created_at,
            updated_at=plan.updated_at,
            lines=[
                InboundPlanLineResponse(
                    id=line.id,
                    inbound_plan_id=line.inbound_plan_id,
                    product_id=line.product_id,
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
                for line in plan.lines
            ],
        )

    def create_inbound_plan(self, plan: InboundPlanCreate) -> InboundPlanDetailResponse:
        """
        Create inbound plan (with optional lines and expected lots).

        Args:
            plan: Inbound plan creation data

        Returns:
            Created inbound plan with lines and expected lots
        """
        # Create plan
        db_plan = InboundPlan(
            plan_number=plan.plan_number,
            supplier_id=plan.supplier_id,
            planned_arrival_date=plan.planned_arrival_date,
            status=plan.status,
            notes=plan.notes,
        )

        self.db.add(db_plan)
        self.db.flush()  # Get plan ID

        # Create lines if provided
        created_lines = []
        if plan.lines:
            for line_data in plan.lines:
                db_line = InboundPlanLine(
                    inbound_plan_id=db_plan.id,
                    product_id=line_data.product_id,
                    planned_quantity=line_data.planned_quantity,
                    unit=line_data.unit,
                )
                self.db.add(db_line)
                self.db.flush()  # Get line ID

                # Create expected lots if provided
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
                created_lines.append(db_line)

        self.db.commit()
        self.db.refresh(db_plan)

        # Refresh lines and expected lots to get IDs
        for line in created_lines:
            self.db.refresh(line)
            for expected_lot in line.expected_lots:
                self.db.refresh(expected_lot)

        return InboundPlanDetailResponse(
            id=db_plan.id,
            plan_number=db_plan.plan_number,
            supplier_id=db_plan.supplier_id,
            planned_arrival_date=db_plan.planned_arrival_date,
            status=db_plan.status,
            notes=db_plan.notes,
            created_at=db_plan.created_at,
            updated_at=db_plan.updated_at,
            lines=[
                InboundPlanLineResponse(
                    id=line.id,
                    inbound_plan_id=line.inbound_plan_id,
                    product_id=line.product_id,
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
                for line in created_lines
            ],
        )

    def update_inbound_plan(
        self, plan_id: int, plan: InboundPlanUpdate
    ) -> InboundPlanResponse | None:
        """
        Update inbound plan.

        Args:
            plan_id: Inbound plan ID
            plan: Update data

        Returns:
            Updated inbound plan, or None if not found
        """
        db_plan = self.db.query(InboundPlan).filter(InboundPlan.id == plan_id).first()

        if not db_plan:
            return None

        # Update fields
        update_data = plan.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_plan, key, value)

        db_plan.updated_at = datetime.now()

        self.db.commit()
        self.db.refresh(db_plan)

        return InboundPlanResponse(
            id=db_plan.id,
            plan_number=db_plan.plan_number,
            supplier_id=db_plan.supplier_id,
            planned_arrival_date=db_plan.planned_arrival_date,
            status=db_plan.status,
            notes=db_plan.notes,
            created_at=db_plan.created_at,
            updated_at=db_plan.updated_at,
        )

    def delete_inbound_plan(self, plan_id: int) -> bool:
        """
        Delete inbound plan (cascade delete lines and expected lots).

        Args:
            plan_id: Inbound plan ID

        Returns:
            True if deleted, False if not found
        """
        db_plan = self.db.query(InboundPlan).filter(InboundPlan.id == plan_id).first()

        if not db_plan:
            return False

        self.db.delete(db_plan)
        self.db.commit()

        return True

    # ===== Inbound Plan Line Operations =====

    def get_lines_by_plan(self, plan_id: int) -> list[InboundPlanLineResponse]:
        """
        Get all inbound plan lines for a plan.

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

        return [
            InboundPlanLineResponse(
                id=line.id,
                inbound_plan_id=line.inbound_plan_id,
                product_id=line.product_id,
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
            for line in lines
        ]

    def create_line(self, plan_id: int, line: InboundPlanLineCreate) -> InboundPlanLineResponse:
        """
        Create inbound plan line.

        Args:
            plan_id: Inbound plan ID
            line: Line creation data

        Returns:
            Created inbound plan line

        Raises:
            ValueError: If plan not found
        """
        # Verify plan exists
        plan = self.db.query(InboundPlan).filter(InboundPlan.id == plan_id).first()

        if not plan:
            raise ValueError(f"Inbound plan with id={plan_id} not found")

        db_line = InboundPlanLine(
            inbound_plan_id=plan_id,
            product_id=line.product_id,
            planned_quantity=line.planned_quantity,
            unit=line.unit,
        )

        self.db.add(db_line)
        self.db.flush()

        # Create expected lots if provided
        created_expected_lots = []
        if line.expected_lots:
            for lot_data in line.expected_lots:
                db_expected_lot = ExpectedLot(
                    inbound_plan_line_id=db_line.id,
                    expected_lot_number=lot_data.expected_lot_number,
                    expected_quantity=lot_data.expected_quantity,
                    expected_expiry_date=lot_data.expected_expiry_date,
                )
                self.db.add(db_expected_lot)
                created_expected_lots.append(db_expected_lot)

        self.db.commit()
        self.db.refresh(db_line)

        for expected_lot in created_expected_lots:
            self.db.refresh(expected_lot)

        return InboundPlanLineResponse(
            id=db_line.id,
            inbound_plan_id=db_line.inbound_plan_id,
            product_id=db_line.product_id,
            planned_quantity=db_line.planned_quantity,
            unit=db_line.unit,
            created_at=db_line.created_at,
            updated_at=db_line.updated_at,
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
                for lot in created_expected_lots
            ],
        )
