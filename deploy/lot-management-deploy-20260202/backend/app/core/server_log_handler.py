"""Server log persistence handler."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from logging.handlers import QueueHandler

from app.core.database import SessionLocal
from app.infrastructure.persistence.models.logs_models import ServerLog


STANDARD_LOG_FIELDS = {
    "args",
    "asctime",
    "created",
    "exc_info",
    "exc_text",
    "filename",
    "funcName",
    "levelname",
    "levelno",
    "lineno",
    "module",
    "msecs",
    "msg",
    "name",
    "pathname",
    "process",
    "processName",
    "relativeCreated",
    "stack_info",
    "thread",
    "threadName",
}


class StructlogQueueHandler(QueueHandler):
    """QueueHandler that preserves structlog dict in record.msg."""

    def prepare(self, record: logging.LogRecord) -> logging.LogRecord:
        """Prepare record for queuing.

        Default QueueHandler destroys dict in msg/args. We want to keep it.
        But we must handle unpickleable attributes like exc_info.
        """
        # Ensure exc_text is generated if exc_info is present
        self.format(record)

        # Clear unpickleable attributes
        record.exc_info = None
        # record.args = None # Keep args? Structlog puts context in args sometimes?
        # Usually structlog uses msg for dict. args is None or empty tuple.
        # But QueueHandler sets args=None. Let's keep it if safe.
        # Generally args are pickleable.

        # DO NOT overwrite record.msg with record.message (string)
        # record.msg = record.message

        return record


class ServerLogDBHandler(logging.Handler):
    """Persist WARNING/ERROR logs to the database."""

    def emit(self, record: logging.LogRecord) -> None:
        session = SessionLocal()
        try:
            # Structlogのwrap_for_formatterを使用している場合、
            # record.msgは辞書（event_dict）になっている可能性がある
            log_payload = record.msg if isinstance(record.msg, dict) else {}

            # メッセージ/イベントの抽出
            # structlogでは通常 'event' キーにメッセージが入る
            message_text = log_payload.get("event") or record.getMessage()
            event_text = log_payload.get("event") or getattr(record, "event", record.getMessage())

            # extraフィールドの構築
            # record.msgが辞書ならそれをベースにし、record.__dict__のその他属性をマージ
            extra_data = {}
            if isinstance(record.msg, dict):
                extra_data.update(record.msg)

            # 標準フィールドと重複するものは除外
            for key, value in record.__dict__.items():
                if key not in STANDARD_LOG_FIELDS and not key.startswith("_"):
                    extra_data[key] = value

            # 専用カラムにあるものはextraから除外
            exclude_keys = {
                "request_id",
                "user_id",
                "username",
                "method",
                "path",
                "event",
                "timestamp",
                "level",
                "logger",
                "environment",
                "message",  # messageもカラムにあるのでextraから除外
            }
            extra_data = {k: v for k, v in extra_data.items() if k not in exclude_keys}

            server_log = ServerLog(
                created_at=datetime.fromtimestamp(record.created, tz=UTC),
                level=record.levelname,
                logger=record.name,
                event=str(event_text)[:65535] if event_text else None,  # Text型制限考慮
                message=str(message_text)[:65535],
                request_id=getattr(record, "request_id", log_payload.get("request_id")),
                user_id=getattr(record, "user_id", log_payload.get("user_id")),
                username=getattr(record, "username", log_payload.get("username")),
                method=getattr(record, "method", log_payload.get("method")),
                path=getattr(record, "path", log_payload.get("path")),
                extra=extra_data or None,
            )
            session.add(server_log)
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()
