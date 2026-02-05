from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.application.services.notification_service import NotificationService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.schemas.notification_schema import (
    NotificationCreate,
    NotificationResponse,
    UnreadCountResponse,
)


router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_service(db: Session = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


@router.get("", response_model=list[NotificationResponse])
def get_notifications(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_service),
):
    return service.get_user_notifications(current_user.id, limit, skip)


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_service),
):
    count = service.get_unread_count(current_user.id)
    return UnreadCountResponse(count=count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_service),
):
    notification = service.mark_as_read(notification_id, current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@router.post("/mark-all-read", response_model=UnreadCountResponse)
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_service),
):
    service.mark_all_as_read(current_user.id)
    return UnreadCountResponse(count=0)


@router.post("", response_model=NotificationResponse, status_code=201)
def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_service),
):
    """通知を作成する.

    Note: 通常はシステム内部で作成されるが、
    テスト用やSmartReadテスト完了通知など、明示的に作成するケースもある。
    """
    # 他のユーザーへの通知作成を防ぐ（admin権限がない限り）
    if notification_data.user_id != current_user.id:
        # admin権限チェック
        roles = [ur.role.role_code for ur in current_user.user_roles]
        if "admin" not in roles:
            raise HTTPException(status_code=403, detail="他のユーザーへの通知は作成できません")

    notification = service.create_notification(notification_data)
    return notification
