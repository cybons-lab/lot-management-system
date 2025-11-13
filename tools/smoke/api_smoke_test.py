#!/usr/bin/env python3
"""
API Smoke Test Script

複数のAPIエンドポイントに対してスモークテストを実行し、各エンドポイントの
レスポンスタイムと成功/失敗を記録します。

主な機能:
- 指定されたベースURLに対して複数のエンドポイントをテスト
- 各リクエストのレスポンスタイム(ms)を計測
- レスポンスのerror/detailフィールドの有無で成否を判定
- テスト結果のサマリーを表示
- 失敗があればexit code 1で終了

使用例:
    python api_smoke_test.py
    python api_smoke_test.py --base-url http://localhost:8000 --timeout 10
"""

import argparse
import sys
import time
from dataclasses import dataclass
from typing import Any, Optional

import requests


@dataclass
class TestResult:
    """テスト結果を保持するデータクラス"""
    name: str
    url: str
    ok: bool = False
    ms: int = 0
    note: str = ""


def get_first_non_empty(*values: Any) -> str:
    """最初の非空値を返す"""
    for v in values:
        if v is not None and str(v).strip():
            return str(v)
    return ""


def invoke_test(
    name: str,
    url: str,
    method: str = "GET",
    headers: Optional[dict] = None,
    body: Optional[dict] = None,
    timeout: int = 10
) -> TestResult:
    """
    APIエンドポイントにリクエストを送信してテストを実行
    
    Args:
        name: テスト名
        url: リクエストURL
        method: HTTPメソッド
        headers: リクエストヘッダー
        body: リクエストボディ(JSON)
        timeout: タイムアウト秒数
    
    Returns:
        TestResult: テスト結果
    """
    result = TestResult(name=name, url=url)
    headers = headers or {}
    
    start_time = time.perf_counter()
    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=body,
            timeout=timeout
        )
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        result.ms = elapsed_ms
        
        # JSONレスポンスを取得
        try:
            data = response.json()
        except ValueError:
            data = {}
        
        # error/detailフィールドの有無で成否判定
        has_error = "error" in data or "detail" in data
        result.ok = response.ok and not has_error
        
        # 表示用ノート(title/status/messageの最初にあるもの)
        result.note = get_first_non_empty(
            data.get("title"),
            data.get("status"),
            data.get("message")
        )
        
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        result.ms = elapsed_ms
        result.ok = False
        result.note = str(e)
    
    return result


def main():
    parser = argparse.ArgumentParser(description="API Smoke Test")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="ベースURL (デフォルト: http://localhost:8000)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="タイムアウト秒数 (デフォルト: 10)"
    )
    args = parser.parse_args()
    
    base_url = args.base_url
    timeout = args.timeout
    
    print("== API Smoke Test start ==")
    print(f"BaseUrl = {base_url}\n")
    
    # テストケース定義
    results = []
    test_cases = [
        ("health", f"{base_url}/health"),
        ("version", f"{base_url}/version"),
        ("openapi.json", f"{base_url}/openapi.json"),
        ("masters.warehouses list", f"{base_url}/api/masters/warehouses"),
        ("masters.products list", f"{base_url}/api/masters/products"),
        ("lots list", f"{base_url}/api/lots"),
        ("orders list", f"{base_url}/api/orders"),
        ("allocations list", f"{base_url}/api/allocations"),
        ("forecasts list", f"{base_url}/api/forecast"),
    ]
    
    # テスト実行
    for name, url in test_cases:
        result = invoke_test(name, url, timeout=timeout)
        results.append(result)
    
    # サマリー表示
    ok_count = sum(1 for r in results if r.ok)
    ng_count = sum(1 for r in results if not r.ok)
    total_ms = sum(r.ms for r in results)
    
    print("\n== Summary ==")
    for r in results:
        status = "OK " if r.ok else "NG "
        print(f"[{status}] {r.name:30s}  {r.ms:4d}ms  -> {r.url}")
        if r.note:
            print(f"     note: {r.note}")
    
    print(f"\nTotal: {len(results)}  OK: {ok_count}  NG: {ng_count}  Time: {total_ms}ms")
    
    if ng_count > 0:
        print("== API Smoke Test: FAILED ==")
        sys.exit(1)
    else:
        print("== API Smoke Test: PASSED ==")
        sys.exit(0)


if __name__ == "__main__":
    main()