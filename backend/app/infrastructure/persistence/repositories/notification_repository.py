from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.notification_model import Notification
from app.presentation.schemas.notification_schema import NotificationCreate


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, notification: NotificationCreate) -> Notification:
        db_notification = Notification(
            user_id=notification.user_id,
            title=notification.title,
            message=notification.message,
            type=notification.type,
            link=notification.link,
            display_strategy=notification.display_strategy,
            is_read=False,
        )
        self.db.add(db_notification)
        self.db.commit()
        self.db.refresh(db_notification)
        return db_notification

    def get_by_user_id(self, user_id: int, limit: int = 50, skip: int = 0) -> list[Notification]:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(desc(Notification.created_at), desc(Notification.id))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_unread_count(self, user_id: int) -> int:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
            .count()
        )

    def get(self, notification_id: int) -> Notification | None:
        return self.db.query(Notification).filter(Notification.id == notification_id).first()

    def mark_as_read(self, notification_id: int) -> Notification | None:
        notification = self.get(notification_id)
        if notification is None:
            return None
        (
            self.db.query(Notification)
            .filter(Notification.id == notification_id)
            .update({Notification.is_read: True}, synchronize_session=False)
        )
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_as_read(self, user_id: int) -> int:
        # returns count of updated rows
        rows = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
            .update({Notification.is_read: True}, synchronize_session=False)
        )
        self.db.commit()
        return rows
