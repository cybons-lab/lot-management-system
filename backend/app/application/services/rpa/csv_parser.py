"""CSV Parser for Material Delivery Note.

CSVファイルをパースし、DBに保存可能な形式に変換する。
"""

import csv
import io
import re
from datetime import date, datetime
from typing import Any


# CSV Header mapping: CSVヘッダー名 → DBカラム名
# 必須7カラムのみ。CSV内に他のカラムがあっても無視される。
CSV_HEADER_MAPPING = {
    "ステータス": "status",
    "出荷先": "destination",
    "層別": "layer_code",
    "材質コード": "material_code",
    "納期": "delivery_date",
    "納入量": "delivery_quantity",
    "出荷便": "shipping_vehicle",
}


def detect_encoding(content: bytes) -> str:
    """文字コードを検出する.

    優先順位:
    1. Shift_JIS (CP932)
    2. UTF-8

    Args:
        content: バイト列

    Returns:
        検出されたエンコーディング名
    """
    # Try Shift_JIS first (most common in Japanese business context)
    try:
        content.decode("cp932")
        return "cp932"
    except (UnicodeDecodeError, LookupError):
        pass

    # Fall back to UTF-8
    try:
        content.decode("utf-8")
        return "utf-8"
    except (UnicodeDecodeError, LookupError):
        pass

    # Last resort: try with errors='replace'
    return "utf-8"


def parse_date(value: str | None) -> date | None:
    """日付文字列をパースする.

    対応フォーマット:
    - YYYY/MM/DD
    - YYYY-MM-DD

    Args:
        value: 日付文字列

    Returns:
        date または None
    """
    if not value or not value.strip():
        return None

    value = value.strip()

    # Try YYYY/MM/DD format
    try:
        return datetime.strptime(value, "%Y/%m/%d").date()
    except ValueError:
        pass

    # Try YYYY-MM-DD format
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        pass

    return None


def parse_quantity(value: str | None) -> int | None:
    """納入量をパースする.

    桁区切りカンマを除去して整数化する。

    Args:
        value: 数量文字列（例: "1,000"）

    Returns:
        int または None
    """
    if not value or not value.strip():
        return None

    # Remove commas and whitespace
    cleaned = re.sub(r"[,\s]", "", value)

    try:
        return int(cleaned)
    except ValueError:
        return None


def parse_bool_flag(value: str | None, default: bool | None = None) -> bool | None:
    """ブール値をパースする.

    Args:
        value: 値文字列
        default: デフォルト値

    Returns:
        bool または None
    """
    if not value or not value.strip():
        return default

    value = value.strip().lower()

    if value in ("true", "1", "yes", "○", "〇"):
        return True
    if value in ("false", "0", "no", "×", "x"):
        return False

    return default


def parse_match_result(value: str | None) -> bool | None:
    """突合結果をパースする.

    - "○" → True
    - 空白 → None

    Args:
        value: 値文字列

    Returns:
        bool または None (3値)
    """
    if not value or not value.strip():
        return None

    value = value.strip()

    if value in ("○", "〇"):
        return True

    return None


def parse_material_delivery_csv(file_content: bytes) -> list[dict[str, Any]]:
    """素材納品書CSVをパースする.

    Args:
        file_content: CSVファイルのバイト列

    Returns:
        パース結果のリスト（各行がdict）

    Raises:
        ValueError: CSVの形式が不正な場合
    """
    # Detect and decode
    encoding = detect_encoding(file_content)
    try:
        text_content = file_content.decode(encoding)
    except UnicodeDecodeError:
        text_content = file_content.decode("utf-8", errors="replace")

    # Parse CSV
    reader = csv.DictReader(io.StringIO(text_content))

    if not reader.fieldnames:
        raise ValueError("CSV header is empty or invalid")

    results: list[dict[str, Any]] = []

    for row_no, row in enumerate(reader, start=1):
        parsed_row: dict[str, Any] = {"row_no": row_no}

        # Map CSV columns
        for csv_header, db_column in CSV_HEADER_MAPPING.items():
            raw_value = row.get(csv_header)

            if db_column == "delivery_date":
                parsed_row[db_column] = parse_date(raw_value)
            elif db_column == "delivery_quantity":
                parsed_row[db_column] = parse_quantity(raw_value)
            else:
                # String fields
                parsed_row[db_column] = raw_value.strip() if raw_value else None

        # Set default values for non-CSV columns
        parsed_row["issue_flag"] = True  # Default: True
        parsed_row["complete_flag"] = False  # Default: False
        parsed_row["match_result"] = None
        parsed_row["sap_registered"] = None
        parsed_row["order_no"] = None

        results.append(parsed_row)

    return results


# Sample CSV for testing
SAMPLE_CSV = """ステータス,出荷先,層別,材質コード,納期,納入量,出荷便,その他カラム
集荷指示前,B509,0902,8891078,2025/12/22,200,B509,無視データ
集荷指示前,B509,0902,8891078,2025/12/24,"1,240",B509,
集荷指示前,B976,0902,8891075,2025-12-23,"5,000",B976,
集荷指示前,C050,0902,8891501,2025/12/23,2000,C050,
集荷指示前,C297,0902,8890974,2025/12/26,1000,C297,
"""


if __name__ == "__main__":
    # Test with sample CSV
    results = parse_material_delivery_csv(SAMPLE_CSV.encode("utf-8"))
    for row in results:
        print(row)
