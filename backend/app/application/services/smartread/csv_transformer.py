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
    "納入量小数点",
    "アイテム",
    "購買",
    "次区",
]

# サブ明細項目（例: Lot No1-1, Lot No1-2）
SUB_DETAIL_FIELDS = [
    "Lot No",
    "梱包数",
    "数量",
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
        logger.info(f"[Transformer] Starting transformation of {len(wide_data)} wide rows")
        if wide_data:
            logger.info(
                f"[Transformer] First row keys ({len(wide_data[0])} total): {list(wide_data[0].keys())[:15]}..."
            )

        long_data: list[dict[str, Any]] = []
        errors: list[ValidationError] = []

        for row_idx, row in enumerate(wide_data):
            # 共通項目を抽出
            common = self._extract_common_fields(row)
            logger.debug(
                f"[Transformer] Row {row_idx}: Common fields extracted: {list(common.keys())}"
            )

            # 共通項目のバリデーション
            common, row_errors = self._validate_common_fields(common, row_idx)
            errors.extend(row_errors)

            # 明細を抽出
            details = self._extract_details(row)
            logger.info(f"[Transformer] Row {row_idx}: {len(details)} details extracted")

            for detail_idx, detail in enumerate(details):
                # 空明細スキップ
                if skip_empty and self._is_empty_detail(detail):
                    logger.debug(
                        f"[Transformer] Row {row_idx}, Detail {detail_idx}: SKIPPED (empty)"
                    )
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
                logger.debug(
                    f"[Transformer] Row {row_idx}, Detail {detail_idx}: ADDED to long_data"
                )

        logger.info(
            f"[Transformer] COMPLETE: {len(wide_data)} wide rows -> {len(long_data)} long rows, {len(errors)} errors"
        )
        return TransformResult(long_data=long_data, errors=errors)

    def _extract_common_fields(self, row: dict[str, Any]) -> dict[str, Any]:
        """共通項目を抽出."""
        common = {}
        normalized_row = self._create_normalized_row(row)
        for field_name in COMMON_FIELDS:
            if field_name in normalized_row:
                common[field_name] = self._normalize_value(normalized_row[field_name])
        return common

    def _extract_details(self, row: dict[str, Any]) -> list[dict[str, Any]]:
        """明細項目を抽出.

        横持ちの「材質コード1」「材質コード2」... を
        [{"材質コード": "...", ...}, {"材質コード": "...", ...}] に変換。
        """
        details: list[dict[str, Any]] = []

        normalized_row = self._create_normalized_row(row)

        for n in range(1, self.max_details + 1):
            detail: dict[str, Any] = {}

            # 通常の明細項目（材質コード1, 材質コード 1, 納入量1, etc）
            for field_name in DETAIL_FIELDS:
                # 複数のパターンを試行
                keys_to_try = [f"{field_name}{n}", f"{field_name} {n}"]
                if n == 1:
                    keys_to_try.append(field_name)

                for key in keys_to_try:
                    if key in normalized_row:
                        detail[field_name] = self._normalize_value(normalized_row[key])
                        break

            # 納入量と納入量小数点を結合
            self._combine_quantity_and_decimal(detail)

            # サブ明細項目（Lot No1-1, Lot No 1-1, Lot No-1, etc）
            for sub_field in SUB_DETAIL_FIELDS:
                for sub_n in range(1, 5):  # 最大4つのサブ明細
                    keys_to_try = [f"{sub_field}{n}-{sub_n}", f"{sub_field} {n}-{sub_n}"]
                    if n == 1:
                        keys_to_try.append(f"{sub_field}-{sub_n}")

                    for key in keys_to_try:
                        if key in normalized_row:
                            detail[f"{sub_field}{sub_n}"] = self._normalize_value(
                                normalized_row[key]
                            )
                            break

            # 明細が存在する場合のみ追加
            is_empty = self._is_empty_detail(detail)
            if not is_empty:
                details.append(detail)
                logger.debug(
                    f"[Transformer] Detail n={n}: NOT empty, extracted: {list(detail.keys())}"
                )
                # 番号付きが見つからず、かつn=1で番号なしでヒットした場合は縦持ちと判断して打ち切り
                is_vertical = any(
                    field_name in normalized_row
                    and f"{field_name}1" not in normalized_row
                    and f"{field_name} 1" not in normalized_row
                    for field_name in DETAIL_FIELDS
                )
                if is_vertical and n == 1:
                    logger.debug("[Transformer] Detected vertical format, stopping at n=1")
                    break
            else:
                logger.debug(f"[Transformer] Detail n={n}: EMPTY, detail contents: {detail}")

        logger.debug(f"[Transformer] Total details extracted: {len(details)}")
        return details

    def _combine_quantity_and_decimal(self, detail: dict[str, Any]) -> None:
        """納入量と納入量小数点を結合.

        納入量小数点の値（3桁想定）を納入量の小数部として結合する。
        結合後は納入量小数点フィールドは削除される。

        Args:
            detail: 明細データ（in-place修正）
        """
        base_quantity = detail.get("納入量", "").strip()
        decimal_part = detail.get("納入量小数点", "").strip()

        # 納入量小数点フィールドを削除（縦持ちには含めない）
        if "納入量小数点" in detail:
            del detail["納入量小数点"]

        # 小数点がある場合は結合
        if decimal_part:
            if base_quantity:
                detail["納入量"] = f"{base_quantity}.{decimal_part}"
            else:
                detail["納入量"] = f"0.{decimal_part}"

    def _is_empty_detail(self, detail: dict[str, Any]) -> bool:
        """空明細かどうかを判定.

        全ての明細項目が空または未設定の場合は空明細。
        """
        if not detail:
            return True

        for key, value in detail.items():
            if key.startswith("エラー_"):
                continue
            if value is None:
                continue
            if str(value).strip() != "":
                return False

        return True

    def _create_normalized_row(self, row: dict[str, Any]) -> dict[str, Any]:
        """キーを正規化したrowを返す."""
        return {self._normalize_key(key): value for key, value in row.items()}

    def _normalize_key(self, key: str) -> str:
        """列名を正規化.

        - 前後空白トリム
        - 全角数字→半角数字
        """
        trimmed = key.strip()
        return trimmed.translate(str.maketrans("０１２３４５６７８９", "0123456789"))

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
                common["発行日"] = ""  # 値をクリア
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
                common["納入日"] = ""  # 値をクリア
            else:
                common["納入日"] = parsed
                common["エラー_納入日形式"] = 0

        return common, errors

    def _validate_detail(
        self, detail: dict[str, Any], row_idx: int, detail_idx: int
    ) -> tuple[dict[str, Any], list[ValidationError]]:
        """明細項目のバリデーション."""
        errors: list[ValidationError] = []

        # 次区のバリデーション（英数字のみ）
        if "次区" in detail:
            jiku = detail["次区"]
            if jiku and not re.match(r"^[A-Za-z0-9]+$", jiku):
                errors.append(
                    ValidationError(
                        row=row_idx,
                        field=f"次区(明細{detail_idx})",
                        message="次区は英数字である必要があります",
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
                # detail["納入量"] = parsed  # _parse_quantityはエラー時も値を返すのでそのまま
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
            "%Y/%m",
            "%Y-%m",
            "%Y年%m月",
            "%Y年",
            "%Y",
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
