"""Log streaming API routes.

Provides WebSocket endpoint for real-time log streaming to browser.
"""

import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.log_broadcaster import get_log_broadcaster
from app.presentation.api.routes.auth.auth_router import (
    get_current_admin,
    get_current_user_optional,
)


router = APIRouter(prefix="/logs", tags=["Logs"])
logger = logging.getLogger(__name__)


@router.websocket("/stream")
async def stream_logs(
    websocket: WebSocket,
    token: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Stream logs in real-time via WebSocket.

    Clients receive JSON-formatted log entries as they occur.
    Requires admin authentication via 'token' query parameter.

    Example client usage:
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/api/logs/stream?token=YOUR_JWT_TOKEN');
    ws.onmessage = (event) => {
        const logEntry = JSON.parse(event.data);
        console.log(logEntry);
    };
    ```
    """
    await websocket.accept()

    # WebSocket authentication
    # Since browsers don't support custom headers for WebSocket, we use a query parameter
    try:
        user = get_current_user_optional(token, db)
        if not user:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed"
            )
            return

        # Check for admin role
        get_current_admin(user)
    except Exception as e:
        logger.warning(f"WebSocket authentication failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return

    broadcaster = get_log_broadcaster()
    broadcaster.add_client(websocket)

    logger.info(
        "Log streaming client connected",
        extra={
            "client": websocket.client.host if websocket.client else "unknown",
            "user": user.username,
        },
    )

    try:
        # Keep connection alive and handle client messages
        while True:
            # Wait for client messages (like ping/pong or filter updates)
            data = await websocket.receive_text()

            # Echo back for connection health check
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        logger.info(
            "Log streaming client disconnected",
            extra={"client": websocket.client.host if websocket.client else "unknown"},
        )
    except Exception:
        logger.exception("Error in log streaming WebSocket")
    finally:
        broadcaster.remove_client(websocket)
