# backend/app/repositories/seed_snapshot_repo.py
"""Repository for seed snapshot operations."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.seed_snapshot_model import SeedSnapshot


class SeedSnapshotRepository:
    """スナップショットリポジトリ."""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        name: str,
        params_json: dict,
        profile_json: dict | None = None,
        summary_json: dict | None = None,
        csv_dir: str | None = None,
    ) -> SeedSnapshot:
        """スナップショットを作成."""
        snapshot = SeedSnapshot(
            name=name,
            params_json=params_json,
            profile_json=profile_json,
            summary_json=summary_json,
            csv_dir=csv_dir,
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def get_by_id(self, snapshot_id: int) -> SeedSnapshot | None:
        """IDでスナップショットを取得."""
        return self.db.execute(
            select(SeedSnapshot).where(SeedSnapshot.id == snapshot_id)
        ).scalar_one_or_none()

    def get_all(self) -> Sequence[SeedSnapshot]:
        """全スナップショットを取得（新しい順）."""
        return (
            self.db.execute(select(SeedSnapshot).order_by(desc(SeedSnapshot.created_at)))
            .scalars()
            .all()
        )

    def get_latest(self) -> SeedSnapshot | None:
        """最新のスナップショットを取得."""
        return self.db.execute(
            select(SeedSnapshot).order_by(desc(SeedSnapshot.created_at)).limit(1)
        ).scalar_one_or_none()

    def delete(self, snapshot_id: int) -> bool:
        """スナップショットを削除."""
        snapshot = self.get_by_id(snapshot_id)
        if not snapshot:
            return False
        self.db.delete(snapshot)
        self.db.commit()
        return True
