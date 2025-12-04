# backend/app/middleware/metrics.py
"""
メトリクス収集ミドルウェア.

APIパフォーマンスメトリクスを収集。
"""

import logging
import time
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from statistics import StatisticsError, median, quantiles
from threading import Lock

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp


logger = logging.getLogger(__name__)


@dataclass
class EndpointMetrics:
    """エンドポイントごとのメトリクス."""

    endpoint: str
    method: str
    request_count: int = 0
    error_count: int = 0
    total_duration_ms: float = 0.0
    response_times: list[float] = field(default_factory=list)
    status_codes: dict[int, int] = field(default_factory=lambda: defaultdict(int))
    last_request_time: datetime | None = None

    def add_request(self, duration_ms: float, status_code: int):
        """リクエストメトリクスを追加.

        Args:
            duration_ms: レスポンスタイム（ミリ秒）
            status_code: HTTPステータスコード
        """
        self.request_count += 1
        self.total_duration_ms += duration_ms
        self.response_times.append(duration_ms)
        self.status_codes[status_code] += 1
        self.last_request_time = datetime.now()

        if status_code >= 400:
            self.error_count += 1

        # メモリ節約: 最新1000件のみ保持
        if len(self.response_times) > 1000:
            self.response_times = self.response_times[-1000:]

    def get_average_duration(self) -> float:
        """平均レスポンスタイムを取得.

        Returns:
            平均レスポンスタイム（ミリ秒）
        """
        if self.request_count == 0:
            return 0.0
        return self.total_duration_ms / self.request_count

    def get_median_duration(self) -> float:
        """中央値レスポンスタイムを取得.

        Returns:
            中央値レスポンスタイム（ミリ秒）
        """
        if not self.response_times:
            return 0.0
        return median(self.response_times)

    def get_percentile_duration(self, percentile: int) -> float:
        """パーセンタイルレスポンスタイムを取得.

        Args:
            percentile: パーセンタイル（95, 99など）

        Returns:
            パーセンタイルレスポンスタイム（ミリ秒）
        """
        if not self.response_times or len(self.response_times) < 2:
            return 0.0

        try:
            # quantilesは[0.0, 1.0]の範囲で計算
            n = 100  # 100分割
            qs = quantiles(self.response_times, n=n)
            # percentile番目の値を取得（インデックスは0始まり）
            index = min(percentile - 1, len(qs) - 1)
            return qs[index]
        except (StatisticsError, ValueError, IndexError) as e:
            logger.warning(f"Failed to calculate percentile: {e}")
            return 0.0

    def get_error_rate(self) -> float:
        """エラー率を取得.

        Returns:
            エラー率（0.0〜1.0）
        """
        if self.request_count == 0:
            return 0.0
        return self.error_count / self.request_count


class MetricsCollector:
    """メトリクスコレクター（シングルトン）."""

    _instance: "MetricsCollector | None" = None
    _lock = Lock()

    # Instance attributes (set in __new__)
    metrics: dict[str, EndpointMetrics]
    data_lock: Lock

    def __new__(cls):
        """シングルトンパターン."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance.metrics = {}
                    cls._instance.data_lock = Lock()
        return cls._instance

    def record_request(
        self,
        method: str,
        path: str,
        duration_ms: float,
        status_code: int,
    ):
        """リクエストを記録.

        Args:
            method: HTTPメソッド
            path: エンドポイントパス
            duration_ms: レスポンスタイム（ミリ秒）
            status_code: HTTPステータスコード
        """
        key = f"{method} {path}"

        with self.data_lock:
            if key not in self.metrics:
                self.metrics[key] = EndpointMetrics(endpoint=path, method=method)

            self.metrics[key].add_request(duration_ms, status_code)

    def get_all_metrics(self) -> dict[str, EndpointMetrics]:
        """全メトリクスを取得.

        Returns:
            エンドポイントごとのメトリクス
        """
        with self.data_lock:
            return dict(self.metrics)

    def get_summary(self) -> dict:
        """メトリクスサマリーを取得.

        Returns:
            メトリクスサマリー
        """
        with self.data_lock:
            total_requests = sum(m.request_count for m in self.metrics.values())
            total_errors = sum(m.error_count for m in self.metrics.values())

            return {
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate": total_errors / total_requests if total_requests > 0 else 0.0,
                "endpoints_count": len(self.metrics),
                "endpoints": [
                    {
                        "endpoint": f"{m.method} {m.endpoint}",
                        "request_count": m.request_count,
                        "error_count": m.error_count,
                        "error_rate": m.get_error_rate(),
                        "avg_duration_ms": round(m.get_average_duration(), 2),
                        "median_duration_ms": round(m.get_median_duration(), 2),
                        "p95_duration_ms": round(m.get_percentile_duration(95), 2),
                        "p99_duration_ms": round(m.get_percentile_duration(99), 2),
                        "status_codes": dict(m.status_codes),
                        "last_request_time": (
                            m.last_request_time.isoformat() if m.last_request_time else None
                        ),
                    }
                    for m in sorted(
                        self.metrics.values(),
                        key=lambda x: x.request_count,
                        reverse=True,
                    )
                ],
            }

    def reset_metrics(self):
        """メトリクスをリセット."""
        with self.data_lock:
            self.metrics.clear()


class MetricsMiddleware(BaseHTTPMiddleware):
    """メトリクス収集ミドルウェア."""

    def __init__(self, app: ASGIApp):
        """初期化.

        Args:
            app: ASGIアプリケーション
        """
        super().__init__(app)
        self.collector = MetricsCollector()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """リクエストを処理し、メトリクスを記録.

        Args:
            request: HTTPリクエスト
            call_next: 次のミドルウェア/ハンドラ

        Returns:
            HTTPレスポンス
        """
        start_time = time.time()

        # リクエストを処理
        response = await call_next(request)

        # レスポンスタイムを計算
        duration_ms = (time.time() - start_time) * 1000

        # メトリクスを記録
        self.collector.record_request(
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
            status_code=response.status_code,
        )

        return response
