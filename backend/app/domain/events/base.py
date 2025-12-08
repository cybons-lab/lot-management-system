# backend/app/domain/events/base.py
"""Base class for domain events."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import uuid4


@dataclass(frozen=True)
class DomainEvent:
    """ドメインイベントの基底クラス.

    全てのドメインイベントはこのクラスを継承する。
    イミュータブル（frozen=True）で、発生した事実を表現する。

    Attributes:
        event_id: イベントの一意識別子
        occurred_at: イベント発生日時（UTC）
    """

    event_id: str = field(default_factory=lambda: str(uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> dict:
        """イベントを辞書形式に変換."""
        return {
            "event_id": self.event_id,
            "event_type": self.__class__.__name__,
            "occurred_at": self.occurred_at.isoformat(),
            **{k: v for k, v in self.__dict__.items() if k not in ("event_id", "occurred_at")},
        }

    @property
    def event_type(self) -> str:
        """イベントタイプ名を返す."""
        return self.__class__.__name__
