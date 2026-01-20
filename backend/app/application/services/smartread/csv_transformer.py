"""SmartRead CSV変換器.

横持ちCSV→縦持ちCSV変換とバリデーションを行う。
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


logger = logging.getLogger(__name__)


@dataclass
class ValidationError:
    """バリデーションエラー."""

    row: int
    field: str
    message: str
    value: str | None = None


@dataclass
class TransformResult:
    """変換結果."""

    long_data: list[dict[str, Any]]
    errors: list[ValidationError] = field(default_factory=list)


# 共通項目（全ての明細行にコピーされる）
COMMON_FIELDS = [
    "ファイル名",
    "ページ番号",
    "テンプレート名",
    "発行日",
    "納品書No",
    "発注者",
    "発注事業所",
    "受注者",
    "出荷場所名称",
    "納入日",
    "便",
]

# 明細項目（番号付き、例: 材質コード1, 材質コード2）
DETAIL_FIELDS = [
    "材質コード",
    "材質サイズ",
    "単位",
    "納入量",
    "アイテム",
    "購買",
    "次区",
]

# サブ明細項目（例: Lot No1-1, Lot No1-2）
SUB_DETAIL_FIELDS = [
    "Lot No",
    "梱包数",
]


class SmartReadCsvTransformer:
    """SmartRead CSV変換器."""

    def __init__(self, max_details: int = 20) -> None:
        """初期化.

        Args:
            max_details: 検出する明細の最大数
        """
        self.max_details = max_details

    def transform_to_long(
        self,
        wide_data: list[dict[str, Any]],
        skip_empty: bool = True,
    ) -> TransformResult:
        """横持ち→縦持ち変換.

        1行に複数明細が横に並ぶデータを、1行1明細の縦持ちに変換する。

        Args:
            wide_data: 横持ちデータ（1行=1ページ）
            skip_empty: 空明細をスキップするか

        Returns:
            変換結果
        """
        long_data: list[dict[str, Any]] = []
        errors: list[ValidationError] = []

        for row_idx, row in enumerate(wide_data):
            # 共通項目を抽出
            common = self._extract_common_fields(row)

            # 共通項目のバリデーション
            common, row_errors = self._validate_common_fields(common, row_idx)
            errors.extend(row_errors)

            # 明細を抽出
            details = self._extract_details(row)

            for detail_idx, detail in enumerate(details):
                # 空明細スキップ
                if skip_empty and self._is_empty_detail(detail):
                    continue

                # 明細のバリデーション
                detail, detail_errors = self._validate_detail(detail, row_idx, detail_idx + 1)
                errors.extend(detail_errors)

                # 共通項目と明細をマージ
                long_row = {
                    **common,
                    "明細番号": detail_idx + 1,
                    **detail,
                }
                long_data.append(long_row)

        return TransformResult(long_data=long_data, errors=errors)

    def _extract_common_fields(self, row: dict[str, Any]) -> dict[str, Any]:
        """共通項目を抽出."""
        common = {}
        for field_name in COMMON_FIELDS:
            if field_name in row:
                common[field_name] = self._normalize_value(row[field_name])
        return common

    def _extract_details(self, row: dict[str, Any]) -> list[dict[str, Any]]:
        """明細項目を抽出.

        横持ちの「材質コード1」「材質コード2」... を
        [{"材質コード": "...", ...}, {"材質コード": "...", ...}] に変換。
        """
        details: list[dict[str, Any]] = []

        for n in range(1, self.max_details + 1):
            detail: dict[str, Any] = {}

            # 通常の明細項目（材質コード1, 納入量1, etc）
            for field_name in DETAIL_FIELDS:
                key = f"{field_name}{n}"
                # n=1で番号付きが見つからない場合、番号なしを試行（縦持ちCSV対応）
                if key not in row and n == 1:
                    key = field_name

                if key in row:
                    detail[field_name] = self._normalize_value(row[key])

            # サブ明細項目（Lot No1-1, Lot No1-2, etc）
            for sub_field in SUB_DETAIL_FIELDS:
                for sub_n in range(1, 5):  # 最大4つのサブ明細
                    key = f"{sub_field}{n}-{sub_n}"
                    # n=1で番号付きが見つからない場合、番号なしを試行
                    if key not in row and n == 1:
                        key = f"{sub_field}-{sub_n}"

                    if key in row:
                        detail[f"{sub_field}{sub_n}"] = self._normalize_value(row[key])

            # 明細が存在する場合のみ追加
            if not self._is_empty_detail(detail):
                details.append(detail)
                # 番号なしでヒットした場合は1件のみとしてループ終了（縦持ちCSV）
                if any(
                    f"{field_name}1" not in row for field_name in DETAIL_FIELDS if field_name in row
                ):
                    break

        return details

    def _is_empty_detail(self, detail: dict[str, Any]) -> bool:
        """空明細かどうかを判定.

        材質コード、アイテム、納入量がすべて空または未設定の場合は空明細。
        """
        material_code = detail.get("材質コード", "")
        item = detail.get("アイテム", "")
        quantity = detail.get("納入量", "")

        return not material_code and not item and not quantity

    def _normalize_value(self, value: Any) -> str:
        """値を正規化.

        - 全角→半角変換
        - 前後空白トリム
        - None → 空文字
        """
        if value is None:
            return ""

        s = str(value).strip()

        # 全角→半角変換（数字、英字、一部記号）
        s = s.translate(
            str.maketrans(
                "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ",
                "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
            )
        )

        return s

    def _validate_common_fields(
        self, common: dict[str, Any], row_idx: int
    ) -> tuple[dict[str, Any], list[ValidationError]]:
        """共通項目のバリデーション."""
        errors: list[ValidationError] = []

        # 発行日のバリデーション
        if "発行日" in common:
            parsed, err = self._parse_date(common["発行日"])
            if err:
                errors.append(
                    ValidationError(
                        row=row_idx,
                        field="発行日",
                        message="日付形式が不正です",
                        value=common["発行日"],
                    )
                )
                common["エラー_発行日形式"] = 1
                common["発行日"] = ""
            else:
                common["発行日"] = parsed
                common["エラー_発行日形式"] = 0

        # 納入日のバリデーション
        if "納入日" in common:
            parsed, err = self._parse_date(common["納入日"])
            if err:
                errors.append(
                    ValidationError(
                        row=row_idx,
                        field="納入日",
                        message="日付形式が不正です",
                        value=common["納入日"],
                    )
                )
                common["エラー_納入日形式"] = 1
                common["納入日"] = ""
            else:
                common["納入日"] = parsed
                common["エラー_納入日形式"] = 0

        return common, errors

    def _validate_detail(
        self, detail: dict[str, Any], row_idx: int, detail_idx: int
    ) -> tuple[dict[str, Any], list[ValidationError]]:
        """明細項目のバリデーション."""
        errors: list[ValidationError] = []

        # 次区のバリデーション（先頭がアルファベット）
        if "次区" in detail:
            jiku = detail["次区"]
            if jiku and not re.match(r"^[A-Za-z]", jiku):
                errors.append(
                    ValidationError(
                        row=row_idx,
                        field=f"次区(明細{detail_idx})",
                        message="次区は先頭がアルファベットである必要があります",
                        value=jiku,
                    )
                )
                detail["エラー_次区形式"] = 1
            else:
                detail["エラー_次区形式"] = 0

        # 納入量のバリデーション（数値、非負）
        if "納入量" in detail:
            quantity = detail["納入量"]
            parsed, err = self._parse_quantity(quantity)
            if err:
                errors.append(
                    ValidationError(
                        row=row_idx,
                        field=f"納入量(明細{detail_idx})",
                        message="納入量は0以上の数値である必要があります",
                        value=quantity,
                    )
                )
                detail["エラー_納入量"] = 1
            else:
                detail["納入量"] = parsed
                detail["エラー_納入量"] = 0

        return detail, errors

    def _parse_date(self, value: str) -> tuple[str, bool]:
        """日付をパース.

        Args:
            value: 日付文字列

        Returns:
            (正規化された日付 YYYY/MM/DD, エラーフラグ)
        """
        if not value:
            return "", False

        # 正規化
        s = self._normalize_value(value)

        # 各種形式を試行
        formats = [
            "%Y/%m/%d",
            "%Y-%m-%d",
            "%Y年%m月%d日",
            "%Y.%m.%d",
            "%Y/%m/%d",
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(s, fmt)
                # 範囲チェック
                if dt.year < 1900 or dt.year > 9999:
                    return "", True
                return dt.strftime("%Y/%m/%d"), False
            except ValueError:
                continue

        return "", True

    def _parse_quantity(self, value: str) -> tuple[str, bool]:
        """数量をパース.

        Args:
            value: 数量文字列

        Returns:
            (正規化された数量, エラーフラグ)
        """
        if not value:
            return "", False

        s = self._normalize_value(value)

        # カンマを削除（1,000 → 1000）
        s = s.replace(",", "")

        try:
            num = float(s)
            if num < 0:
                return s, True
            # 整数なら整数として返す
            if num == int(num):
                return str(int(num)), False
            return str(num), False
        except ValueError:
            return s, True
