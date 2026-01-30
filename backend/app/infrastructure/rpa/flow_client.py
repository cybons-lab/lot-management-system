"""RPA Flow Client infrastructure.

Handles communication with external RPA flows (Power Automate).
"""

import logging
from typing import Any, cast

import httpx


logger = logging.getLogger(__name__)


class RpaFlowClient:
    """RPAフロー実行クライアント."""

    async def call_flow(
        self,
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
            httpx.HTTPStatusError: HTTPステータスエラー
        """
        # Mask flow URL to avoid logging sensitive trigger URLs
        masked_url = flow_url[:50] + "..." if len(flow_url) > 50 else flow_url

        logger.info(
            "Calling RPA flow",
            extra={
                "flow_url": masked_url,
                "payload_keys": list(json_payload.keys()),
                "timeout": timeout,
            },
        )

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    flow_url,
                    json=json_payload,
                    timeout=timeout,
                    headers={"Content-Type": "application/json"},
                )

                logger.info(
                    "RPA flow response received",
                    extra={
                        "flow_url": masked_url,
                        "status_code": response.status_code,
                        "content_type": response.headers.get("content-type"),
                        "response_size": len(response.content),
                    },
                )

                response.raise_for_status()

                try:
                    return cast(dict[str, Any], response.json())
                except Exception:
                    logger.warning(
                        "RPA flow response is not JSON, returning raw response",
                        extra={
                            "flow_url": masked_url,
                            "status_code": response.status_code,
                            "content_type": response.headers.get("content-type"),
                        },
                    )
                    return {"status_code": response.status_code, "text": response.text}

        except httpx.TimeoutException as e:
            logger.error(
                "RPA flow request timeout",
                extra={
                    "flow_url": masked_url,
                    "timeout": timeout,
                    "error": str(e),
                },
            )
            raise
        except httpx.HTTPStatusError as e:
            logger.error(
                "RPA flow returned error status",
                extra={
                    "flow_url": masked_url,
                    "status_code": e.response.status_code,
                    "response_body": e.response.text[:500] if e.response else None,
                },
            )
            raise
        except httpx.RequestError as e:
            logger.error(
                "RPA flow request failed",
                extra={
                    "flow_url": masked_url,
                    "error": str(e),
                },
            )
            raise
