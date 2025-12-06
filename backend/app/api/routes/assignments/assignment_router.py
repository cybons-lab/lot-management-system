"""Assignment management API routes."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.routes.auth.auth_router import get_current_user
from app.models.auth_models import User
from app.schemas.assignments.assignment_schema import (
    UserSupplierAssignmentCreate,
    UserSupplierAssignmentResponse,
    UserSupplierAssignmentUpdate,
)
from app.services.assignments.assignment_service import UserSupplierAssignmentService


router = APIRouter(prefix="/assignments", tags=["assignments"])


class MySuppliersResponse(BaseModel):
    """現在のユーザーの担当仕入先ID一覧."""

    user_id: int
    primary_supplier_ids: list[int]
    all_supplier_ids: list[int]


@router.get("/my-suppliers", response_model=MySuppliersResponse)
def get_my_suppliers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MySuppliersResponse:
    """現在ログイン中のユーザーの担当仕入先ID一覧を取得."""
    service = UserSupplierAssignmentService(db)
    assignments = service.get_user_suppliers(current_user.id)

    primary_ids = [a.supplier_id for a in assignments if a.is_primary]
    all_ids = [a.supplier_id for a in assignments]

    return MySuppliersResponse(
        user_id=current_user.id,
        primary_supplier_ids=primary_ids,
        all_supplier_ids=all_ids,
    )


@router.get("", response_model=list[UserSupplierAssignmentResponse])
def get_all_assignments(
    db: Session = Depends(get_db),
) -> list[UserSupplierAssignmentResponse]:
    """全ての担当割り当てを取得."""
    service = UserSupplierAssignmentService(db)
    assignments = service.get_all()

    return [
        UserSupplierAssignmentResponse(
            id=a.id,
            user_id=a.user_id,
            supplier_id=a.supplier_id,
            is_primary=a.is_primary,
            assigned_at=a.assigned_at,
            created_at=a.created_at,
            updated_at=a.updated_at,
            username=a.user.username if a.user else None,
            user_display_name=a.user.display_name if a.user else None,
            supplier_code=a.supplier.supplier_code if a.supplier else None,
            supplier_name=a.supplier.supplier_name if a.supplier else None,
        )
        for a in assignments
    ]


@router.get("/user/{user_id}/suppliers", response_model=list[UserSupplierAssignmentResponse])
def get_user_suppliers(
    user_id: int,
    db: Session = Depends(get_db),
) -> list[UserSupplierAssignmentResponse]:
    """ユーザーの担当仕入先一覧を取得."""
    service = UserSupplierAssignmentService(db)
    assignments = service.get_user_suppliers(user_id)

    # Expand supplier information
    return [
        UserSupplierAssignmentResponse(
            id=a.id,
            user_id=a.user_id,
            supplier_id=a.supplier_id,
            is_primary=a.is_primary,
            assigned_at=a.assigned_at,
            created_at=a.created_at,
            updated_at=a.updated_at,
            supplier_code=a.supplier.supplier_code,
            supplier_name=a.supplier.supplier_name,
        )
        for a in assignments
    ]


@router.get("/supplier/{supplier_id}/users", response_model=list[UserSupplierAssignmentResponse])
def get_supplier_users(
    supplier_id: int,
    db: Session = Depends(get_db),
) -> list[UserSupplierAssignmentResponse]:
    """仕入先の担当者一覧を取得."""
    service = UserSupplierAssignmentService(db)
    assignments = service.get_supplier_users(supplier_id)

    # Expand user information
    return [
        UserSupplierAssignmentResponse(
            id=a.id,
            user_id=a.user_id,
            supplier_id=a.supplier_id,
            is_primary=a.is_primary,
            assigned_at=a.assigned_at,
            created_at=a.created_at,
            updated_at=a.updated_at,
            username=a.user.username,
            user_display_name=a.user.display_name,
        )
        for a in assignments
    ]


@router.post("/", response_model=UserSupplierAssignmentResponse)
def create_assignment(
    data: UserSupplierAssignmentCreate,
    db: Session = Depends(get_db),
) -> UserSupplierAssignmentResponse:
    """担当割り当てを作成."""
    service = UserSupplierAssignmentService(db)
    try:
        assignment = service.create_assignment(data)
        return UserSupplierAssignmentResponse(
            id=assignment.id,
            user_id=assignment.user_id,
            supplier_id=assignment.supplier_id,
            is_primary=assignment.is_primary,
            assigned_at=assignment.assigned_at,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        )
    except Exception as e:
        from app.domain.order import OrderValidationError

        raise OrderValidationError(str(e)) from e


@router.put("/{assignment_id}", response_model=UserSupplierAssignmentResponse)
def update_assignment(
    assignment_id: int,
    data: UserSupplierAssignmentUpdate,
    db: Session = Depends(get_db),
) -> UserSupplierAssignmentResponse:
    """担当割り当てを更新（主担当の変更など）."""
    service = UserSupplierAssignmentService(db)
    try:
        assignment = service.update_assignment(assignment_id, data)
        return UserSupplierAssignmentResponse(
            id=assignment.id,
            user_id=assignment.user_id,
            supplier_id=assignment.supplier_id,
            is_primary=assignment.is_primary,
            assigned_at=assignment.assigned_at,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        )
    except ValueError as e:
        from app.domain.order import OrderNotFoundError

        raise OrderNotFoundError(str(e)) from e
    except Exception as e:
        from app.domain.order import OrderValidationError

        raise OrderValidationError(str(e)) from e


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
) -> dict:
    """担当割り当てを削除."""
    service = UserSupplierAssignmentService(db)
    try:
        service.delete_assignment(assignment_id)
        return {"message": "Assignment deleted successfully"}
    except ValueError as e:
        from app.domain.order import OrderNotFoundError

        raise OrderNotFoundError(str(e)) from e
    except Exception as e:
        from app.domain.order import OrderValidationError

        raise OrderValidationError(str(e)) from e


@router.post(
    "/supplier/{supplier_id}/set-primary/{user_id}", response_model=UserSupplierAssignmentResponse
)
def set_primary_user(
    supplier_id: int,
    user_id: int,
    db: Session = Depends(get_db),
) -> UserSupplierAssignmentResponse:
    """仕入先の主担当者を設定."""
    service = UserSupplierAssignmentService(db)
    try:
        assignment = service.set_primary_assignment(user_id, supplier_id)
        return UserSupplierAssignmentResponse(
            id=assignment.id,
            user_id=assignment.user_id,
            supplier_id=assignment.supplier_id,
            is_primary=assignment.is_primary,
            assigned_at=assignment.assigned_at,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        )
    except Exception as e:
        from app.domain.order import OrderValidationError

        raise OrderValidationError(str(e)) from e
