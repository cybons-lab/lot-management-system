"""Inbound plan API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.inbound_schema import (
    InboundPlanCreate,
    InboundPlanDetailResponse,
    InboundPlanLineCreate,
    InboundPlanLineResponse,
    InboundPlanListResponse,
    InboundPlanReceiveRequest,
    InboundPlanReceiveResponse,
    InboundPlanResponse,
    InboundPlanUpdate,
)
from app.services.inbound_service import InboundService


router = APIRouter(prefix="/inbound-plans", tags=["inbound-plans"])


# ===== Inbound Plan Headers =====


@router.get("", response_model=InboundPlanListResponse)
def list_inbound_plans(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    supplier_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """
    入荷予定一覧取得.

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数上限
        supplier_id: 仕入先IDでフィルタ
        status: ステータスでフィルタ（planned/partially_received/received/cancelled）
        db: データベースセッション

    Returns:
        入荷予定リスト
    """
    service = InboundService(db)
    plans, total = service.get_inbound_plans(
        skip=skip,
        limit=limit,
        supplier_id=supplier_id,
        status=status,
    )

    return InboundPlanListResponse(
        items=[
            InboundPlanResponse(
                id=plan.id,
                plan_number=plan.plan_number,
                supplier_id=plan.supplier_id,
                planned_arrival_date=plan.planned_arrival_date,
                status=plan.status,
                notes=plan.notes,
                created_at=plan.created_at,
                updated_at=plan.updated_at,
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
    """
    入荷予定登録（明細も同時登録可能）.

    Args:
        plan: 入荷予定作成データ（明細含む）
        db: データベースセッション

    Returns:
        作成された入荷予定（明細含む）
    """
    service = InboundService(db)
    return service.create_inbound_plan(plan)


@router.get("/{plan_id}", response_model=InboundPlanDetailResponse)
def get_inbound_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):
    """
    入荷予定詳細取得（明細含む）.

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
    """
    入荷予定更新.

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
    """
    入荷予定削除（カスケード削除：明細も削除される）.

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
    """
    入荷予定明細一覧取得.

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
    """
    入荷予定明細追加.

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
    """
    入荷実績登録（ロット自動生成）.

    Args:
        plan_id: 入荷予定ID
        request: 入荷実績データ
        db: データベースセッション

    Returns:
        入荷実績登録結果（生成されたロットIDリスト）

    Raises:
        HTTPException: 入荷予定が見つからない場合は404
    """
    service = InboundService(db)
    try:
        result = service.receive_inbound_plan(plan_id, request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
