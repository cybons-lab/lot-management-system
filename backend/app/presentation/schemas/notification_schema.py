from datetime import datetime

from pydantic import BaseModel


class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "info"
    link: str | None = None


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationUpdate(BaseModel):
    is_read: bool | None = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        """ORM mode configuration."""

        from_attributes = True


class UnreadCountResponse(BaseModel):
    count: int
