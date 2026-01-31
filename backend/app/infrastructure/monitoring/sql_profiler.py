import contextvars
import logging
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from fastapi import Request, Response
from sqlalchemy import event
from sqlalchemy.engine import Engine, ExecutionContext
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from app.core.config import settings


logger = logging.getLogger(__name__)


@dataclass
class QueryStats:
    """単一のSQL形状に対する統計情報."""

    count: int = 0
    total_time: float = 0.0
    example_sql: str = ""


@dataclass
class RequestStats:
    """1リクエスト内のSQL統計情報."""

    queries: dict[str, QueryStats] = field(default_factory=lambda: defaultdict(QueryStats))
    total_count: int = 0
    total_time: float = 0.0


# リクエストごとのSQL統計を保持するContextVar
_profiler_context: contextvars.ContextVar[RequestStats | None] = contextvars.ContextVar(
    "sql_profiler_context", default=None
)


class SQLProfilerMiddleware(BaseHTTPMiddleware):
    """SQL実行を計測し、N+1問題や遅延クエリを検出してログ出力するミドルウェア."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # プロファイラが無効なら何もしない
        if not settings.SQL_PROFILER_ENABLED:
            return await call_next(request)

        # Contextを初期化
        stats = RequestStats()
        token = _profiler_context.set(stats)

        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            return response
        finally:
            elapsed_time = (time.perf_counter() - start_time) * 1000
            self._log_report(request, stats, elapsed_time)
            _profiler_context.reset(token)

    def _log_report(self, request: Request, stats: RequestStats, request_elapsed_ms: float) -> None:
        """集計結果をログに出力する（閾値を超えた場合のみ、または設定による）."""
        # 閾値チェック
        is_slow_db = stats.total_time > settings.SQL_PROFILER_THRESHOLD_TIME
        is_many_queries = stats.total_count > settings.SQL_PROFILER_THRESHOLD_COUNT

        # N+1検知: 同一SQLがしきい値を超えて実行されているか
        duplicates: list[dict[str, Any]] = []
        for _, query_stat in stats.queries.items():
            if query_stat.count > settings.SQL_PROFILER_N_PLUS_ONE_THRESHOLD:
                duplicates.append(
                    {
                        "count": query_stat.count,
                        "time_ms": round(query_stat.total_time, 2),
                        "sql": query_stat.example_sql,  # 正規化されたSQLを出力
                        # "sql_norm": sql_norm, # 必要なら正規化キーも
                    }
                )

        has_n_plus_one = len(duplicates) > 0

        # 何かしらの警告条件に合致した場合のみログ出力（あるいは常にINFO出すかは運用次第）
        # ここでは「閾値超え OR N+1疑い」がある場合に WARNING/INFO を出す方針とする
        should_log = is_slow_db or is_many_queries or has_n_plus_one

        if should_log:
            log_payload: dict[str, Any] = {
                "event": "sql_profiler",
                "path": request.url.path,
                "method": request.method,
                "status": "finished",
                "request_elapsed_ms": round(request_elapsed_ms, 2),
                "sql_count": stats.total_count,
                "db_time_ms_total": round(stats.total_time, 2),
                "n_plus_one_detected": has_n_plus_one,
            }

            if duplicates:
                log_payload["duplicates"] = sorted(
                    duplicates, key=lambda x: int(x["count"]), reverse=True
                )

            # 遅いクエリTOP5
            top_slowest = sorted(stats.queries.values(), key=lambda x: x.total_time, reverse=True)[
                :5
            ]
            if top_slowest:
                log_payload["top_slowest"] = [
                    {
                        "count": qs.count,
                        "time_ms": round(qs.total_time, 2),
                        "sql": qs.example_sql,
                    }
                    for qs in top_slowest
                ]

            level = logging.WARNING if (has_n_plus_one or is_slow_db) else logging.INFO
            logger.log(
                level, f"SQL Profiler Report: {log_payload}", extra={"sql_profiler": log_payload}
            )


def _normalize_sql(sql: str) -> str:
    """SQLを正規化する（スペース圧縮、リテラル置換など）."""
    # 連続する空白を1つに
    sql = " ".join(sql.split())

    if settings.SQL_PROFILER_NORMALIZE_LITERALS:
        # 数値リテラルを ? に置換
        sql = re.sub(r"\b\d+\b", "?", sql)
        # 文字列リテラルを ? に置換 (簡易版: '...' -> ?)
        sql = re.sub(r"'[^']*'", "?", sql)

    return sql


def before_cursor_execute(
    conn: Any,
    cursor: Any,
    statement: str,
    parameters: Any,
    context: ExecutionContext,
    executemany: bool,
) -> None:
    """SQL実行前のフック."""
    if not settings.SQL_PROFILER_ENABLED:
        return

    # ContextVarからstatsを取得できない場合（コンテキスト外）はスキップ
    if _profiler_context.get() is None:
        return

    # 開始時刻を conn.info に保存（context.infoがない場合があるため）
    conn.info["start_time"] = time.perf_counter()


def after_cursor_execute(
    conn: Any,
    cursor: Any,
    statement: str,
    parameters: Any,
    context: ExecutionContext,
    executemany: bool,
) -> None:
    """SQL実行後のフック."""
    if not settings.SQL_PROFILER_ENABLED:
        return

    stats = _profiler_context.get()
    if stats is None:
        return

    start_time = conn.info.get("start_time")
    if start_time:
        duration = (time.perf_counter() - start_time) * 1000  # ms

        # SQLの正規化
        normalized_sql = _normalize_sql(statement)

        # 統計更新
        stats.total_count += 1
        stats.total_time += duration

        qs = stats.queries[normalized_sql]
        qs.count += 1
        qs.total_time += duration
        if not qs.example_sql:
            qs.example_sql = normalized_sql  # 初回のみ保存（あるいは常に短い方を保存するなど）


def register_sql_profiler(engine: Engine) -> None:
    """SQLAlchemyエンジンにプロファイラ用のイベントリスナーを登録する."""
    if not settings.SQL_PROFILER_ENABLED:
        return

    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    event.listen(engine, "after_cursor_execute", after_cursor_execute)
    logger.info("✅ SQL Profiler events registered")
