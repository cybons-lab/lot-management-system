"""SmartRead CSV変換器のテスト."""

import pytest

from app.application.services.smartread.csv_transformer import (
    SmartReadCsvTransformer,
)


class TestSmartReadCsvTransformer:
    """SmartReadCsvTransformerのテスト."""

    @pytest.fixture
    def transformer(self) -> SmartReadCsvTransformer:
        """変換器のフィクスチャ."""
        return SmartReadCsvTransformer()

    def test_transform_single_detail(self, transformer: SmartReadCsvTransformer) -> None:
        """単一明細の変換テスト."""
        wide_data = [
            {
                "ファイル名": "test.pdf",
                "ページ番号": "1",
                "納品書No": "INV-001",
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "次区1": "A1",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert len(result.long_data) == 1
        assert result.long_data[0]["ファイル名"] == "test.pdf"
        assert result.long_data[0]["材質コード"] == "ABC-001"
        assert result.long_data[0]["納入量"] == "100"
        assert result.long_data[0]["次区"] == "A1"
        assert result.long_data[0]["明細番号"] == 1
        assert len(result.errors) == 0

    def test_transform_multiple_details(self, transformer: SmartReadCsvTransformer) -> None:
        """複数明細の変換テスト."""
        wide_data = [
            {
                "ファイル名": "test.pdf",
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "材質コード2": "DEF-002",
                "納入量2": "200",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert len(result.long_data) == 2
        assert result.long_data[0]["材質コード"] == "ABC-001"
        assert result.long_data[0]["明細番号"] == 1
        assert result.long_data[1]["材質コード"] == "DEF-002"
        assert result.long_data[1]["明細番号"] == 2

    def test_skip_empty_details(self, transformer: SmartReadCsvTransformer) -> None:
        """空明細スキップのテスト."""
        wide_data = [
            {
                "ファイル名": "test.pdf",
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "材質コード2": "",
                "納入量2": "",
            }
        ]

        result = transformer.transform_to_long(wide_data, skip_empty=True)

        assert len(result.long_data) == 1
        assert result.long_data[0]["材質コード"] == "ABC-001"

    def test_date_validation_valid(self, transformer: SmartReadCsvTransformer) -> None:
        """日付バリデーション（正常）のテスト."""
        wide_data = [
            {
                "発行日": "2024/01/15",
                "納入日": "2024-02-20",
                "材質コード1": "ABC-001",
                "納入量1": "100",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["発行日"] == "2024/01/15"
        assert result.long_data[0]["納入日"] == "2024/02/20"
        assert result.long_data[0]["エラー_発行日形式"] == 0
        assert result.long_data[0]["エラー_納入日形式"] == 0
        assert len(result.errors) == 0

    def test_date_validation_invalid(self, transformer: SmartReadCsvTransformer) -> None:
        """日付バリデーション（エラー）のテスト."""
        wide_data = [
            {
                "発行日": "invalid-date",
                "材質コード1": "ABC-001",
                "納入量1": "100",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["発行日"] == ""
        assert result.long_data[0]["エラー_発行日形式"] == 1
        assert len(result.errors) == 1
        assert result.errors[0].field == "発行日"

    def test_jiku_validation_valid(self, transformer: SmartReadCsvTransformer) -> None:
        """次区バリデーション（正常）のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "次区1": "A1",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["次区"] == "A1"
        assert result.long_data[0]["エラー_次区形式"] == 0
        assert len(result.errors) == 0

    def test_jiku_validation_invalid(self, transformer: SmartReadCsvTransformer) -> None:
        """次区バリデーション（エラー）のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "次区1": "123",  # アルファベットで始まらない
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["次区"] == "123"
        assert result.long_data[0]["エラー_次区形式"] == 1
        assert len(result.errors) == 1
        assert "次区" in result.errors[0].field

    def test_quantity_validation_valid(self, transformer: SmartReadCsvTransformer) -> None:
        """納入量バリデーション（正常）のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "1,000",  # カンマ区切り
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["納入量"] == "1000"
        assert result.long_data[0]["エラー_納入量"] == 0

    def test_quantity_validation_negative(self, transformer: SmartReadCsvTransformer) -> None:
        """納入量バリデーション（負の値）のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "-100",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["エラー_納入量"] == 1
        assert len(result.errors) == 1

    def test_fullwidth_to_halfwidth(self, transformer: SmartReadCsvTransformer) -> None:
        """全角→半角変換のテスト."""
        wide_data = [
            {
                "材質コード1": "ＡＢＣ０１",  # 全角
                "納入量1": "１００",  # 全角数字
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["材質コード"] == "ABC01"
        assert result.long_data[0]["納入量"] == "100"

    def test_sub_detail_fields(self, transformer: SmartReadCsvTransformer) -> None:
        """サブ明細項目（Lot No等）のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "Lot No1-1": "LOT001",
                "梱包数1-1": "10",
                "Lot No1-2": "LOT002",
                "梱包数1-2": "5",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["Lot No1"] == "LOT001"
        assert result.long_data[0]["梱包数1"] == "10"
        assert result.long_data[0]["Lot No2"] == "LOT002"
        assert result.long_data[0]["梱包数2"] == "5"

    def test_quantity_with_decimal_field(self, transformer: SmartReadCsvTransformer) -> None:
        """納入量と納入量小数点の結合テスト（3桁）."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "納入量小数点1": "052",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert len(result.long_data) == 1
        assert result.long_data[0]["納入量"] == "100.052"
        assert "納入量小数点" not in result.long_data[0]

    def test_quantity_with_partial_decimal(self, transformer: SmartReadCsvTransformer) -> None:
        """納入量小数点が桁落ちしている場合のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "納入量小数点1": "5",  # OCR読み取りエラーで1桁のみ
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["納入量"] == "100.5"

    def test_quantity_only_decimal_no_base(self, transformer: SmartReadCsvTransformer) -> None:
        """納入量がなく小数点のみの場合のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量小数点1": "750",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        # バリデーションで"750"→"75"に変換される（float変換で末尾の0が消える）
        assert result.long_data[0]["納入量"] == "0.75"

    def test_quantity_no_decimal(self, transformer: SmartReadCsvTransformer) -> None:
        """納入量小数点がない場合のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "500",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["納入量"] == "500"

    def test_fullwidth_decimal_column_name(self, transformer: SmartReadCsvTransformer) -> None:
        """全角数字の列名（納入量小数点１など）のテスト."""
        wide_data = [
            {
                "材質コード１": "ABC-001",  # 全角1
                "納入量１": "100",
                "納入量小数点１": "025",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["材質コード"] == "ABC-001"
        assert result.long_data[0]["納入量"] == "100.025"

    def test_multiple_details_with_decimals(self, transformer: SmartReadCsvTransformer) -> None:
        """複数明細で納入量小数点がある場合のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "納入量小数点1": "250",
                "材質コード2": "DEF-002",
                "納入量2": "200",
                "納入量小数点2": "5",  # 桁落ち
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert len(result.long_data) == 2
        assert result.long_data[0]["納入量"] == "100.250"
        assert result.long_data[1]["納入量"] == "200.5"

    def test_empty_decimal_field(self, transformer: SmartReadCsvTransformer) -> None:
        """納入量小数点が空の場合のテスト（「100.」にならないこと）."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "納入量小数点1": "",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["納入量"] == "100"

    def test_whitespace_decimal_field(self, transformer: SmartReadCsvTransformer) -> None:
        """納入量小数点が空白のみの場合のテスト."""
        wide_data = [
            {
                "材質コード1": "ABC-001",
                "納入量1": "100",
                "納入量小数点1": "   ",
            }
        ]

        result = transformer.transform_to_long(wide_data)

        assert result.long_data[0]["納入量"] == "100"
