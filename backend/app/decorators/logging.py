# backend/app/decorators/logging.py
"""
ロギングデコレーター.

操作ログを自動記録するためのデコレーター。
"""

import functools
import logging
from collections.abc import Callable
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.services.common.operation_log_service import OperationLogService


logger = logging.getLogger(__name__)


def log_operation(
    operation_type: str,
    target_table: str,
    get_target_id: Callable[[Any], int | None] | None = None,
):
    """操作をログ記録するデコレーター.

    Args:
        operation_type: 操作タイプ（create, update, delete）
        target_table: 対象テーブル名
        get_target_id: レスポンスから対象IDを取得する関数

    使用例:
        @log_operation("create", "orders", lambda result: result.id)
        def create_order(db: Session, order_data: OrderCreate):
            ...

    注意:
        - 関数の引数にdb: SessionとRequest（オプション）が必要
        - デコレートされた関数はDBコミット前に実行される
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # DB セッションを取得
            db: Session | None = kwargs.get("db") or next(
                (arg for arg in args if isinstance(arg, Session)), None
            )

            if not db:
                logger.warning(
                    f"No DB session found for {func.__name__}, skipping operation log"
                )
                return func(*args, **kwargs)

            # リクエストオブジェクトを取得（IPアドレス取得のため）
            request: Request | None = kwargs.get("request") or next(
                (arg for arg in args if isinstance(arg, Request)), None
            )

            ip_address = None
            if request and hasattr(request, "client"):
                ip_address = request.client.host if request.client else None

            # ユーザー情報を取得（リクエスト状態から）
            user_id = None
            if request and hasattr(request, "state"):
                user_id = getattr(request.state, "user_id", None)

            # 元の関数を実行
            result = func(*args, **kwargs)

            # 対象IDを取得
            target_id = None
            if get_target_id:
                try:
                    target_id = get_target_id(result)
                except Exception as e:
                    logger.warning(
                        f"Failed to get target_id from result: {e}",
                        exc_info=True,
                    )

            # 操作ログを記録
            try:
                log_service = OperationLogService(db)
                log_service.log_operation(
                    operation_type=operation_type,
                    target_table=target_table,
                    target_id=target_id,
                    user_id=user_id,
                    ip_address=ip_address,
                )
                # ログはコミット前に記録されるため、明示的なコミットは不要
            except Exception as e:
                logger.error(
                    f"Failed to log operation: {e}",
                    extra={
                        "operation_type": operation_type,
                        "target_table": target_table,
                        "target_id": target_id,
                    },
                    exc_info=True,
                )
                # ログ記録失敗でも元の処理は継続

            return result

        return wrapper

    return decorator
