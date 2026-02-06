# backend/app/middleware/metrics.py
"""メトリクス収集ミドルウェア.

APIパフォーマンスメトリクスを収集。

【設計意図】メトリクス収集ミドルウェアの設計判断:

1. なぜメトリクス収集が必要なのか
   理由: APIパフォーマンスの可視化と問題検出
   業務的背景:
   - 自動車部品商社: 営業時間中の受注処理が多い
   - 繁忙期（月初、月末）のAPI遅延検出が必要
   → どのエンドポイントが遅いか、エラー率はどうか
   問題:
   - 「最近受注登録が遅い」という報告
   → どのAPIが遅いか特定できない
   解決:
   - メトリクス収集で定量的に把握
   → P95, P99レスポンスタイムで異常検出

2. EndpointMetrics の設計（L25-110）
   理由: エンドポイントごとの詳細メトリクスを記録
   フィールド:
   - request_count: 総リクエスト数
   - error_count: エラー数
   - total_duration_ms: 総処理時間
   - response_times: レスポンスタイム履歴（最新1000件）
   - status_codes: ステータスコード分布
   - last_request_time: 最終リクエスト日時
   メリット:
   - エンドポイント別のパフォーマンス比較
   - 平均値だけでなく、中央値、P95、P99も計算可能
   業務的意義:
   - 「受注一覧API」が遅いと判明
   → クエリ最適化の優先順位決定

3. response_times の最新1000件制限（L54-56）
   理由: メモリリーク防止
   問題:
   - 全リクエストの履歴を保持
   → 長時間稼働でメモリ不足
   解決:
   - 最新1000件のみ保持
   → メモリ使用量を一定に保つ
   トレードオフ:
   - 1000件より古いデータは失われる
   → しかし、統計計算には十分（P95, P99も正確）

4. get_percentile_duration() の設計（L78-99）
   理由: 異常値を含む場合でもパフォーマンスを正確に把握
   問題:
   - 平均値: 1件の極端に遅いリクエストで歪む
   - 例: 9件が100ms、1件が10000ms → 平均1090ms
   解決:
   - P95（95パーセンタイル）: 95%のリクエストはこの値以下
   - P99: 99%のリクエストはこの値以下
   → 異常値を除外した現実的なパフォーマンス指標
   業務的意義:
   - 通常時のパフォーマンス把握
   - SLA（Service Level Agreement）設定の根拠

5. MetricsCollector のシングルトンパターン（L112-130）
   理由: アプリケーション全体で1つのメトリクス収集器
   問題:
   - 各ミドルウェアインスタンスが別々にメトリクス保持
   → データが分散、集計不可能
   解決:
   - シングルトンパターン
   → 全エンドポイントのメトリクスを1箇所に集約
   実装:
   - __new__() メソッドでインスタンス制御
   - スレッドセーフ: Lock() で排他制御
   メリット:
   - 全体のリクエスト数、エラー率を集計可能
   - /api/admin/metrics で一括取得

6. なぜスレッドセーフ実装なのか（L116, L149）
   理由: FastAPIの非同期処理での安全性
   背景:
   - FastAPI: 複数のリクエストを並行処理
   → 複数のスレッドが同時にメトリクスを更新
   問題:
   - Lock なし: 競合状態（Race Condition）
   → request_count が不正確（カウント漏れ）
   解決:
   - Lock() で排他制御
   → 同時アクセスを順序化、データ整合性保証
   パフォーマンス影響:
   - Lock のオーバーヘッドは微小（ナノ秒オーダー）
   → メトリクス収集の正確性 > わずかな遅延

7. get_summary() の設計（L164-200）
   理由: 管理画面でのメトリクス表示用
   出力:
   - total_requests: 総リクエスト数
   - total_errors: 総エラー数
   - error_rate: エラー率
   - endpoints: エンドポイント別メトリクス（リクエスト数降順）
   各エンドポイント:
   - avg_duration_ms: 平均レスポンスタイム
   - median_duration_ms: 中央値
   - p95_duration_ms: 95パーセンタイル
   - p99_duration_ms: 99パーセンタイル
   用途:
   - /api/admin/metrics エンドポイントで提供
   - 管理画面でのパフォーマンスダッシュボード表示

8. MetricsMiddleware の dispatch() 設計（L220-246）
   理由: 各リクエストのレスポンスタイム測定
   処理フロー:
   1. start_time = time.time() （開始時刻記録）
   2. response = await call_next(request) （リクエスト処理）
   3. duration_ms = (time.time() - start_time) * 1000 （経過時間計算）
   4. collector.record_request(...) （メトリクス記録）
   5. return response
   重要:
   - call_next(request) の前後で時刻測定
   → 実際のリクエスト処理時間を正確に計測
   - エラー時もメトリクス記録（status_code >= 400）

9. なぜ main.py でミドルウェア順序が重要か
   理由: メトリクス収集は全処理を測定すべき
   main.py での登録順:
   - CORSMiddleware → Metrics → RequestLogging → RequestID
   実行順（逆順）:
   - RequestID → RequestLogging → Metrics → CORS
   影響:
   - Metrics は RequestID, RequestLogging の処理時間も含む
   → 真のエンドツーエンド レスポンスタイム
   メリット:
   - ユーザー視点での実際のレスポンスタイム
   - ミドルウェア自体のオーバーヘッドも測定

10. reset_metrics() の用途（L202-205）
    理由: テスト環境やメンテナンス時のリセット
    用途:
    - 統合テスト前にメトリクスクリア
    - デプロイ後の本番環境でリセット（新バージョンの測定）
    - メモリ節約（長期稼働時）
    業務シナリオ:
    - 月次メンテナンス後にメトリクスリセット
    → 新しい月の性能データを収集
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from statistics import StatisticsError, median, quantiles
from threading import Lock

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.time_utils import utcnow


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
        self.last_request_time = utcnow()

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

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
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
