# backend/app/services/profile_loader.py
"""YAML-based profile loader for seed data configuration."""

from __future__ import annotations

import copy
import logging
from pathlib import Path
from typing import Any

import yaml


logger = logging.getLogger(__name__)


def load_profiles(path: str | Path) -> dict[str, Any]:
    """
    YAMLファイルからプロファイルを読み込む.

    Args:
        path: YAMLファイルのパス

    Returns:
        プロファイル辞書

    Raises:
        FileNotFoundError: ファイルが見つからない場合
        ValueError: YAML形式が不正な場合
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Profile file not found: {path}")

    try:
        with open(path, encoding="utf-8") as f:
            profiles = yaml.safe_load(f)
            if profiles is None:
                raise ValueError("Empty YAML file")
            if not isinstance(profiles, dict):
                raise ValueError("YAML root must be a dictionary")
            return profiles
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML format: {e}")


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """
    2つの辞書を深くマージする（overrideがbaseを上書き）.

    Args:
        base: ベース辞書
        override: 上書き辞書

    Returns:
        マージされた辞書
    """
    result = copy.deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def resolve_profile(
    name: str,
    profiles: dict[str, Any],
    _visited: set[str] | None = None,
) -> dict[str, Any]:
    """
    プロファイルを解決する（inherits継承を処理）.

    Args:
        name: プロファイル名
        profiles: 全プロファイル辞書
        _visited: 循環参照検出用（内部使用）

    Returns:
        解決されたプロファイル辞書

    Raises:
        ValueError: プロファイルが存在しない、または循環参照がある場合
    """
    if name not in profiles:
        raise ValueError(f"Profile '{name}' not found in configuration")

    # 循環参照チェック
    if _visited is None:
        _visited = set()
    if name in _visited:
        raise ValueError(f"Circular inheritance detected: {name}")
    _visited.add(name)

    node = profiles[name]
    if not isinstance(node, dict):
        raise ValueError(f"Profile '{name}' must be a dictionary")

    # 継承を解決
    base = {}
    if "inherits" in node:
        parent_name = node["inherits"]
        if not isinstance(parent_name, str):
            raise ValueError(f"Profile '{name}': 'inherits' must be a string")
        base = resolve_profile(parent_name, profiles, _visited.copy())

    # inherits以外のキーをマージ
    current = {k: v for k, v in node.items() if k != "inherits"}
    result = deep_merge(base, current)

    # バリデーション
    _validate_profile(name, result)

    return result


def _validate_profile(name: str, profile: dict[str, Any]) -> None:
    """
    プロファイルの妥当性をバリデーション.

    Args:
        name: プロファイル名
        profile: プロファイル辞書

    Raises:
        ValueError: バリデーションエラー
    """
    # 必須フィールドのチェック
    required_fields = ["customers", "suppliers", "products", "warehouses", "lots", "orders"]
    for field in required_fields:
        if field not in profile:
            raise ValueError(f"Profile '{name}': missing required field '{field}'")
        value = profile[field]
        if not isinstance(value, int) or value < 0:
            raise ValueError(f"Profile '{name}': field '{field}' must be a non-negative integer")

    # 倉庫数の範囲チェック（5〜10）
    warehouses = profile.get("warehouses", 0)
    if not (5 <= warehouses <= 10):
        raise ValueError(
            f"Profile '{name}': 'warehouses' must be between 5 and 10, got {warehouses}"
        )

    # order_line_items_per_orderのチェック
    if "order_line_items_per_order" in profile:
        order_lines = profile["order_line_items_per_order"]
        if isinstance(order_lines, dict):
            max_lines = order_lines.get("max", 5)
            if not (1 <= max_lines <= 5):
                raise ValueError(
                    f"Profile '{name}': 'order_line_items_per_order.max' must be between 1 and 5"
                )
        elif isinstance(order_lines, int):
            if not (1 <= order_lines <= 5):
                raise ValueError(
                    f"Profile '{name}': 'order_line_items_per_order' must be between 1 and 5"
                )

    # destinations_max_per_orderのチェック（固定5）
    if "destinations_max_per_order" in profile:
        dest_max = profile["destinations_max_per_order"]
        if dest_max != 5:
            raise ValueError(f"Profile '{name}': 'destinations_max_per_order' must be exactly 5")

    # lot_split_max_per_lineのチェック（1〜3）
    if "lot_split_max_per_line" in profile:
        lot_split_max = profile["lot_split_max_per_line"]
        if not (1 <= lot_split_max <= 3):
            raise ValueError(f"Profile '{name}': 'lot_split_max_per_line' must be between 1 and 3")

    # case_mixの合計チェック（<=1.0）
    if "case_mix" in profile:
        case_mix = profile["case_mix"]
        if isinstance(case_mix, dict):
            total = sum(v for v in case_mix.values() if isinstance(v, (int, float)))
            if total > 1.0:
                raise ValueError(
                    f"Profile '{name}': 'case_mix' total ({total}) must not exceed 1.0"
                )


def get_profile(profile_name: str | None = None) -> dict[str, Any]:
    """
    プロファイルを取得する（デフォルトパスから）.

    Args:
        profile_name: プロファイル名（Noneの場合はデフォルト値を返す）

    Returns:
        解決されたプロファイル辞書
    """
    if profile_name is None:
        # デフォルトプロファイル（最小限の設定）
        return {
            "customers": 300,
            "suppliers": 60,
            "products": 1500,
            "warehouses": 8,
            "lots": 6000,
            "orders": 4000,
            "order_line_items_per_order": {"min": 1, "max": 5},
            "destinations_max_per_order": 5,
            "lot_split_max_per_line": 3,
        }

    # YAMLから読み込み
    yaml_path = Path(__file__).resolve().parents[2] / "configs" / "seed_profiles.yaml"
    profiles = load_profiles(yaml_path)
    return resolve_profile(profile_name, profiles)
