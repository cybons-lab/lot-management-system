"""Server log persistence handler."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

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


class ServerLogDBHandler(logging.Handler):
    """Persist WARNING/ERROR logs to the database."""

    def emit(self, record: logging.LogRecord) -> None:
        session = SessionLocal()
        try:
            extra = {
                key: value
                for key, value in record.__dict__.items()
                if key not in STANDARD_LOG_FIELDS and not key.startswith("_")
            }

            server_log = ServerLog(
                created_at=datetime.fromtimestamp(record.created, tz=UTC),
                level=record.levelname,
                logger=record.name,
                event=getattr(record, "event", record.getMessage()),
                message=record.getMessage(),
                request_id=getattr(record, "request_id", None),
                user_id=getattr(record, "user_id", None),
                username=getattr(record, "username", None),
                method=getattr(record, "method", None),
                path=getattr(record, "path", None),
                extra=extra or None,
            )
            session.add(server_log)
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()
