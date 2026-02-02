"""Shared SmartRead service data types."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class AnalyzeResult:
    """解析結果."""

    success: bool
    filename: str
    data: list[dict[str, Any]]
    error_message: str | None = None


@dataclass
class WatchDirProcessOutcome:
    """監視フォルダ処理結果."""

    task_id: str | None
    results: list[AnalyzeResult]
    watch_dir: Path | None


@dataclass
class ExportResult:
    """エクスポート結果."""

    content: str | bytes
    content_type: str
    filename: str
