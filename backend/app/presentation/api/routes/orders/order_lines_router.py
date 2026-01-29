"""Order lines endpoint."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.orders.order_service import OrderService
from app.presentation.api.deps import get_db
from app.presentation.schemas.orders.orders_schema import OrderLineResponse


router = APIRouter(prefix="/orders/lines", tags=["orders"])


# ============================================================
# Export Schema for cleaner Excel output
# ============================================================


class OrderLineExportRow:
    """受注明細エクスポート用の軽量データクラス."""

    def __init__(self, line: OrderLineResponse):
        self.受注番号 = line.order_id
        self.得意先コード = line.customer_code or ""
        self.得意先名 = line.customer_name or ""
        self.先方品番 = line.product_code or ""
        self.商品名 = line.product_name or ""
        self.納入先 = line.delivery_place_name or ""
        self.受注数量 = float(line.order_quantity)
        self.単位 = line.unit
        self.引当済数量 = float(line.allocated_quantity or 0)
        self.引当率 = (
            round(float(line.allocated_quantity or 0) / float(line.order_quantity) * 100, 1)
            if float(line.order_quantity) > 0
            else 0
        )
        self.納期 = str(line.delivery_date) if line.delivery_date else ""
        self.受注種別 = line.order_type
        self.ステータス = line.status
        self.得意先受注No = line.customer_order_no or ""
        self.SAP受注No = line.sap_order_no or ""
        self.受注日 = str(line.order_date) if line.order_date else ""

    def model_dump(self):
        """Pydantic互換のdictメソッド."""
        return {
            "受注番号": self.受注番号,
            "得意先コード": self.得意先コード,
            "得意先名": self.得意先名,
            "先方品番": self.先方品番,
            "商品名": self.商品名,
            "納入先": self.納入先,
            "受注数量": self.受注数量,
            "単位": self.単位,
            "引当済数量": self.引当済数量,
            "引当率(%)": self.引当率,
            "納期": self.納期,
            "受注種別": self.受注種別,
            "ステータス": self.ステータス,
            "得意先受注No": self.得意先受注No,
            "SAP受注No": self.SAP受注No,
            "受注日": self.受注日,
        }


@router.get("", response_model=list[OrderLineResponse])
def list_order_lines(
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    customer_code: str | None = None,
    product_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    order_type: str | None = None,
    db: Session = Depends(get_db),
):
    """受注明細一覧取得.

    受注ヘッダ情報や製品情報などを結合したフラットな明細リストを返します。
    """
    service = OrderService(db)
    return service.get_order_lines(
        skip=skip,
        limit=limit,
        status=status,
        customer_code=customer_code,
        product_code=product_code,
        date_from=date_from,
        date_to=date_to,
        order_type=order_type,
    )


@router.get("/export/download")
def export_order_lines(
    status: str | None = None,
    customer_code: str | None = None,
    product_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    order_type: str | None = None,
    db: Session = Depends(get_db),
):
    """受注明細をExcelでエクスポート.

    フィルター条件に一致する受注明細をExcelファイルとしてダウンロードします。

    Args:
        status: ステータスフィルター
        customer_code: 得意先コードフィルター
        product_code: 商品コードフィルター
        date_from: 納期開始日
        date_to: 納期終了日
        order_type: 受注種別フィルター
        db: データベースセッション

    Returns:
        StreamingResponse: Excelファイル
    """
    service = OrderService(db)
    # 制限なしで全件取得（エクスポート用）
    lines = service.get_order_lines(
        skip=0,
        limit=10000,  # エクスポート用に大きめの上限
        status=status,
        customer_code=customer_code,
        product_code=product_code,
        date_from=date_from,
        date_to=date_to,
        order_type=order_type,
    )

    # エクスポート用の行に変換
    export_data = [OrderLineExportRow(line) for line in lines]

    return ExportService.export_to_excel(export_data, "order_lines")
