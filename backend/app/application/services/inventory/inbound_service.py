"""Inbound plan service layer.

【設計意図】入荷計画サービスの設計判断:

1. 担当仕入先の優先表示（L86-93）
   理由: ユーザーの業務フローに合わせた表示順
   → 営業担当者は、自分が主担当の仕入先を優先的に確認したい
   実装:
   - assigned_supplier_ids が指定された場合、SQL の CASE式で優先度をつける
   - case((supplier_id IN (...), 0), else_=1) → 主担当は0、それ以外は1
   - ORDER BY priority_case ASC → 0が先に表示される
   → その後、入荷予定日の降順でソート

2. distinct() の使用（L68-69）
   理由: lines テーブルとJOINすると、1つのInboundPlanが複数行返される
   例:
   - InboundPlan (id=1) に lines が3行ある場合
   - JOINすると、InboundPlan (id=1) が3回返される
   → distinct() で重複を除外し、1行のみ返す

3. count_query の分離（L71-83）
   理由: total件数取得時に joinedload を使わない
   → joinedload はEager Loading（関連データを事前取得）
   → count()では関連データ不要 → 無駄なJOINを避ける
   パフォーマンス: count_query は軽量、データ取得は別クエリで実行

4. joinedload(InboundPlan.lines) の使用
   理由: N+1問題を回避
   → 各InboundPlanに対してlinesを取得する場合、N回のクエリが発生
   → joinedloadで1回のクエリで取得（LEFT OUTER JOIN）
   メリット: 100件のInboundPlanがあっても、SQLは2回のみ（count + select）
"""

from sqlalchemy.orm import Session, joinedload

from app.application.services.inventory.inbound_line_service import InboundLineService
from app.core.time_utils import utcnow
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
        product_group_id: int | None = None,
        status: str | None = None,
        assigned_supplier_ids: list[int] | None = None,
    ) -> tuple[list[InboundPlan], int]:
        """Get inbound plans with optional filtering.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            supplier_id: Filter by supplier ID
            product_group_id: Filter by product ID
            status: Filter by status (planned/partially_received/received/cancelled)
            assigned_supplier_ids: 主担当の仕入先IDリスト。指定された場合、これらを優先表示。

        Returns:
            Tuple of (list of inbound plans, total count)
        """
        from sqlalchemy import case

        query = self.db.query(InboundPlan).options(
            joinedload(InboundPlan.lines), joinedload(InboundPlan.supplier)
        )

        if supplier_id is not None:
            query = query.filter(InboundPlan.supplier_id == supplier_id)

        if product_group_id is not None:
            query = query.join(InboundPlan.lines).filter(
                InboundPlanLine.product_group_id == product_group_id
            )

        if status is not None:
            query = query.filter(InboundPlan.status == status)

        # Distinct is needed if joining with lines to avoid duplicates
        # 【設計】linesとJOINすると重複行が発生 → distinct()で除外
        if product_group_id is not None:
            query = query.distinct()

        # Count total before applying pagination (using subquery without joinedload)
        # 【設計】count用クエリはjoinedloadを使わず、軽量に実行
        count_query = self.db.query(InboundPlan)
        if supplier_id is not None:
            count_query = count_query.filter(InboundPlan.supplier_id == supplier_id)
        if product_group_id is not None:
            count_query = (
                count_query.join(InboundPlan.lines)
                .filter(InboundPlanLine.product_group_id == product_group_id)
                .distinct()
            )
        if status is not None:
            count_query = count_query.filter(InboundPlan.status == status)
        total = count_query.count()

        # ソート: 担当仕入先優先 → 入荷予定日
        # 【設計】CASE式で主担当仕入先を優先表示（priority_case=0が先頭）
        if assigned_supplier_ids:
            priority_case = case(
                (InboundPlan.supplier_id.in_(assigned_supplier_ids), 0),
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
            supplier_name=plan.supplier.supplier_name if plan.supplier else None,
            supplier_code=plan.supplier.supplier_code if plan.supplier else None,
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

        db_plan.updated_at = utcnow()

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
