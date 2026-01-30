"""Log streaming API routes.

Provides WebSocket endpoint for real-time log streaming to browser.
"""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.log_broadcaster import get_log_broadcaster


router = APIRouter(prefix="/logs", tags=["Logs"])
logger = logging.getLogger(__name__)


@router.websocket("/stream")
async def stream_logs(websocket: WebSocket):
    """Stream logs in real-time via WebSocket.

    Clients receive JSON-formatted log entries as they occur.

    Example client usage:
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/api/logs/stream');
    ws.onmessage = (event) => {
        const logEntry = JSON.parse(event.data);
        console.log(logEntry);
    };
    ```
    """
    await websocket.accept()
    broadcaster = get_log_broadcaster()
    broadcaster.add_client(websocket)

    logger.info(
        "Log streaming client connected",
        extra={"client": websocket.client.host if websocket.client else "unknown"},
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
