"""Roles router (ロール管理API)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.system.roles_schema import RoleCreate, RoleResponse, RoleUpdate
from app.services.auth.role_service import RoleService


router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleResponse])
def list_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    ロール一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        db: データベースセッション

    Returns:
        ロールのリスト
    """
    service = RoleService(db)
    return service.get_all(skip=skip, limit=limit)


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(role_id: int, db: Session = Depends(get_db)):
    """
    ロール詳細取得.

    Args:
        role_id: ロールID
        db: データベースセッション

    Returns:
        ロール詳細

    Raises:
        HTTPException: ロールが存在しない場合
    """
    service = RoleService(db)
    role = service.get_by_id(role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(role: RoleCreate, db: Session = Depends(get_db)):
    """
    ロール作成.

    Args:
        role: 作成するロール情報
        db: データベースセッション

    Returns:
        作成されたロール

    Raises:
        HTTPException: ロールコードが既に存在する場合
    """
    service = RoleService(db)

    # Check for duplicate role code
    existing = service.get_by_code(role.role_code)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role code already exists")

    return service.create(role)


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(role_id: int, role: RoleUpdate, db: Session = Depends(get_db)):
    """
    ロール更新.

    Args:
        role_id: ロールID
        role: 更新するロール情報
        db: データベースセッション

    Returns:
        更新されたロール

    Raises:
        HTTPException: ロールが存在しない場合
    """
    service = RoleService(db)
    updated = service.update(role_id, role)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return updated


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(role_id: int, db: Session = Depends(get_db)):
    """
    ロール削除.

    Args:
        role_id: ロールID
        db: データベースセッション

    Raises:
        HTTPException: ロールが存在しない場合、またはロールが使用中の場合
    """
    service = RoleService(db)
    deleted = service.delete(role_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return None
