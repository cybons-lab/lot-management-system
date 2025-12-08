"""Inbound plan service layer."""

from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.application.services.inventory.inbound_line_service import InboundLineService
from app.infrastructure.persistence.models.inbound_models import InboundPlan, InboundPlanLine
from app.presentation.schemas.inventory.inbound_schema import (
    InboundPlanCreate,
    InboundPlanDetailResponse,
    InboundPlanLineCreate,
    InboundPlanLineResponse,
    InboundPlanResponse,
    InboundPlanStatus,
    InboundPlanUpdate,
)


class InboundService:
    """Business logic for inbound planning and receiving."""

    def __init__(self, db: Session):
        """Initialize inbound service.

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
        primary_supplier_ids: list[int] | None = None,
    ) -> tuple[list[InboundPlan], int]:
        """Get inbound plans with optional filtering.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            supplier_id: Filter by supplier ID
            product_id: Filter by product ID
            status: Filter by status (planned/partially_received/received/cancelled)
            primary_supplier_ids: 主担当の仕入先IDリスト。指定された場合、これらを優先表示。

        Returns:
            Tuple of (list of inbound plans, total count)
        """
        from sqlalchemy import case

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

        # ソート: 主担当優先 → 入荷予定日
        if primary_supplier_ids:
            priority_case = case(
                (InboundPlan.supplier_id.in_(primary_supplier_ids), 0),
                else_=1,
            )
            query = query.order_by(priority_case, InboundPlan.planned_arrival_date.desc())
        else:
            query = query.order_by(InboundPlan.planned_arrival_date.desc())

        plans = query.offset(skip).limit(limit).all()

        return plans, total

    def get_inbound_plan_by_id(self, plan_id: int) -> InboundPlanDetailResponse | None:
        """Get inbound plan by ID with associated lines and expected lots.

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
            status=InboundPlanStatus(plan.status),
            notes=plan.notes,
            created_at=plan.created_at,
            updated_at=plan.updated_at,
            lines=[InboundLineService(self.db).map_line_to_response(line) for line in plan.lines],
        )

    def create_inbound_plan(self, plan: InboundPlanCreate) -> InboundPlanDetailResponse:
        """Create inbound plan (with optional lines and expected lots).

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
        created_lines_responses = []
        if plan.lines:
            line_service = InboundLineService(self.db)
            for line_data in plan.lines:
                # Use internal method to avoid double verification/commit
                line_response = line_service.create_line_internal(db_plan.id, line_data)
                created_lines_responses.append(line_response)

        self.db.commit()
        self.db.refresh(db_plan)

        # Note: created_lines_responses contain IDs because create_line_internal flushed.
        # But after commit, we are good.

        return InboundPlanDetailResponse(
            id=db_plan.id,
            plan_number=db_plan.plan_number,
            supplier_id=db_plan.supplier_id,
            planned_arrival_date=db_plan.planned_arrival_date,
            status=InboundPlanStatus(db_plan.status),
            notes=db_plan.notes,
            created_at=db_plan.created_at,
            updated_at=db_plan.updated_at,
            lines=created_lines_responses,
        )

    def update_inbound_plan(
        self, plan_id: int, plan: InboundPlanUpdate
    ) -> InboundPlanResponse | None:
        """Update inbound plan.

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
            status=InboundPlanStatus(db_plan.status),
            notes=db_plan.notes,
            created_at=db_plan.created_at,
            updated_at=db_plan.updated_at,
        )

    def delete_inbound_plan(self, plan_id: int) -> bool:
        """Delete inbound plan (cascade delete lines and expected lots).

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
        """Get all inbound plan lines for a plan.

        Args:
            plan_id: Inbound plan ID

        Returns:
            List of inbound plan lines with expected lots
        """
        line_service = InboundLineService(self.db)
        return line_service.get_lines_by_plan(plan_id)

    def create_line(self, plan_id: int, line: InboundPlanLineCreate) -> InboundPlanLineResponse:
        """Create inbound plan line.

        Args:
            plan_id: Inbound plan ID
            line: Line creation data

        Returns:
            Created inbound plan line

        Raises:
            ValueError: If plan not found
        """
        line_service = InboundLineService(self.db)
        response = line_service.create_line(plan_id, line)
        self.db.commit()
        # We need to refresh the response data or ensure it's loaded?
        # InboundLineService.create_line (public) calls internal, which flushes.
        # We commit here. DB IDs are already in response.
        return response
