import json
from pathlib import Path

import requests

# -------------------------------------------------------
# パス設定（スクリプト自身を基準に絶対パスで解決）
# -------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parents[1]  # backend/
DATA_DIR = BASE_DIR / "data"
BASE_URL = "http://localhost:8000/api"


# -------------------------------------------------------
# 共通関数
# -------------------------------------------------------
def print_header(title: str):
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def print_success(msg: str):
    print(f" [SUCCESS] {msg}")


def print_error(msg: str):
    print(f" [ERROR] {msg}")


def load_json(name: str) -> dict:
    """data/配下のJSONファイルを絶対パスで読み込む"""
    path = DATA_DIR / name
    if not path.exists():
        print_error(f"ファイルが見つかりません: {path}")
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def run_test(title: str, method: str, endpoint: str, payload: dict | None = None):
    print_header(title)
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "POST":
            response = requests.post(url, json=payload)
        elif method.upper() == "GET":
            response = requests.get(url)
        else:
            print_error(f"未対応のHTTPメソッド: {method}")
            return None

        print(f" Status Code: {response.status_code}")
        try:
            data = response.json()
            print(" Response JSON:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except Exception:
            data = None
            print(" Response (Not JSON):")
            print(response.text)

        if 200 <= response.status_code < 300:
            print_success("リクエスト成功")
        else:
            print_error("リクエスト失敗")

        return data
    except Exception as e:
        print_error(f"HTTP通信中に例外が発生: {e}")
        return None


# -------------------------------------------------------
# メイン処理
# -------------------------------------------------------
def main():
    # 1. データベースのリセット
    run_test(
        "1. データベースのリセット (基本マスタ投入)", "POST", "/admin/reset-database"
    )

    # 2. サンプルデータの投入
    sample_data = load_json("sample_data.json")
    if sample_data:
        result = run_test(
            "2. サンプルデータの投入 (製品: PRD-001, PRD-101 など)",
            "POST",
            "/admin/load-full-sample-data",
            payload=sample_data,
        )
        if not result:
            print_error("サンプルデータ投入に失敗。以降中止。")
            return

    # 3. テスト用製品の登録
    product_payload = load_json("product_PRD999.json")
    run_test(
        "3. テスト用製品の登録 (PRD-999)",
        "POST",
        "/masters/products",
        payload=product_payload,
    )

    # 4. Forecast一括登録
    forecast_payload = load_json("forecast_daily_PRD999_v1.json")
    run_test(
        "4. [テスト1] Forecastの一括登録 (PRD-999)",
        "POST",
        "/forecast/bulk",
        payload=forecast_payload,
    )

    # 5. 受注作成、6.詳細、7.再マッチング
    order_payload = load_json("order_create_PRD999.json")
    created = run_test(
        "5. [テスト2] 受注作成（自動マッチング） (PRD-999)",
        "POST",
        "/orders",
        payload=order_payload,
    )
    if created and isinstance(created, dict) and "id" in created:
        oid = created["id"]
        print_success(f"作成された受注 ID: {oid} を取得しました。")
        run_test(f"6. [テスト3] 受注詳細確認 (ID: {oid})", "GET", f"/orders/{oid}")
        run_test(
            f"7. [テスト4] 再マッチング (ID: {oid})", "POST", f"/orders/{oid}/re-match"
        )
    else:
        print_error("テスト2失敗のため、テスト3・4はスキップ。")

    print_header("全テスト完了")


if __name__ == "__main__":
    main()
