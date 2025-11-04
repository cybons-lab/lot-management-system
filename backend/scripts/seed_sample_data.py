"""Seed sample data for development and demos via the admin API endpoint."""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, timedelta
from typing import Any, Dict, List

try:
    import requests
except ImportError as exc:  # pragma: no cover - optional dependency guard
    raise SystemExit("'requests' ライブラリが必要です。pip install requests でインストールしてください。") from exc

DEFAULT_ENDPOINT = "http://127.0.0.1:8000/api/admin/load-full-sample-data"
ENV_ENDPOINT = "SAMPLE_DATA_API_URL"


def build_payload() -> Dict[str, Any]:
    base_date = date.today()
    receipt_base = base_date - timedelta(days=7)
    due_base = base_date + timedelta(days=5)

    products = [
        {
            "product_code": f"PRD-{idx:03d}",
            "product_name": name,
            "internal_unit": "EA",
            "base_unit": "EA",
            "requires_lot_number": True,
        }
        for idx, name in enumerate(
            [
                "部品A",
                "部品B",
                "部品C",
                "部品D",
                "部品E",
            ],
            start=1,
        )
    ]

    lots: List[Dict[str, Any]] = []
    receipts: List[Dict[str, Any]] = []
    orders: List[Dict[str, Any]] = []

    supplier_code = "SUP001"
    warehouse_code = "WH001"
    customer_code = "CUS001"

    for idx, product in enumerate(products, start=1):
        receipt_date = receipt_base + timedelta(days=idx)
        expiry_date = receipt_date + timedelta(days=180)
        lot_number = f"L-{idx:03d}"

        lots.append(
            {
                "supplier_code": supplier_code,
                "product_code": product["product_code"],
                "lot_number": lot_number,
                "receipt_date": receipt_date.isoformat(),
                "expiry_date": expiry_date.isoformat(),
                "warehouse_code": warehouse_code,
                "lot_unit": "EA",
            }
        )

        receipts.append(
            {
                "receipt_no": f"RCPT-{idx:03d}",
                "supplier_code": supplier_code,
                "warehouse_code": warehouse_code,
                "receipt_date": receipt_date.isoformat(),
                "lines": [
                    {
                        "line_no": 1,
                        "product_code": product["product_code"],
                        "lot_number": lot_number,
                        "quantity": 100 + idx * 5,
                        "unit": "EA",
                    }
                ],
            }
        )

        orders.append(
            {
                "order_no": f"ORD-{idx:03d}",
                "customer_code": customer_code,
                "order_date": base_date.isoformat(),
                "lines": [
                    {
                        "line_no": 1,
                        "product_code": product["product_code"],
                        "quantity": 10 + idx * 2,
                        "unit": "EA",
                        "due_date": (due_base + timedelta(days=idx)).isoformat(),
                    }
                ],
            }
        )

    payload: Dict[str, Any] = {
        "products": products,
        "lots": lots,
        "receipts": receipts,
        "orders": orders,
    }
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed sample data via admin API")
    parser.add_argument(
        "--url",
        dest="url",
        default=os.getenv(ENV_ENDPOINT, DEFAULT_ENDPOINT),
        help=(
            "Target endpoint URL. Defaults to %(default)s and can also be provided "
            f"via the {ENV_ENDPOINT} environment variable."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the payload without sending the request.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Request timeout in seconds (default: %(default)s)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = build_payload()

    if args.dry_run:
        json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
        print()
        return 0

    try:
        response = requests.post(args.url, json=payload, timeout=args.timeout)
    except requests.RequestException as exc:  # pragma: no cover - network errors
        print(f"[seed] リクエスト送信に失敗しました: {exc}", file=sys.stderr)
        return 1

    if response.status_code >= 400:
        print(
            f"[seed] エラー応答 ({response.status_code}): {response.text}",
            file=sys.stderr,
        )
        return 1

    try:
        result = response.json()
    except ValueError as exc:  # pragma: no cover - unexpected payload
        print(f"[seed] レスポンスをJSONとして解析できませんでした: {exc}", file=sys.stderr)
        return 1

    success = result.get("success", False)
    message = result.get("message", "")
    data = result.get("data", {})
    counts = data.get("counts", {})
    warnings = data.get("warnings", [])

    print("[seed] サンプルデータ投入リクエストを送信しました")
    print(f"        URL: {args.url}")
    print(f"    ステータス: {'成功' if success else '失敗'}")
    if message:
        print(f"    メッセージ: {message}")

    if counts:
        print("    登録件数:")
        for key in ("products", "lots", "receipts", "orders"):
            value = counts.get(key, 0)
            print(f"      - {key}: {value}")

    if warnings:
        print("    警告:")
        for warn in warnings:
            print(f"      - {warn}")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
