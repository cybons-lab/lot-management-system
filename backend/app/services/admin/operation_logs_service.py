"""Operation logs service (操作ログサービス)."""

from datetime import datetime
from typing import cast

from sqlalchemy.orm import Session

from app.models.logs_models import MasterChangeLog, OperationLog


class OperationLogService:
    """Service for operation logs (操作ログ)."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        user_id: int | None = None,
        operation_type: str | None = None,
        target_table: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> tuple[list[OperationLog], int]:
        """
        Get operation logs with filtering and pagination.

        Returns:
            tuple: (list of logs, total count)
        """
        query = self.db.query(OperationLog)

        # Apply filters
        if user_id is not None:
            query = query.filter(OperationLog.user_id == user_id)

        if operation_type:
            query = query.filter(OperationLog.operation_type == operation_type)

        if target_table:
            query = query.filter(OperationLog.target_table == target_table)

        if start_date:
            query = query.filter(OperationLog.created_at >= start_date)

        if end_date:
            query = query.filter(OperationLog.created_at <= end_date)

        # Get total count
        total = query.count()

        # Apply pagination and order
        logs = query.order_by(OperationLog.created_at.desc()).offset(skip).limit(limit).all()

        return logs, total

    def get_by_id(self, log_id: int) -> OperationLog | None:
        """Get operation log by ID."""
        return cast(
            OperationLog | None,
            self.db.query(OperationLog).filter(OperationLog.log_id == log_id).first(),
        )


class MasterChangeLogService:
    """Service for master change logs (マスタ変更履歴)."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        table_name: str | None = None,
        record_id: int | None = None,
        change_type: str | None = None,
        changed_by: int | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> tuple[list[MasterChangeLog], int]:
        """
        Get master change logs with filtering and pagination.

        Returns:
            tuple: (list of logs, total count)
        """
        query = self.db.query(MasterChangeLog)

        # Apply filters
        if table_name:
            query = query.filter(MasterChangeLog.table_name == table_name)

        if record_id is not None:
            query = query.filter(MasterChangeLog.record_id == record_id)

        if change_type:
            query = query.filter(MasterChangeLog.change_type == change_type)

        if changed_by is not None:
            query = query.filter(MasterChangeLog.changed_by == changed_by)

        if start_date:
            query = query.filter(MasterChangeLog.changed_at >= start_date)

        if end_date:
            query = query.filter(MasterChangeLog.changed_at <= end_date)

        # Get total count
        total = query.count()

        # Apply pagination and order
        logs = query.order_by(MasterChangeLog.changed_at.desc()).offset(skip).limit(limit).all()

        return logs, total

    def get_by_id(self, change_log_id: int) -> MasterChangeLog | None:
        """Get master change log by ID."""
        return cast(
            MasterChangeLog | None,
            self.db.query(MasterChangeLog)
            .filter(MasterChangeLog.change_log_id == change_log_id)
            .first(),
        )

    def get_by_record(self, table_name: str, record_id: int) -> list[MasterChangeLog]:
        """Get all change logs for a specific record."""
        return cast(
            list[MasterChangeLog],
            self.db.query(MasterChangeLog)
            .filter(
                MasterChangeLog.table_name == table_name, MasterChangeLog.record_id == record_id
            )
            .order_by(MasterChangeLog.changed_at.desc())
            .all(),
        )
