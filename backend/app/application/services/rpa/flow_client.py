"""Power Automate Flow Client (Deprecated).

Use app.infrastructure.rpa.flow_client instead.
"""

from typing import Any

from app.infrastructure.rpa.flow_client import RpaFlowClient


async def call_power_automate_flow(
    flow_url: str,
    json_payload: dict[str, Any],
    timeout: float = 30.0,
) -> dict[str, Any]:
    """(Deprecated) Power Automate Cloud Flowを呼び出す."""
    client = RpaFlowClient()
    return await client.call_flow(flow_url, json_payload, timeout)
