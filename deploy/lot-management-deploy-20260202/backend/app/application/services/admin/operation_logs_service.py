"""Operation logs service (操作ログサービス)."""

from datetime import datetime
from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.persistence.models import MasterChangeLog, OperationLog


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
        """Get operation logs with filtering and pagination.

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

        # Apply pagination
        offset = skip
        logs = (
            query.options(joinedload(OperationLog.user))
            .order_by(OperationLog.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return logs, total

    def get_by_id(self, log_id: int) -> OperationLog | None:
        """Get operation log by ID."""
        return cast(
            OperationLog | None,
            self.db.query(OperationLog).filter(OperationLog.log_id == log_id).first(),  # type: ignore[attr-defined]
        )

    def log_operation(
        self,
        user_id: int | None,
        operation_type: str,
        target_table: str,
        target_id: int | None,
        changes: dict | None = None,
        ip_address: str | None = None,
    ) -> OperationLog:
        """Create operation log.

        Note: Does not commit. Caller must commit.
        """
        log = OperationLog(
            user_id=user_id,
            operation_type=operation_type,
            target_table=target_table,
            target_id=target_id,
            changes=changes,
            ip_address=ip_address,
        )
        self.db.add(log)
        return log

    def get_filters(self) -> dict:
        """Get filter options for operation logs."""
        # 1. Users (distinct user_ids from logs, joined with user info)
        # Note: We fetch all users who have logs.
        # This query might be slow if logs are huge, but distinct user_id count is usually small.
        # Using a subquery for distinct user_id might be better.
        stmt_users = (
            select(OperationLog.user_id).where(OperationLog.user_id.is_not(None)).distinct()
        )
        user_ids = [row[0] for row in self.db.execute(stmt_users).all()]  # type: ignore[misc]

        from app.infrastructure.persistence.models.auth_models import User

        users = []
        if user_ids:
            user_objs = self.db.query(User).filter(User.id.in_(user_ids)).all()
            for u in user_objs:
                users.append({"label": u.display_name, "value": str(u.id)})

        # 2. Operation Types
        stmt_ops = (
            select(OperationLog.operation_type).distinct().order_by(OperationLog.operation_type)
        )
        ops = [row[0] for row in self.db.execute(stmt_ops).all()]  # type: ignore[misc]
        operation_types = [{"label": op, "value": op} for op in ops]

        # 3. Target Tables
        stmt_tables = (
            select(OperationLog.target_table).distinct().order_by(OperationLog.target_table)
        )
        tables = [row[0] for row in self.db.execute(stmt_tables).all()]  # type: ignore[misc]

        # Simple JP mapping (could be shared, but hardcoded here for now)
        table_map = {
            "customers": "得意先マスタ",
            "products": "商品マスタ",
            "warehouses": "倉庫マスタ",
            "suppliers": "仕入先マスタ",
            "users": "ユーザー",
            "orders": "受注データ",
            "order_lines": "受注明細",
            "allocations": "引当データ",
            "roles": "ロール",
        }
        target_tables = [{"label": table_map.get(t, t), "value": t} for t in tables]

        return {
            "users": users,
            "operation_types": operation_types,
            "target_tables": target_tables,
        }


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
        """Get master change logs with filtering and pagination.

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
            .filter(MasterChangeLog.change_log_id == change_log_id)  # type: ignore[attr-defined]
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
