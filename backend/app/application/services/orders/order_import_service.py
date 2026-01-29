# backend/app/application/services/orders/order_import_service.py
"""受注インポートサービス - 業務キーベースの受注インポート処理."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    Customer,
    OrderGroup,
    OrderLine,
    Product,
)
from app.infrastructure.persistence.repositories.order_group_repository import (
    OrderGroupRepository,
)
from app.infrastructure.persistence.repositories.order_repository import (
    OrderLineRepository,
)


@dataclass
class OrderLineInput:
    """受注明細のインポート入力データ."""

    customer_order_no: str  # 得意先6桁受注番号（業務キー）
    quantity: Decimal
    unit: str
    requested_date: date | None = None
    delivery_date: date | None = None
    customer_order_line_no: str | None = None


@dataclass
class OrderGroupImportResult:
    """受注グループインポート結果."""

    order_group: OrderGroup
    created_lines: list[OrderLine]
    skipped_lines: list[str]  # 既存だったためスキップされた行の customer_order_no
    errors: list[str]


class OrderImportService:
    """受注インポートサービス.

    業務キーを使用して受注グループと明細をインポートする。
    - 受注グループ: customer_code × product_code × order_date で upsert
    - 受注明細: order_group_id × customer_order_no で一意性チェック
    """

    def __init__(self, db: Session):
        self.db = db
        self.order_group_repo = OrderGroupRepository(db)
        self.order_line_repo = OrderLineRepository(db)

    def import_order_lines(
        self,
        customer_code: str,
        product_code: str,
        order_date: date,
        lines: list[OrderLineInput],
        order_id: int,  # 既存のOrderへの紐付け用
        delivery_place_id: int,
        source_file_name: str | None = None,
        skip_existing: bool = True,
    ) -> OrderGroupImportResult:
        """受注明細をインポート.

        Args:
            customer_code: 得意先コード（業務キー）
            product_code: 製品コード（業務キー：maker_part_code）
            order_date: 受注日（業務キーの一部）
            lines: インポートする受注明細リスト
            order_id: 既存の受注ヘッダID
            delivery_place_id: 納品先ID
            source_file_name: 取り込み元ファイル名
            skip_existing: 既存明細をスキップするか（Falseの場合はエラー）

        Returns:
            インポート結果
        """
        errors: list[str] = []
        created_lines: list[OrderLine] = []
        skipped_lines: list[str] = []

        # 1. 得意先・製品を業務キーで取得
        customer = self.db.query(Customer).filter(Customer.customer_code == customer_code).first()
        if not customer:
            return OrderGroupImportResult(
                order_group=None,  # type: ignore[arg-type]
                created_lines=[],
                skipped_lines=[],
                errors=[f"得意先が見つかりません: {customer_code}"],
            )

        product = self.db.query(Product).filter(Product.maker_part_no == product_code).first()
        if not product:
            return OrderGroupImportResult(
                order_group=None,  # type: ignore[arg-type]
                created_lines=[],
                skipped_lines=[],
                errors=[f"製品が見つかりません: {product_code}"],
            )

        # 2. 受注グループを業務キーでupsert
        order_group = self.order_group_repo.upsert_by_business_key(
            customer_id=customer.id,
            product_group_id=product.id,
            order_date=order_date,
            source_file_name=source_file_name,
        )

        # 3. 各明細をインポート
        for line in lines:
            existing = self.order_line_repo.find_by_customer_order_key(
                order_group_id=order_group.id,
                customer_order_no=line.customer_order_no,
            )

            if existing:
                if skip_existing:
                    skipped_lines.append(line.customer_order_no)
                else:
                    errors.append(f"既存の受注明細: {line.customer_order_no}")
                continue

            # 新規作成
            order_line = OrderLine(
                order_id=order_id,
                order_group_id=order_group.id,
                product_group_id=product.id,
                customer_order_no=line.customer_order_no,
                customer_order_line_no=line.customer_order_line_no,
                order_quantity=line.quantity,
                unit=line.unit,
                delivery_date=line.delivery_date or line.requested_date or order_date,
                delivery_place_id=delivery_place_id,
                status="pending",
            )
            self.db.add(order_line)
            created_lines.append(order_line)

        # NOTE: commitはservice層の呼び出し元で行う
        return OrderGroupImportResult(
            order_group=order_group,
            created_lines=created_lines,
            skipped_lines=skipped_lines,
            errors=errors,
        )

    def update_sap_registration(
        self,
        order_group_id: int,
        customer_order_no: str,
        sap_order_no: str,
        sap_order_item_no: str,
    ) -> OrderLine | None:
        """SAP登録後に業務キーを更新.

        Args:
            order_group_id: 受注グループID
            customer_order_no: 得意先6桁受注番号（業務キー）
            sap_order_no: SAP受注番号
            sap_order_item_no: SAP明細番号

        Returns:
            更新された受注明細（存在しない場合はNone）
        """
        order_line = self.order_line_repo.find_by_customer_order_key(
            order_group_id=order_group_id,
            customer_order_no=customer_order_no,
        )

        if order_line is None:
            return None

        self.order_line_repo.update_sap_order_key(
            order_line=order_line,
            sap_order_no=sap_order_no,
            sap_order_item_no=sap_order_item_no,
        )

        order_line.status = "sap_registered"
        # NOTE: commitはservice層の呼び出し元で行う

        return order_line

    def find_by_sap_key(
        self,
        sap_order_no: str,
        sap_order_item_no: str,
    ) -> OrderLine | None:
        """SAP側業務キーで受注明細を検索.

        Args:
            sap_order_no: SAP受注番号
            sap_order_item_no: SAP明細番号

        Returns:
            受注明細（存在しない場合はNone）
        """
        return self.order_line_repo.find_by_sap_order_key(
            sap_order_no=sap_order_no,
            sap_order_item_no=sap_order_item_no,
        )
