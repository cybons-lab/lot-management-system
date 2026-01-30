"""WebSocket log broadcaster.

Broadcasts log records to connected WebSocket clients in real-time.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any

from fastapi import WebSocket


class WebSocketLogHandler(logging.Handler):
    """Custom log handler that broadcasts to WebSocket clients."""

    def __init__(self):
        """Initialize the handler."""
        super().__init__()
        self.clients: set[WebSocket] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def add_client(self, websocket: WebSocket) -> None:
        """Add a WebSocket client to receive log broadcasts.

        Args:
            websocket: WebSocket connection to add
        """
        self.clients.add(websocket)

    def remove_client(self, websocket: WebSocket) -> None:
        """Remove a WebSocket client.

        Args:
            websocket: WebSocket connection to remove
        """
        self.clients.discard(websocket)

    def emit(self, record: logging.LogRecord) -> None:
        """Emit a log record to all connected WebSocket clients.

        Args:
            record: Log record to broadcast
        """
        if not self.clients:
            return

        try:
            log_entry = self._format_log_entry(record)

            # Get or create event loop
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                # No running loop, skip broadcasting
                return

            # Schedule broadcast in the event loop
            asyncio.create_task(self._broadcast(log_entry))

        except Exception:
            # Don't let logging errors crash the app
            self.handleError(record)

    def _format_log_entry(self, record: logging.LogRecord) -> dict[str, Any]:
        """Format log record as JSON-serializable dict.

        Args:
            record: Log record to format

        Returns:
            Formatted log entry
        """
        # Extract extra fields
        extra = {}
        for key, value in record.__dict__.items():
            if key not in {
                "name",
                "msg",
                "args",
                "created",
                "filename",
                "funcName",
                "levelname",
                "levelno",
                "lineno",
                "module",
                "msecs",
                "message",
                "pathname",
                "process",
                "processName",
                "relativeCreated",
                "thread",
                "threadName",
                "exc_info",
                "exc_text",
                "stack_info",
            }:
                try:
                    # Only include JSON-serializable values
                    json.dumps(value)
                    extra[key] = value
                except (TypeError, ValueError):
                    extra[key] = str(value)

        return {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "extra": extra if extra else None,
            "exception": self.format(record) if record.exc_info else None,
        }

    async def _broadcast(self, log_entry: dict[str, Any]) -> None:
        """Broadcast log entry to all connected clients.

        Args:
            log_entry: Formatted log entry to broadcast
        """
        if not self.clients:
            return

        message = json.dumps(log_entry)
        disconnected: set[WebSocket] = set()

        for client in self.clients:
            try:
                await client.send_text(message)
            except Exception:
                # Client disconnected or error sending
                disconnected.add(client)

        # Clean up disconnected clients
        for client in disconnected:
            self.clients.discard(client)


# Global instance
_log_broadcaster: WebSocketLogHandler | None = None


def get_log_broadcaster() -> WebSocketLogHandler:
    """Get or create the global log broadcaster instance.

    Returns:
        Global WebSocketLogHandler instance
    """
    global _log_broadcaster
    if _log_broadcaster is None:
        _log_broadcaster = WebSocketLogHandler()
        _log_broadcaster.setLevel(logging.DEBUG)

        # Add formatter
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        _log_broadcaster.setFormatter(formatter)

    return _log_broadcaster


def setup_log_broadcasting() -> None:
    """Set up log broadcasting by adding handler to root logger."""
    broadcaster = get_log_broadcaster()

    # Add to root logger to capture all logs
    root_logger = logging.getLogger()
    if broadcaster not in root_logger.handlers:
        root_logger.addHandler(broadcaster)
