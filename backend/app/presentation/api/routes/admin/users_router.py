"""Users router (ユーザー管理API)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.auth.user_service import UserService
from app.application.services.common.export_service import ExportService
from app.core.database import get_db
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.system.users_schema import (
    SystemUserResponse,
    UserCreate,
    UserRoleAssignment,
    UserUpdate,
    UserWithRoles,
)


router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(get_current_admin)])


@router.get("/template/download")
def download_users_template(format: str = "xlsx", include_sample: bool = True):
    """Download user import template.

    Args:
        format: 'csv' or 'xlsx' (default: xlsx)
        include_sample: Whether to include a sample row (default: True)

    Returns:
        Template file for user import
    """
    return ExportService.export_template("users", format=format, include_sample=include_sample)


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def bulk_create_users(
    users: list[UserCreate],
    db: Session = Depends(get_db),
):
    """ユーザー一括登録.

    Args:
        users: 登録するユーザーのリスト
        db: データベースセッション

    Returns:
        登録結果のサマリー
    """
    service = UserService(db)
    created_count = 0
    skipped_count = 0
    errors = []

    for user_data in users:
        try:
            # Check for duplicate username
            existing_user = service.get_by_username(user_data.username)
            if existing_user:
                skipped_count += 1
                errors.append(f"Username '{user_data.username}' already exists")
                continue

            # Check for duplicate email
            existing_email = service.get_by_email(user_data.email)
            if existing_email:
                skipped_count += 1
                errors.append(f"Email '{user_data.email}' already exists")
                continue

            service.create(user_data)
            created_count += 1
        except Exception as e:
            skipped_count += 1
            errors.append(f"Failed to create user '{user_data.username}': {str(e)}")

    return {
        "created": created_count,
        "skipped": skipped_count,
        "errors": errors[:10],  # Limit errors to first 10
    }


@router.get("", response_model=list[SystemUserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: bool | None = Query(None, description="有効フラグでフィルタ"),
    db: Session = Depends(get_db),
):
    """ユーザー一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        is_active: 有効フラグでフィルタ（オプション）
        db: データベースセッション

    Returns:
        ユーザーのリスト
    """
    service = UserService(db)
    include_inactive = is_active is None or not is_active
    return service.get_all(skip=skip, limit=limit, include_inactive=include_inactive)


@router.get("/{user_id}", response_model=UserWithRoles)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """ユーザー詳細取得.

    Args:
        user_id: ユーザーID
        db: データベースセッション

    Returns:
        ユーザー詳細（ロール情報含む）

    Raises:
        HTTPException: ユーザーが存在しない場合
    """
    service = UserService(db)
    user = service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Add role codes
    role_codes = service.get_user_roles(user_id)
    user_dict = SystemUserResponse.model_validate(user).model_dump()
    user_dict["role_codes"] = role_codes

    return UserWithRoles(**user_dict)


@router.post("", response_model=SystemUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """ユーザー作成.

    Args:
        user: 作成するユーザー情報
        db: データベースセッション

    Returns:
        作成されたユーザー

    Raises:
        HTTPException: ユーザー名またはメールアドレスが既に存在する場合
    """
    service = UserService(db)

    # Check for duplicate username
    existing_user = service.get_by_username(user.username)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    # Check for duplicate email
    existing_email = service.get_by_email(user.email)
    if existing_email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    return service.create(user)


@router.put("/{user_id}", response_model=SystemUserResponse)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    """ユーザー更新.

    Args:
        user_id: ユーザーID
        user: 更新するユーザー情報
        db: データベースセッション

    Returns:
        更新されたユーザー

    Raises:
        HTTPException: ユーザーが存在しない場合
    """
    service = UserService(db)
    updated = service.update(user_id, user)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """ユーザー削除.

    Args:
        user_id: ユーザーID
        db: データベースセッション

    Raises:
        HTTPException: ユーザーが存在しない場合
    """
    service = UserService(db)
    service.delete(user_id)
    return None


@router.patch("/{user_id}/roles", response_model=UserWithRoles)
def assign_user_roles(user_id: int, assignment: UserRoleAssignment, db: Session = Depends(get_db)):
    """ユーザーへのロール割当.

    Args:
        user_id: ユーザーID
        assignment: 割り当てるロールID
        db: データベースセッション

    Returns:
        ロール割り当て後のユーザー情報

    Raises:
        HTTPException: ユーザーが存在しない場合
    """
    service = UserService(db)
    user = service.assign_roles(user_id, assignment)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Add role codes
    role_codes = service.get_user_roles(user_id)
    user_dict = SystemUserResponse.model_validate(user).model_dump()
    user_dict["role_codes"] = role_codes

    return UserWithRoles(**user_dict)


@router.get("/export/download")
def export_users(format: str = "csv", db: Session = Depends(get_db)):
    """Export users to CSV or Excel."""
    service = UserService(db)
    users = service.get_all()
    data = [SystemUserResponse.model_validate(u).model_dump() for u in users]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "users")
    return ExportService.export_to_csv(data, "users")
