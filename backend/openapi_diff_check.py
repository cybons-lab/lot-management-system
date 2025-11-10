#!/usr/bin/env python3
"""
OpenAPI Specification Difference Checker

このスクリプトは、リネーム前後のOpenAPIスキーマを比較して、
公開APIに変更がないことを確認します。

Usage:
    # ベースラインを生成
    python openapi_diff_check.py generate baseline_openapi.json

    # 差分をチェック
    python openapi_diff_check.py compare baseline_openapi.json current_openapi.json

    # 差分があった場合は終了コード1を返します
"""

import json
import sys
from pathlib import Path
from typing import Any


def normalize_openapi_spec(spec: dict[str, Any]) -> dict[str, Any]:
    """
    OpenAPIスキーマを正規化して比較可能にします。

    - サーバーURLは環境依存なので除外
    - 生成日時などのメタデータは除外
    - スキーマの順序を統一

    Args:
        spec: OpenAPIスキーマ

    Returns:
        正規化されたOpenAPIスキーマ
    """
    normalized = spec.copy()

    # 環境依存の項目を除外
    if "servers" in normalized:
        del normalized["servers"]

    # パス、スキーマを辞書順にソート
    if "paths" in normalized:
        normalized["paths"] = dict(sorted(normalized["paths"].items()))

        # 各パスのメソッドもソート
        for path, methods in normalized["paths"].items():
            normalized["paths"][path] = dict(sorted(methods.items()))

    if "components" in normalized and "schemas" in normalized["components"]:
        normalized["components"]["schemas"] = dict(
            sorted(normalized["components"]["schemas"].items())
        )

    return normalized


def deep_diff(obj1: Any, obj2: Any, path: str = "") -> list[str]:
    """
    2つのオブジェクトを再帰的に比較して差分を検出します。

    Args:
        obj1: 比較元オブジェクト
        obj2: 比較先オブジェクト
        path: 現在の比較パス（デバッグ用）

    Returns:
        差分のリスト（差分がない場合は空リスト）
    """
    differences = []

    if type(obj1) != type(obj2):
        differences.append(f"{path}: Type mismatch ({type(obj1).__name__} vs {type(obj2).__name__})")
        return differences

    if isinstance(obj1, dict):
        all_keys = set(obj1.keys()) | set(obj2.keys())
        for key in sorted(all_keys):
            new_path = f"{path}.{key}" if path else key

            if key not in obj1:
                differences.append(f"{new_path}: Missing in first object")
            elif key not in obj2:
                differences.append(f"{new_path}: Missing in second object")
            else:
                differences.extend(deep_diff(obj1[key], obj2[key], new_path))

    elif isinstance(obj1, list):
        if len(obj1) != len(obj2):
            differences.append(f"{path}: List length mismatch ({len(obj1)} vs {len(obj2)})")
        else:
            for i, (item1, item2) in enumerate(zip(obj1, obj2)):
                differences.extend(deep_diff(item1, item2, f"{path}[{i}]"))

    else:
        if obj1 != obj2:
            differences.append(f"{path}: Value mismatch ({obj1!r} vs {obj2!r})")

    return differences


def generate_openapi_json(output_path: Path) -> None:
    """
    現在のアプリケーションからOpenAPIスキーマを生成します。

    Args:
        output_path: 出力先ファイルパス
    """
    try:
        # FastAPIアプリケーションをインポート
        from app.main import app

        # OpenAPIスキーマを取得
        openapi_schema = app.openapi()

        # 正規化して保存
        normalized_schema = normalize_openapi_spec(openapi_schema)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(normalized_schema, f, indent=2, ensure_ascii=False, sort_keys=True)

        print(f"✅ OpenAPIスキーマを生成しました: {output_path}")
        print(f"   パス数: {len(normalized_schema.get('paths', {}))}")
        print(f"   スキーマ数: {len(normalized_schema.get('components', {}).get('schemas', {}))}")

    except Exception as e:
        print(f"❌ OpenAPIスキーマの生成に失敗しました: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


def compare_openapi_specs(baseline_path: Path, current_path: Path) -> bool:
    """
    2つのOpenAPIスキーマを比較します。

    Args:
        baseline_path: ベースラインのOpenAPIスキーマファイルパス
        current_path: 現在のOpenAPIスキーマファイルパス

    Returns:
        差分がない場合True、ある場合False
    """
    try:
        # ファイルを読み込み
        with open(baseline_path, "r", encoding="utf-8") as f:
            baseline = json.load(f)

        with open(current_path, "r", encoding="utf-8") as f:
            current = json.load(f)

        # 正規化
        baseline_normalized = normalize_openapi_spec(baseline)
        current_normalized = normalize_openapi_spec(current)

        # 差分を検出
        differences = deep_diff(baseline_normalized, current_normalized)

        if not differences:
            print("✅ OpenAPIスキーマに差分はありません")
            print(f"   パス数: {len(baseline_normalized.get('paths', {}))}")
            print(f"   スキーマ数: {len(baseline_normalized.get('components', {}).get('schemas', {}))}")
            return True
        else:
            print("❌ OpenAPIスキーマに差分が見つかりました:", file=sys.stderr)
            for diff in differences:
                print(f"   - {diff}", file=sys.stderr)
            print(f"\n合計 {len(differences)} 件の差分", file=sys.stderr)
            return False

    except FileNotFoundError as e:
        print(f"❌ ファイルが見つかりません: {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ JSONのパースに失敗しました: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ 比較中にエラーが発生しました: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main() -> None:
    """メイン関数"""
    if len(sys.argv) < 2:
        print("Usage:", file=sys.stderr)
        print("  python openapi_diff_check.py generate <output_file>", file=sys.stderr)
        print("  python openapi_diff_check.py compare <baseline_file> <current_file>", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]

    if command == "generate":
        if len(sys.argv) != 3:
            print("Usage: python openapi_diff_check.py generate <output_file>", file=sys.stderr)
            sys.exit(1)

        output_path = Path(sys.argv[2])
        generate_openapi_json(output_path)

    elif command == "compare":
        if len(sys.argv) != 4:
            print("Usage: python openapi_diff_check.py compare <baseline_file> <current_file>", file=sys.stderr)
            sys.exit(1)

        baseline_path = Path(sys.argv[2])
        current_path = Path(sys.argv[3])

        success = compare_openapi_specs(baseline_path, current_path)
        sys.exit(0 if success else 1)

    else:
        print(f"❌ 不明なコマンド: {command}", file=sys.stderr)
        print("有効なコマンド: generate, compare", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
