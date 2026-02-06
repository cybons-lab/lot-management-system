"""データ整合性チェック用 Pydantic スキーマ."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DataIntegrityViolation(BaseModel):
    """スキャンで検出された1件の違反."""

    table_name: str
    column_name: str
    column_type: str
    violation_count: int
    sample_ids: list[int | str] = Field(default_factory=list)
    fixable: bool
    default_value: str | None = None
    source: str = Field(default="auto", description="auto or rule")


class DataIntegrityScanResponse(BaseModel):
    """スキャン結果レスポンス."""

    violations: list[DataIntegrityViolation]
    total_violations: int
    total_affected_rows: int


class DataIntegrityFixRequest(BaseModel):
    """修正リクエスト（省略時は全ルール実行）."""

    table_name: str | None = None
    column_name: str | None = None


class DataIntegrityFixResult(BaseModel):
    """修正された1件の結果."""

    table: str
    column: str
    rows_fixed: int
    value_applied: str


class DataIntegrityFixResponse(BaseModel):
    """修正レスポンス."""

    fixed: list[DataIntegrityFixResult]
    skipped: list[dict[str, str]] = Field(default_factory=list)
    total_rows_fixed: int
