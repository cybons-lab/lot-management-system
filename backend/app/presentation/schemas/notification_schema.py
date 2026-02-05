from datetime import datetime
from typing import Literal

from pydantic import BaseModel


DisplayStrategy = Literal["immediate", "deferred", "persistent"]


class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "info"
    link: str | None = None
    display_strategy: DisplayStrategy = "immediate"


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationUpdate(BaseModel):
    is_read: bool | None = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    display_strategy: DisplayStrategy
    created_at: datetime

    class Config:
        """ORM mode configuration."""

        from_attributes = True


class UnreadCountResponse(BaseModel):
    count: int
