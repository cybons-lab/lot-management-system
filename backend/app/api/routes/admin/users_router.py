"""Users router (ユーザー管理API)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.system.users_schema import (
    UserCreate,
    UserResponse,
    UserRoleAssignment,
    UserUpdate,
    UserWithRoles,
)
from app.services.auth.user_service import UserService


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: bool | None = Query(None, description="有効フラグでフィルタ"),
    db: Session = Depends(get_db),
):
    """
    ユーザー一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        is_active: 有効フラグでフィルタ（オプション）
        db: データベースセッション

    Returns:
        ユーザーのリスト
    """
    service = UserService(db)
    return service.get_all(skip=skip, limit=limit, is_active=is_active)


@router.get("/{user_id}", response_model=UserWithRoles)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    ユーザー詳細取得.

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
    user_dict = UserResponse.model_validate(user).model_dump()
    user_dict["role_codes"] = role_codes

    return UserWithRoles(**user_dict)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    ユーザー作成.

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


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    """
    ユーザー更新.

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
    """
    ユーザー削除.

    Args:
        user_id: ユーザーID
        db: データベースセッション

    Raises:
        HTTPException: ユーザーが存在しない場合
    """
    service = UserService(db)
    deleted = service.delete(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return None


@router.patch("/{user_id}/roles", response_model=UserWithRoles)
def assign_user_roles(user_id: int, assignment: UserRoleAssignment, db: Session = Depends(get_db)):
    """
    ユーザーへのロール割当.

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
    user_dict = UserResponse.model_validate(user).model_dump()
    user_dict["role_codes"] = role_codes

    return UserWithRoles(**user_dict)
