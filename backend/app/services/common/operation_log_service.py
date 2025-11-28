# backend/app/services/common/operation_log_service.py
"""
操作ログサービス.

重要な操作をDBに記録し、監査証跡を提供。
"""

import logging
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.logs_models import OperationLog


logger = logging.getLogger(__name__)


class OperationLogService:
    """操作ログサービス.

    CRUD操作、認証、エクスポートなどの重要な操作をDBに記録。
    """

    def __init__(self, db: Session):
        """初期化.

        Args:
            db: DBセッション
        """
        self.db = db

    def log_operation(
        self,
        operation_type: str,
        target_table: str,
        target_id: int | None = None,
        user_id: int | None = None,
        changes: dict | None = None,
        ip_address: str | None = None,
    ) -> OperationLog:
        """操作ログを記録.

        Args:
            operation_type: 操作タイプ（create, update, delete, login, logout, export）
            target_table: 対象テーブル名
            target_id: 対象レコードID
            user_id: ユーザーID
            changes: 変更内容（JSON形式）
            ip_address: IPアドレス

        Returns:
            作成された操作ログ
        """
        log_entry = OperationLog(
            user_id=user_id,
            operation_type=operation_type,
            target_table=target_table,
            target_id=target_id,
            changes=changes,
            ip_address=ip_address,
        )

        self.db.add(log_entry)
        self.db.flush()

        logger.info(
            f"Operation logged: {operation_type} on {target_table}",
            extra={
                "operation_type": operation_type,
                "target_table": target_table,
                "target_id": target_id,
                "user_id": user_id,
                "log_id": log_entry.id,
            },
        )

        return log_entry

    def log_create(
        self,
        target_table: str,
        target_id: int,
        user_id: int | None = None,
        data: dict | None = None,
        ip_address: str | None = None,
    ) -> OperationLog:
        """作成操作をログ記録.

        Args:
            target_table: 対象テーブル名
            target_id: 作成されたレコードID
            user_id: ユーザーID
            data: 作成されたデータ
            ip_address: IPアドレス

        Returns:
            作成された操作ログ
        """
        changes = {"new_values": data} if data else None
        return self.log_operation(
            operation_type="create",
            target_table=target_table,
            target_id=target_id,
            user_id=user_id,
            changes=changes,
            ip_address=ip_address,
        )

    def log_update(
        self,
        target_table: str,
        target_id: int,
        user_id: int | None = None,
        old_values: dict | None = None,
        new_values: dict | None = None,
        ip_address: str | None = None,
    ) -> OperationLog:
        """更新操作をログ記録.

        Args:
            target_table: 対象テーブル名
            target_id: 更新されたレコードID
            user_id: ユーザーID
            old_values: 変更前の値
            new_values: 変更後の値
            ip_address: IPアドレス

        Returns:
            作成された操作ログ
        """
        changes = {}
        if old_values:
            changes["old_values"] = old_values
        if new_values:
            changes["new_values"] = new_values

        return self.log_operation(
            operation_type="update",
            target_table=target_table,
            target_id=target_id,
            user_id=user_id,
            changes=changes if changes else None,
            ip_address=ip_address,
        )

    def log_delete(
        self,
        target_table: str,
        target_id: int,
        user_id: int | None = None,
        data: dict | None = None,
        ip_address: str | None = None,
    ) -> OperationLog:
        """削除操作をログ記録.

        Args:
            target_table: 対象テーブル名
            target_id: 削除されたレコードID
            user_id: ユーザーID
            data: 削除されたデータ
            ip_address: IPアドレス

        Returns:
            作成された操作ログ
        """
        changes = {"deleted_values": data} if data else None
        return self.log_operation(
            operation_type="delete",
            target_table=target_table,
            target_id=target_id,
            user_id=user_id,
            changes=changes,
            ip_address=ip_address,
        )

    def log_login(
        self,
        user_id: int,
        ip_address: str | None = None,
        success: bool = True,
    ) -> OperationLog:
        """ログイン操作をログ記録.

        Args:
            user_id: ユーザーID
            ip_address: IPアドレス
            success: ログイン成功/失敗

        Returns:
            作成された操作ログ
        """
        return self.log_operation(
            operation_type="login",
            target_table="users",
            target_id=user_id,
            user_id=user_id,
            changes={"success": success},
            ip_address=ip_address,
        )

    def log_logout(
        self,
        user_id: int,
        ip_address: str | None = None,
    ) -> OperationLog:
        """ログアウト操作をログ記録.

        Args:
            user_id: ユーザーID
            ip_address: IPアドレス

        Returns:
            作成された操作ログ
        """
        return self.log_operation(
            operation_type="logout",
            target_table="users",
            target_id=user_id,
            user_id=user_id,
            ip_address=ip_address,
        )

    def log_export(
        self,
        target_table: str,
        user_id: int | None = None,
        export_format: str | None = None,
        record_count: int | None = None,
        ip_address: str | None = None,
    ) -> OperationLog:
        """エクスポート操作をログ記録.

        Args:
            target_table: エクスポート対象テーブル
            user_id: ユーザーID
            export_format: エクスポート形式（CSV, Excel, PDFなど）
            record_count: エクスポートしたレコード数
            ip_address: IPアドレス

        Returns:
            作成された操作ログ
        """
        changes = {}
        if export_format:
            changes["format"] = export_format
        if record_count is not None:
            changes["record_count"] = record_count

        return self.log_operation(
            operation_type="export",
            target_table=target_table,
            user_id=user_id,
            changes=changes if changes else None,
            ip_address=ip_address,
        )

    def get_operation_logs(
        self,
        user_id: int | None = None,
        operation_type: str | None = None,
        target_table: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[OperationLog]:
        """操作ログを取得.

        Args:
            user_id: ユーザーIDでフィルタ
            operation_type: 操作タイプでフィルタ
            target_table: 対象テーブルでフィルタ
            start_date: 開始日時
            end_date: 終了日時
            limit: 取得件数
            offset: オフセット

        Returns:
            操作ログのリスト
        """
        query = self.db.query(OperationLog)

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

        query = query.order_by(OperationLog.created_at.desc())
        query = query.limit(limit).offset(offset)

        return query.all()

    def count_operation_logs(
        self,
        user_id: int | None = None,
        operation_type: str | None = None,
        target_table: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> int:
        """操作ログ件数を取得.

        Args:
            user_id: ユーザーIDでフィルタ
            operation_type: 操作タイプでフィルタ
            target_table: 対象テーブルでフィルタ
            start_date: 開始日時
            end_date: 終了日時

        Returns:
            操作ログ件数
        """
        query = self.db.query(func.count(OperationLog.id))

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

        return query.scalar() or 0
