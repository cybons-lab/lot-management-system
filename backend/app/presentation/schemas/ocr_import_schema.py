"""OCR取込API用スキーマ定義."""

from datetime import date

from pydantic import BaseModel, Field


class OcrImportLineRequest(BaseModel):
    """OCR取込明細行."""

    customer_part_no: str = Field(..., description="先方品番（OCR読取値）")
    jiku_code: str = Field(..., description="次区コード")
    quantity: float = Field(..., description="数量")
    delivery_date: date = Field(..., description="納期")


class OcrImportRequest(BaseModel):
    """OCR取込リクエスト."""

    customer_code: str = Field(..., description="得意先コード")
    source_filename: str = Field(..., description="OCR元ファイル名")
    lines: list[OcrImportLineRequest] = Field(..., description="明細行リスト")


class OcrImportLineResult(BaseModel):
    """OCR取込明細行の処理結果."""

    row_no: int = Field(..., description="行番号")
    customer_part_no: str = Field(..., description="先方品番")
    product_id: int | None = Field(None, description="解決された製品ID")
    match_type: str = Field(..., description="マッチ種別（exact/prefix/not_found/multiple）")
    status: str = Field(..., description="処理状態（resolved/unresolved）")
    message: str | None = Field(None, description="メッセージ")


class OcrImportResponse(BaseModel):
    """OCR取込レスポンス."""

    order_id: int = Field(..., description="作成された受注ID")
    customer_code: str = Field(..., description="得意先コード")
    source_filename: str = Field(..., description="OCR元ファイル名")
    total_lines: int = Field(..., description="総明細数")
    resolved_count: int = Field(..., description="解決済み件数")
    unresolved_count: int = Field(..., description="未解決件数")
    lines: list[OcrImportLineResult] = Field(..., description="明細処理結果")
