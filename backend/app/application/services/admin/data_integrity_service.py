"""データ整合性チェック・修正サービス.

全テーブルの NOT NULL 違反を検出し、定義済みルールで修正する。
2段構えのスキャン:
  1. モデル定義 nullable=False カラムの NULL チェック（自動）
  2. REPAIR_RULES に定義されたカラムの NULL チェック（ルールベース）
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.base_model import Base


logger = logging.getLogger(__name__)

# =====================================================================
# 修正ルールマップ: (table_name, column_name) -> default_value
# ここに定義されたカラムのみ自動修正可能。
# nullable=True でもビジネス的に埋めたいカラムも対象にできる。
# =====================================================================
REPAIR_RULES: dict[tuple[str, str], str | int | bool] = {
    ("warehouses", "warehouse_type"): "external",
}

# スキャン対象外テーブル
EXCLUDED_TABLES: set[str] = {
    "alembic_version",
}


class DataIntegrityViolation:
    """スキャン結果の1件."""

    def __init__(
        self,
        *,
        table_name: str,
        column_name: str,
        column_type: str,
        violation_count: int,
        sample_ids: list[int | str],
        fixable: bool,
        default_value: str | None = None,
        source: str = "auto",
    ) -> None:
        self.table_name = table_name
        self.column_name = column_name
        self.column_type = column_type
        self.violation_count = violation_count
        self.sample_ids = sample_ids
        self.fixable = fixable
        self.default_value = default_value
        self.source = source

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換."""
        return {
            "table_name": self.table_name,
            "column_name": self.column_name,
            "column_type": self.column_type,
            "violation_count": self.violation_count,
            "sample_ids": self.sample_ids,
            "fixable": self.fixable,
            "default_value": self.default_value,
            "source": self.source,
        }


class DataIntegrityService:
    """データ整合性チェック・修正サービス."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def scan_all(self) -> list[DataIntegrityViolation]:
        """全テーブルの NULL 違反をスキャンする.

        Returns:
            検出された違反のリスト
        """
        violations: list[DataIntegrityViolation] = []
        seen: set[tuple[str, str]] = set()

        # Phase 1: モデル定義の NOT NULL 違反を自動検出
        for table_name, table in Base.metadata.tables.items():
            if table_name in EXCLUDED_TABLES:
                continue
            if table.info.get("is_view"):
                continue

            pk_cols = [c.name for c in table.columns if c.primary_key]
            if not pk_cols:
                continue
            pk_col = pk_cols[0]

            for column in table.columns:
                if column.primary_key:
                    continue
                # column.nullable は通常 bool だが念のため型チェック
                if not isinstance(column.nullable, bool) or column.nullable:
                    continue

                violation = self._check_column(
                    table_name, column.name, str(column.type), pk_col, source="auto"
                )
                if violation:
                    violations.append(violation)
                    seen.add((table_name, column.name))

        # Phase 2: REPAIR_RULES に定義されたカラムを追加チェック
        for (table_name, column_name), _default in REPAIR_RULES.items():
            if (table_name, column_name) in seen:
                continue
            if table_name in EXCLUDED_TABLES:
                continue

            rule_table = Base.metadata.tables.get(table_name)
            if rule_table is None:
                continue
            col = rule_table.columns.get(column_name)
            if col is None:
                continue

            pk_cols = [c.name for c in rule_table.columns if c.primary_key]
            if not pk_cols:
                continue

            violation = self._check_column(
                table_name,
                column_name,
                str(col.type),
                pk_cols[0],
                source="rule",
            )
            if violation:
                violations.append(violation)

        logger.info(
            "Data integrity scan complete",
            extra={
                "violation_count": len(violations),
                "affected_rows": sum(v.violation_count for v in violations),
            },
        )
        return violations

    def fix_violations(
        self,
        table_name: str | None = None,
        column_name: str | None = None,
    ) -> dict[str, Any]:
        """REPAIR_RULES に基づき NULL 違反を修正する.

        Args:
            table_name: 特定テーブルのみ修正（省略時は全ルール実行）
            column_name: 特定カラムのみ修正

        Returns:
            修正結果の辞書
        """
        fixed: list[dict[str, Any]] = []
        skipped: list[dict[str, str]] = []

        if table_name and column_name:
            key = (table_name, column_name)
            if key not in REPAIR_RULES:
                return {"fixed": [], "skipped": [], "error": "No repair rule defined"}
            targets = {key: REPAIR_RULES[key]}
        else:
            targets = dict(REPAIR_RULES)

        for (tbl, col), default_value in targets.items():
            result = self.db.execute(
                text(f"UPDATE {tbl} SET {col} = :val WHERE {col} IS NULL"),  # noqa: S608
                {"val": default_value},
            )
            rows_affected: int = result.rowcount  # type: ignore[attr-defined]
            if rows_affected > 0:
                fixed.append(
                    {
                        "table": tbl,
                        "column": col,
                        "rows_fixed": rows_affected,
                        "value_applied": str(default_value),
                    }
                )
                logger.info(
                    "Data integrity fix applied",
                    extra={
                        "table": tbl,
                        "column": col,
                        "rows_fixed": rows_affected,
                        "value": str(default_value),
                    },
                )
            else:
                skipped.append({"table": tbl, "column": col})

        self.db.commit()
        return {"fixed": fixed, "skipped": skipped}

    def _check_column(
        self,
        table_name: str,
        column_name: str,
        column_type: str,
        pk_col: str,
        *,
        source: str,
    ) -> DataIntegrityViolation | None:
        """単一カラムの NULL 違反をチェックする."""
        try:
            count_result = self.db.execute(
                text(f"SELECT COUNT(*) FROM {table_name} WHERE {column_name} IS NULL")  # noqa: S608
            )
            count = count_result.scalar() or 0
            if count == 0:
                return None

            sample_result = self.db.execute(
                text(  # noqa: S608
                    f"SELECT {pk_col} FROM {table_name} WHERE {column_name} IS NULL LIMIT 5"
                )
            )
            sample_ids = [row[0] for row in sample_result]

            rule_key = (table_name, column_name)
            return DataIntegrityViolation(
                table_name=table_name,
                column_name=column_name,
                column_type=column_type,
                violation_count=count,
                sample_ids=sample_ids,
                fixable=rule_key in REPAIR_RULES,
                default_value=str(REPAIR_RULES[rule_key]) if rule_key in REPAIR_RULES else None,
                source=source,
            )
        except Exception:
            logger.warning(
                "Column check failed",
                extra={"table": table_name, "column": column_name},
                exc_info=True,
            )
            return None
