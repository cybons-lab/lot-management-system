"""Power Automate Flow Client.

外部のPower Automate Cloud Flowを呼び出すためのクライアント。
MaterialDeliveryNoteServiceから抽出。
"""

from typing import Any

import httpx


async def call_power_automate_flow(
    flow_url: str,
    json_payload: dict[str, Any],
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Power Automate Cloud Flowを呼び出す.

    Args:
        flow_url: FlowのHTTP Trigger URL
        json_payload: 送信するJSONペイロード
        timeout: タイムアウト秒数

    Returns:
        Flow応答

    Raises:
        httpx.RequestError: リクエストエラー
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            flow_url,
            json=json_payload,
            timeout=timeout,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()

        try:
            return response.json()
        except Exception:
            return {"status_code": response.status_code, "text": response.text}
