"""Inbound plan API endpoints."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.assignments.assignment_service import UserSupplierAssignmentService
from app.application.services.inventory.inbound_receiving_service import InboundReceivingService
from app.application.services.inventory.inbound_service import InboundService
from app.application.services.sap.sap_service import SAPService
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.schemas.inventory.inbound_schema import (
    InboundPlanCreate,
    InboundPlanDetailResponse,
    InboundPlanLineCreate,
    InboundPlanLineResponse,
    InboundPlanListResponse,
    InboundPlanReceiveRequest,
    InboundPlanReceiveResponse,
    InboundPlanResponse,
    InboundPlanStatus,
    InboundPlanUpdate,
    SAPSyncRequest,
    SAPSyncResponse,
)


router = APIRouter(prefix="/inbound-plans", tags=["inbound-plans"])


# ===== Inbound Plan Headers =====


@router.get("", response_model=InboundPlanListResponse)
def list_inbound_plans(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    supplier_id: int | None = None,
    product_group_id: int | None = None,
    status: str | None = None,
    prioritize_primary: bool = True,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """入荷予定一覧取得.

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数上限
        supplier_id: 仕入先IDでフィルタ
        product_group_id: 商品IDでフィルタ
        status: ステータスでフィルタ（planned/partially_received/received/cancelled）
        prioritize_primary: 主担当の仕入先を優先表示するかどうか（デフォルト: True）
        current_user: 現在のログインユーザー（主担当仕入先取得に使用）
        db: データベースセッション

    Returns:
        入荷予定リスト
    """
    # 主担当の仕入先IDを取得
    primary_supplier_ids: list[int] | None = None
    if prioritize_primary and current_user:
        assignment_service = UserSupplierAssignmentService(db)
        assignments = assignment_service.get_user_suppliers(current_user.id)
        primary_supplier_ids = [a.supplier_id for a in assignments if a.is_primary]

    service = InboundService(db)
    plans, total = service.get_inbound_plans(
        skip=skip,
        limit=limit,
        supplier_id=supplier_id,
        product_group_id=product_group_id,
        status=status,
        primary_supplier_ids=primary_supplier_ids,
    )

    return InboundPlanListResponse(
        items=[
            InboundPlanResponse(
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
                total_quantity=Decimal(str(sum(line.planned_quantity for line in plan.lines)))
                if plan.lines
                else Decimal("0"),
                is_primary_supplier=plan.supplier_id in (primary_supplier_ids or []),
            )
            for plan in plans
        ],
        total=total,
    )


@router.post(
    "",
    response_model=InboundPlanDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inbound_plan(
    plan: InboundPlanCreate,
    db: Session = Depends(get_db),
):
    """入荷予定登録（明細も同時登録可能）.

    Args:
        plan: 入荷予定作成データ（明細含む）
        db: データベースセッション

    Returns:
        作成された入荷予定（明細含む）
    """
    service = InboundService(db)
    return service.create_inbound_plan(plan)


# ===== SAP Integration =====
# NOTE: Must be defined BEFORE /{plan_id} routes to avoid path conflicts


@router.post(
    "/sync-from-sap",
    response_model=SAPSyncResponse,
    status_code=status.HTTP_201_CREATED,
)
def sync_from_sap(
    request: SAPSyncRequest,
    db: Session = Depends(get_db),
):
    """SAP から発注データを取得して入荷予定を作成.

    SAP の発注データ（モック）を取得し、入荷予定（InboundPlan）として
    システムに登録します。既に存在する発注番号はスキップされます。

    Args:
        request: SAP同期リクエスト（現在パラメータなし）
        db: データベースセッション

    Returns:
        SAP同期結果（作成された入荷予定リスト、スキップ数）

    Note:
        現在はモック実装です。本番環境では実際のSAP RFC/APIに接続します。
    """
    sap_service = SAPService(db)
    try:
        created_plans, skipped_count = sap_service.sync_purchase_orders_to_inbound_plans()

        message = f"SAP同期完了: {len(created_plans)}件作成"
        if skipped_count > 0:
            message += f", {skipped_count}件スキップ（既存）"

        return SAPSyncResponse(
            success=True,
            message=message,
            created_plans=created_plans,
            skipped_count=skipped_count,
        )
    except Exception as e:
        import logging

        logging.getLogger(__name__).exception(f"SAP同期エラー: {e}")
        raise  # Let global handler format the response


@router.get("/{plan_id}", response_model=InboundPlanDetailResponse)
def get_inbound_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):
    """入荷予定詳細取得（明細含む）.

    Args:
        plan_id: 入荷予定ID
        db: データベースセッション

    Returns:
        入荷予定（明細含む）

    Raises:
        HTTPException: 入荷予定が見つからない場合は404
    """
    service = InboundService(db)
    plan = service.get_inbound_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inbound plan with id={plan_id} not found",
        )
    return plan


@router.put("/{plan_id}", response_model=InboundPlanResponse)
def update_inbound_plan(
    plan_id: int,
    plan: InboundPlanUpdate,
    db: Session = Depends(get_db),
):
    """入荷予定更新.

    Args:
        plan_id: 入荷予定ID
        plan: 更新データ
        db: データベースセッション

    Returns:
        更新後の入荷予定

    Raises:
        HTTPException: 入荷予定が見つからない場合は404
    """
    service = InboundService(db)
    updated = service.update_inbound_plan(plan_id, plan)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inbound plan with id={plan_id} not found",
        )
    return updated


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inbound_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):
    """入荷予定削除（カスケード削除：明細も削除される）.

    Args:
        plan_id: 入荷予定ID
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: 入荷予定が見つからない場合は404
    """
    service = InboundService(db)
    deleted = service.delete_inbound_plan(plan_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inbound plan with id={plan_id} not found",
        )
    return None


# ===== Inbound Plan Lines =====


@router.get("/{plan_id}/lines", response_model=list[InboundPlanLineResponse])
def list_inbound_plan_lines(
    plan_id: int,
    db: Session = Depends(get_db),
):
    """入荷予定明細一覧取得.

    Args:
        plan_id: 入荷予定ID
        db: データベースセッション

    Returns:
        入荷予定明細のリスト
    """
    service = InboundService(db)
    return service.get_lines_by_plan(plan_id)


@router.post(
    "/{plan_id}/lines",
    response_model=InboundPlanLineResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inbound_plan_line(
    plan_id: int,
    line: InboundPlanLineCreate,
    db: Session = Depends(get_db),
):
    """入荷予定明細追加.

    Args:
        plan_id: 入荷予定ID
        line: 明細作成データ
        db: データベースセッション

    Returns:
        作成された明細

    Raises:
        HTTPException: 入荷予定が見つからない場合は404
    """
    service = InboundService(db)
    return service.create_line(plan_id, line)


# ===== Inbound Receipt =====


@router.post(
    "/{plan_id}/receive",
    response_model=InboundPlanReceiveResponse,
    status_code=status.HTTP_201_CREATED,
)
def receive_inbound_plan(
    plan_id: int,
    request: InboundPlanReceiveRequest,
    db: Session = Depends(get_db),
):
    """入荷実績登録（ロット自動生成）.

    Args:
        plan_id: 入荷予定ID
        request: 入荷実績データ
        db: データベースセッション

    Returns:
        入荷実績登録結果（生成されたロットIDリスト）

    Raises:
        HTTPException: 入荷予定が見つからない場合は404
    """
    service = InboundReceivingService(db)
    try:
        result = service.receive_inbound_plan(plan_id, request)
        return result
    except ValueError as e:
        from app.domain.order import OrderValidationError

        raise OrderValidationError(str(e)) from e
