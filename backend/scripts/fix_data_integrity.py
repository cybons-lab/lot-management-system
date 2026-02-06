"""データ整合性チェック・修正スタンドアロンスクリプト.

使用方法:
    cd backend
    python scripts/fix_data_integrity.py              # スキャンのみ（デフォルト）
    python scripts/fix_data_integrity.py --fix         # 修正実行
    python scripts/fix_data_integrity.py --fix --dry-run  # ドライラン
    python scripts/fix_data_integrity.py --fix --table warehouses --column warehouse_type
"""

from __future__ import annotations

import argparse
import os
import sys


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.application.services.admin.data_integrity_service import (  # noqa: E402
    REPAIR_RULES,
    DataIntegrityService,
)
from app.core.database import SessionLocal  # noqa: E402


def main() -> None:
    """メインエントリーポイント."""
    parser = argparse.ArgumentParser(description="データ整合性チェック・修正ツール")
    parser.add_argument("--scan", action="store_true", help="スキャンのみ（デフォルト）")
    parser.add_argument("--fix", action="store_true", help="修正を実行")
    parser.add_argument("--dry-run", action="store_true", help="ドライラン（修正はしない）")
    parser.add_argument("--table", type=str, help="対象テーブルを指定")
    parser.add_argument("--column", type=str, help="対象カラムを指定")
    args = parser.parse_args()

    if not args.scan and not args.fix:
        args.scan = True

    db = SessionLocal()
    try:
        service = DataIntegrityService(db)

        # スキャン実行
        violations = service.scan_all()

        if not violations:
            print("\n✅ 違反は検出されませんでした。")
            return

        print(f"\n{'=' * 60}")
        print(f"  検出された違反: {len(violations)} 件")
        print(f"  影響行数合計:   {sum(v.violation_count for v in violations)} 行")
        print(f"{'=' * 60}\n")

        for v in violations:
            tag = "🔧 FIXABLE" if v.fixable else "⚠️  NO RULE"
            print(f"  [{tag}] {v.table_name}.{v.column_name} ({v.column_type})")
            print(f"           {v.violation_count} 行が NULL")
            if v.fixable:
                print(f"           修正値: '{v.default_value}'")
            print(f"           サンプルID: {v.sample_ids}")
            print(f"           検出方法: {v.source}")
            print()

        if not args.fix:
            print("修正するには --fix オプションを付けて再実行してください。")
            print(f"\n定義済み修正ルール ({len(REPAIR_RULES)} 件):")
            for (tbl, col), val in REPAIR_RULES.items():
                print(f"  {tbl}.{col} → '{val}'")
            return

        if args.dry_run:
            print("[DRY RUN] 変更は適用されません。")
            return

        # 修正実行
        print("修正を実行します...")
        result = service.fix_violations(
            table_name=args.table,
            column_name=args.column,
        )

        if result.get("error"):
            print(f"\n❌ エラー: {result['error']}")
            return

        for f in result["fixed"]:
            print(f"  ✅ {f['table']}.{f['column']}: {f['rows_fixed']}行 → '{f['value_applied']}'")

        for s in result["skipped"]:
            print(f"  ⏭️  {s['table']}.{s['column']}: 既にクリーン")

        total = sum(f["rows_fixed"] for f in result["fixed"])
        print(f"\n完了: {total} 行を修正しました。")

    except Exception as e:
        print(f"\n❌ エラー: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
