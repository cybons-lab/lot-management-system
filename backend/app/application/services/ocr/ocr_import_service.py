"""OCR取込サービス.

PADからのCSVデータを受け取り、OCR受注として保存し、
マスタから不足分を補完する。
"""

from datetime import date

from sqlalchemy.orm import Session

from app.application.services.ocr.ocr_sap_complement_service import (
    OcrSapComplementService,
)
from app.infrastructure.persistence.models.masters_models import Customer, DeliveryPlace
from app.infrastructure.persistence.models.orders_models import Order, OrderLine
from app.presentation.schemas.ocr_import_schema import (
    OcrImportLineRequest,
    OcrImportLineResult,
    OcrImportRequest,
    OcrImportResponse,
)


class OcrImportService:
    """OCR取込サービス.

    PADからのCSVデータを処理し、OCR受注を作成。
    マスタ検索で製品IDを解決（完全一致→前方一致）。
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db
        self.complement_service = OcrSapComplementService(db)

    def import_ocr_data(self, request: OcrImportRequest) -> OcrImportResponse:
        """OCRデータを取り込み、受注を作成.

        Args:
            request: OCR取込リクエスト

        Returns:
            OcrImportResponse: 取込結果
        """
        # 1. 得意先を解決
        customer = (
            self.db.query(Customer)
            .filter(
                Customer.customer_code == request.customer_code,
                Customer.get_active_filter(),
            )
            .first()
        )
        if not customer:
            raise ValueError(f"Customer not found: {request.customer_code}")

        # 2. 受注ヘッダを作成
        order = Order(
            customer_id=customer.id,
            order_date=date.today(),
            status="open",
            ocr_source_filename=request.source_filename,
        )
        self.db.add(order)
        self.db.flush()  # order.id を取得

        # 3. 明細行を処理
        line_results: list[OcrImportLineResult] = []
        resolved_count = 0
        unresolved_count = 0

        for row_no, line in enumerate(request.lines, start=1):
            result = self._process_line(order.id, customer.id, row_no, line)
            line_results.append(result)

            if result.status == "resolved":
                resolved_count += 1
            else:
                unresolved_count += 1

        self.db.commit()

        return OcrImportResponse(
            order_id=order.id,
            customer_code=request.customer_code,
            source_filename=request.source_filename,
            total_lines=len(request.lines),
            resolved_count=resolved_count,
            unresolved_count=unresolved_count,
            lines=line_results,
        )

    def _process_line(
        self,
        order_id: int,
        customer_id: int,
        row_no: int,
        line: OcrImportLineRequest,
    ) -> OcrImportLineResult:
        """明細行を処理."""
        # マスタ検索で製品IDを解決
        product_id, match_type, message = self.complement_service.resolve_product_id(
            customer_code="",  # customer_idで直接検索するため不要
            jiku_code=line.jiku_code,
            external_product_code=line.external_product_code,
        )

        # customer_idから直接検索するバージョン
        result = self.complement_service.find_complement(
            customer_code=self._get_customer_code(customer_id),
            jiku_code=line.jiku_code,
            external_product_code=line.external_product_code,
        )

        # 納入先を解決（次区コードから）
        delivery_place = self._resolve_delivery_place(customer_id, line.jiku_code)

        # 受注明細を作成
        order_line = OrderLine(
            order_id=order_id,
            product_id=result.product_id,  # NULLの場合もあり
            external_product_code=line.external_product_code,
            delivery_date=line.delivery_date,
            order_quantity=line.quantity,
            unit="KG",  # デフォルト単位（後でマスタから取得に変更可能）
            delivery_place_id=delivery_place.id if delivery_place else 1,  # 仮のデフォルト
            status="pending",
            order_type="ORDER",
        )
        self.db.add(order_line)

        # 結果を返す
        status = "resolved" if result.product_id else "unresolved"
        return OcrImportLineResult(
            row_no=row_no,
            external_product_code=line.external_product_code,
            product_id=result.product_id,
            match_type=result.match_type.value,
            status=status,
            message=result.message,
        )

    def _get_customer_code(self, customer_id: int) -> str:
        """customer_idから customer_codeを取得."""
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        return customer.customer_code if customer else ""

    def _resolve_delivery_place(self, customer_id: int, jiku_code: str) -> DeliveryPlace | None:
        """次区コードから納入先を解決."""
        return (
            self.db.query(DeliveryPlace)
            .filter(
                DeliveryPlace.customer_id == customer_id,
                DeliveryPlace.jiku_code == jiku_code,
                DeliveryPlace.get_active_filter(),
            )
            .first()
        )
