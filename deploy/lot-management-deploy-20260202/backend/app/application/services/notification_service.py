from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.notification_model import Notification
from app.infrastructure.persistence.repositories.notification_repository import (
    NotificationRepository,
)
from app.presentation.schemas.notification_schema import NotificationCreate


class NotificationService:
    def __init__(self, db: Session):
        self.repository = NotificationRepository(db)

    def create_notification(self, notification: NotificationCreate) -> Notification:
        return self.repository.create(notification)

    def get_user_notifications(
        self, user_id: int, limit: int = 50, skip: int = 0
    ) -> list[Notification]:
        return self.repository.get_by_user_id(user_id, limit, skip)

    def get_unread_count(self, user_id: int) -> int:
        return self.repository.get_unread_count(user_id)

    def mark_as_read(self, notification_id: int, user_id: int) -> Notification | None:
        # Ensure the notification belongs to the user
        notification = self.repository.get(notification_id)
        if not notification or notification.user_id != user_id:
            return None

        return self.repository.mark_as_read(notification_id)

    def mark_all_as_read(self, user_id: int) -> int:
        return self.repository.mark_all_as_read(user_id)
