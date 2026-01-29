"""OCR取込サービス.

PADからのCSVデータを受け取り、OCR受注として保存し、
マスタから不足分を補完する。

【設計意図】OCR取込処理の設計判断:

1. なぜOCR受注を作成するのか
   背景: 自動車部品商社では、顧客からFAXやPDFで受注書が届く
   課題: 手入力では時間がかかり、ミスも発生
   解決策:
   - Power Automate Desktop（PAD）でOCR処理
   - CSV形式で受注データを抽出
   - このサービスで受注データベースに取り込む

2. flush() の使用（L65）
   理由: order.id を取得するため
   → Order作成後、すぐに明細行に order_id を関連付ける必要
   → flush() でDBにINSERTし、シーケンスからIDを取得
   → commit() は全明細処理後に実行（トランザクション境界）

3. resolved/unresolved の判定（L76-79）
   理由: OCRで読み取った製品コードがマスタに存在するか確認
   - resolved: 製品マスタで製品が特定できた → 自動引当可能
   - unresolved: 製品が特定できなかった → 手動補完が必要
   業務フロー:
   - resolved明細: そのまま引当処理へ
   - unresolved明細: 営業担当者が製品を手動で選択

4. OcrSapComplementService の初期化（L34）
   理由: 製品IDの解決ロジックを別サービスに分離
   役割:
   - 製品コードから製品IDを検索
   - 完全一致 → 前方一致の順で検索
   - SAP製品マスタとの連携も担当
   メリット: OCR取込ロジックと製品検索ロジックが分離 → 保守性向上

5. source_filename の記録（L62）
   理由: どのOCRファイルから取り込んだかをトレース
   用途:
   - 取込エラー時の原因調査（元のCSVファイルを確認）
   - 重複取込の防止（同じファイルを2回取り込まない）
   - 監査証跡（いつ、どのファイルから取り込んだか）
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
        # 【設計】get_active_filter()でソフトデリート済みの得意先を除外
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
        self.db.flush()  # 【設計】order.id を取得するためflush（commitは明細処理後）

        # 3. 明細行を処理
        line_results: list[OcrImportLineResult] = []
        resolved_count = 0
        unresolved_count = 0

        for row_no, line in enumerate(request.lines, start=1):
            result = self._process_line(order.id, customer.id, row_no, line)
            line_results.append(result)

            # 【設計】resolved/unresolvedカウントで、手動補完が必要な明細数を把握
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
        product_group_id, match_type, message = self.complement_service.resolve_product_group_id(
            customer_code="",  # customer_idで直接検索するため不要
            jiku_code=line.jiku_code,
            customer_part_no=line.customer_part_no,
        )

        # customer_idから直接検索するバージョン
        result = self.complement_service.find_complement(
            customer_code=self._get_customer_code(customer_id),
            jiku_code=line.jiku_code,
            customer_part_no=line.customer_part_no,
        )

        # 納入先を解決（次区コードから）
        delivery_place = self._resolve_delivery_place(customer_id, line.jiku_code)

        # 受注明細を作成
        order_line = OrderLine(
            order_id=order_id,
            product_group_id=result.product_group_id,  # NULLの場合もあり
            customer_part_no=line.customer_part_no,
            delivery_date=line.delivery_date,
            order_quantity=line.quantity,
            unit="KG",  # デフォルト単位（後でマスタから取得に変更可能）
            delivery_place_id=delivery_place.id if delivery_place else 1,  # 仮のデフォルト
            status="pending",
            order_type="ORDER",
        )
        self.db.add(order_line)

        # 結果を返す
        status = "resolved" if result.product_group_id else "unresolved"
        return OcrImportLineResult(
            row_no=row_no,
            customer_part_no=line.customer_part_no,
            product_group_id=result.product_group_id,
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
